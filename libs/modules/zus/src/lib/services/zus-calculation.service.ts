import { Injectable, Logger } from '@nestjs/common';

import {
  ClientEmployee,
  EmployeeContractType,
  HealthContributionRates,
  HealthContributionType,
  LumpSumHealthThresholds,
  ZusContributionRates,
  ZusContributionType,
  ZusDiscountType,
  ZusRateType,
} from '@accounting/common';

import { ZusRatesService } from './zus-rates.service';

/**
 * Result of social contributions calculation
 */
export interface SocialContributionsResult {
  retirementAmount: number; // Emerytalna
  disabilityAmount: number; // Rentowa
  sicknessAmount: number; // Chorobowa
  accidentAmount: number; // Wypadkowa
  laborFundAmount: number; // Fundusz Pracy
  totalSocialAmount: number;
  basis: number;
}

/**
 * Result of health contribution calculation
 */
export interface HealthContributionResult {
  healthAmount: number;
  basis: number;
}

/**
 * Complete ZUS calculation result
 */
export interface ZusCalculationResult {
  social: SocialContributionsResult;
  health: HealthContributionResult;
  totalAmount: number;
  discountType: ZusDiscountType;
}

/**
 * Employee contribution rates split between employer and employee
 */
export const EmployeeContributionRates = {
  /** Składka emerytalna - 9.76% pracownik + 9.76% pracodawca = 19.52% */
  RETIREMENT_EMPLOYEE: 0.0976,
  RETIREMENT_EMPLOYER: 0.0976,
  /** Składka rentowa - 1.5% pracownik + 6.5% pracodawca = 8% */
  DISABILITY_EMPLOYEE: 0.015,
  DISABILITY_EMPLOYER: 0.065,
  /** Składka chorobowa - 2.45% tylko pracownik */
  SICKNESS_EMPLOYEE: 0.0245,
  /** Składka wypadkowa - 1.67% tylko pracodawca */
  ACCIDENT_EMPLOYER: 0.0167,
  /** Fundusz Pracy - 2.45% tylko pracodawca */
  LABOR_FUND_EMPLOYER: 0.0245,
  /** Fundusz Gwarantowanych Świadczeń Pracowniczych - 0.1% tylko pracodawca */
  FGSP_EMPLOYER: 0.001,
  /** Składka zdrowotna - 9% od podstawy (brutto - składki społeczne pracownika) */
  HEALTH: 0.09,
};

/**
 * Result of employee contribution calculation
 * Includes both employer and employee portions
 */
export interface EmployeeContributionResult {
  // Employee portion (potrącane z wynagrodzenia)
  employeeRetirementAmount: number;
  employeeDisabilityAmount: number;
  employeeSicknessAmount: number;
  employeeHealthAmount: number;
  totalEmployeePortion: number;

  // Employer portion (dodatkowy koszt pracodawcy)
  employerRetirementAmount: number;
  employerDisabilityAmount: number;
  employerAccidentAmount: number;
  employerLaborFundAmount: number;
  employerFgspAmount: number;
  totalEmployerPortion: number;

  // Totals
  totalSocialAmount: number;
  totalAmount: number;

  // Basis
  grossSalary: number;
  socialBasis: number;
  healthBasis: number;

  // Metadata
  contractType: EmployeeContractType;
  isExempt: boolean;
  exemptReason?: string;
}

/**
 * Service for calculating ZUS contributions
 * Serwis do obliczania składek ZUS
 */
@Injectable()
export class ZusCalculationService {
  private readonly logger = new Logger(ZusCalculationService.name);

  constructor(private readonly zusRatesService: ZusRatesService) {}

  /**
   * Calculate complete ZUS contributions for a period
   *
   * @param discountType Type of ZUS discount
   * @param healthContributionType Method of health contribution calculation
   * @param month Period month
   * @param year Period year
   * @param sicknessOptIn Whether voluntary sickness insurance is opted in
   * @param accidentRate Custom accident rate (default 1.67%)
   * @param healthBasis Custom health basis (income) for health contribution
   * @param lumpSumAnnualRevenue Annual revenue for lump sum health calculation
   */
  async calculateContributions(
    discountType: ZusDiscountType,
    healthContributionType: HealthContributionType,
    month: number,
    year: number,
    sicknessOptIn: boolean = false,
    accidentRate: number = 0.0167,
    healthBasis?: number,
    lumpSumAnnualRevenue?: number
  ): Promise<ZusCalculationResult> {
    // Calculate social contributions
    const socialBasis = await this.getSocialBasis(discountType, month, year);
    const social = this.calculateSocialContributions(
      socialBasis,
      discountType,
      sicknessOptIn,
      accidentRate
    );

    // Calculate health contribution
    const health = await this.calculateHealthContribution(
      healthContributionType,
      month,
      year,
      healthBasis,
      lumpSumAnnualRevenue
    );

    return {
      social,
      health,
      totalAmount: social.totalSocialAmount + health.healthAmount,
      discountType,
    };
  }

  /**
   * Get social contribution basis based on discount type
   */
  async getSocialBasis(
    discountType: ZusDiscountType,
    month: number,
    year: number
  ): Promise<number> {
    switch (discountType) {
      case ZusDiscountType.STARTUP_RELIEF:
        // Ulga na start - no social contributions
        return 0;

      case ZusDiscountType.SMALL_ZUS:
        // Mały ZUS - 30% minimalnego wynagrodzenia
        return await this.zusRatesService.getRateForPeriod(
          ZusRateType.SMALL_ZUS_BASIS,
          month,
          year
        );

      case ZusDiscountType.SMALL_ZUS_PLUS:
        // Mały ZUS Plus - basis depends on previous year's income
        // For now, use the small ZUS basis as default
        // In a full implementation, this would calculate from actual income
        return await this.zusRatesService.getRateForPeriod(
          ZusRateType.SMALL_ZUS_BASIS,
          month,
          year
        );

      case ZusDiscountType.NONE:
      default:
        // Pełny ZUS - 60% prognozowanego przeciętnego wynagrodzenia
        return await this.zusRatesService.getRateForPeriod(ZusRateType.FULL_BASIS, month, year);
    }
  }

  /**
   * Calculate social insurance contributions
   */
  calculateSocialContributions(
    basis: number,
    discountType: ZusDiscountType,
    sicknessOptIn: boolean,
    accidentRate: number = 0.0167
  ): SocialContributionsResult {
    // Ulga na start - no social contributions
    if (discountType === ZusDiscountType.STARTUP_RELIEF || basis === 0) {
      return {
        retirementAmount: 0,
        disabilityAmount: 0,
        sicknessAmount: 0,
        accidentAmount: 0,
        laborFundAmount: 0,
        totalSocialAmount: 0,
        basis: 0,
      };
    }

    const retirementAmount = Math.round(
      basis * ZusContributionRates[ZusContributionType.RETIREMENT]
    );
    const disabilityAmount = Math.round(
      basis * ZusContributionRates[ZusContributionType.DISABILITY]
    );
    const sicknessAmount = sicknessOptIn
      ? Math.round(basis * ZusContributionRates[ZusContributionType.SICKNESS])
      : 0;
    const accidentAmount = Math.round(basis * accidentRate);
    const laborFundAmount = Math.round(
      basis * ZusContributionRates[ZusContributionType.LABOR_FUND]
    );

    const totalSocialAmount =
      retirementAmount + disabilityAmount + sicknessAmount + accidentAmount + laborFundAmount;

    return {
      retirementAmount,
      disabilityAmount,
      sicknessAmount,
      accidentAmount,
      laborFundAmount,
      totalSocialAmount,
      basis,
    };
  }

  /**
   * Calculate health insurance contribution
   */
  async calculateHealthContribution(
    healthContributionType: HealthContributionType,
    month: number,
    year: number,
    customBasis?: number,
    lumpSumAnnualRevenue?: number
  ): Promise<HealthContributionResult> {
    const minHealth = await this.zusRatesService.getRateForPeriod(
      ZusRateType.HEALTH_MIN,
      month,
      year
    );

    switch (healthContributionType) {
      case HealthContributionType.SCALE: {
        // Skala podatkowa - 9% od dochodu, min. 314.96 PLN
        const rate = HealthContributionRates[HealthContributionType.SCALE]!;
        const basis = customBasis ?? 0;
        const calculated = Math.round(basis * rate);
        return {
          healthAmount: Math.max(calculated, minHealth),
          basis,
        };
      }

      case HealthContributionType.LINEAR: {
        // Podatek liniowy - 4.9% od dochodu, min. 314.96 PLN
        const rate = HealthContributionRates[HealthContributionType.LINEAR]!;
        const basis = customBasis ?? 0;
        const calculated = Math.round(basis * rate);
        return {
          healthAmount: Math.max(calculated, minHealth),
          basis,
        };
      }

      case HealthContributionType.LUMP_SUM: {
        // Ryczałt - stałe kwoty zależne od progu przychodów
        const healthAmount = await this.getLumpSumHealthAmount(
          lumpSumAnnualRevenue ?? 0,
          month,
          year
        );
        return {
          healthAmount,
          basis: lumpSumAnnualRevenue ?? 0,
        };
      }

      case HealthContributionType.TAX_CARD:
      default: {
        // Karta podatkowa - stała kwota
        return {
          healthAmount: minHealth,
          basis: 0,
        };
      }
    }
  }

  /**
   * Get lump sum health contribution amount based on annual revenue
   */
  async getLumpSumHealthAmount(
    annualRevenue: number,
    month: number,
    year: number
  ): Promise<number> {
    // Get rates from database or use defaults
    const tier1 = await this.zusRatesService.getRateForPeriod(
      ZusRateType.LUMP_SUM_TIER_1,
      month,
      year
    );
    const tier2 = await this.zusRatesService.getRateForPeriod(
      ZusRateType.LUMP_SUM_TIER_2,
      month,
      year
    );
    const tier3 = await this.zusRatesService.getRateForPeriod(
      ZusRateType.LUMP_SUM_TIER_3,
      month,
      year
    );

    if (annualRevenue <= LumpSumHealthThresholds.TIER_1.maxRevenue) {
      return tier1;
    }

    if (annualRevenue <= LumpSumHealthThresholds.TIER_2.maxRevenue!) {
      return tier2;
    }

    return tier3;
  }

  /**
   * Calculate due date for ZUS payment
   *
   * @param month Period month
   * @param year Period year
   * @param paymentDay Day of payment (10, 15, or 20)
   */
  calculateDueDate(month: number, year: number, paymentDay: number): Date {
    // ZUS must be paid by 10th, 15th, or 20th of the FOLLOWING month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    return new Date(nextYear, nextMonth - 1, paymentDay);
  }

  /**
   * Format amount from grosze to PLN string
   */
  formatGroszeToPln(grosze: number): string {
    return (grosze / 100).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Calculate ZUS contributions for an employee based on contract type
   *
   * @param employee The client employee entity
   * @param grossSalary Gross salary in grosze (optional, uses employee.grossSalary if not provided)
   * @param accidentRate Custom accident rate (default 1.67%)
   */
  calculateEmployeeContribution(
    employee: ClientEmployee,
    grossSalary?: number,
    accidentRate: number = EmployeeContributionRates.ACCIDENT_EMPLOYER
  ): EmployeeContributionResult {
    const basis = grossSalary ?? employee.grossSalary ?? 0;

    // UMOWA_O_DZIELO - No ZUS contributions
    if (employee.contractType === EmployeeContractType.UMOWA_O_DZIELO) {
      return this.createExemptResult(
        basis,
        employee.contractType,
        'Umowa o dzieło - zwolnienie z ZUS'
      );
    }

    // UMOWA_ZLECENIE - Check for student exemption or other insurance
    if (employee.contractType === EmployeeContractType.UMOWA_ZLECENIE) {
      // Student under 26 - fully exempt
      if (employee.isStudent) {
        return this.createExemptResult(
          basis,
          employee.contractType,
          'Student poniżej 26 lat - zwolnienie z ZUS'
        );
      }

      // Has other insurance - only health contribution
      if (employee.hasOtherInsurance) {
        return this.calculateHealthOnlyContribution(basis, employee.contractType);
      }
    }

    // Full ZUS calculation for UMOWA_O_PRACE or UMOWA_ZLECENIE without exemptions
    return this.calculateFullEmployeeContribution(basis, employee.contractType, accidentRate);
  }

  /**
   * Create an exempt result (no contributions)
   */
  private createExemptResult(
    grossSalary: number,
    contractType: EmployeeContractType,
    exemptReason: string
  ): EmployeeContributionResult {
    return {
      employeeRetirementAmount: 0,
      employeeDisabilityAmount: 0,
      employeeSicknessAmount: 0,
      employeeHealthAmount: 0,
      totalEmployeePortion: 0,
      employerRetirementAmount: 0,
      employerDisabilityAmount: 0,
      employerAccidentAmount: 0,
      employerLaborFundAmount: 0,
      employerFgspAmount: 0,
      totalEmployerPortion: 0,
      totalSocialAmount: 0,
      totalAmount: 0,
      grossSalary,
      socialBasis: 0,
      healthBasis: 0,
      contractType,
      isExempt: true,
      exemptReason,
    };
  }

  /**
   * Calculate health-only contribution (for employees with other insurance)
   */
  private calculateHealthOnlyContribution(
    grossSalary: number,
    contractType: EmployeeContractType
  ): EmployeeContributionResult {
    // Health contribution is 9% of gross salary (no social contribution deduction)
    const healthAmount = Math.round(grossSalary * EmployeeContributionRates.HEALTH);

    return {
      employeeRetirementAmount: 0,
      employeeDisabilityAmount: 0,
      employeeSicknessAmount: 0,
      employeeHealthAmount: healthAmount,
      totalEmployeePortion: healthAmount,
      employerRetirementAmount: 0,
      employerDisabilityAmount: 0,
      employerAccidentAmount: 0,
      employerLaborFundAmount: 0,
      employerFgspAmount: 0,
      totalEmployerPortion: 0,
      totalSocialAmount: 0,
      totalAmount: healthAmount,
      grossSalary,
      socialBasis: 0,
      healthBasis: grossSalary,
      contractType,
      isExempt: false,
      exemptReason: 'Tylko składka zdrowotna - inne ubezpieczenie',
    };
  }

  /**
   * Calculate full employee contribution (employment contract or civil contract without exemptions)
   */
  private calculateFullEmployeeContribution(
    grossSalary: number,
    contractType: EmployeeContractType,
    accidentRate: number
  ): EmployeeContributionResult {
    // Employee portions
    const employeeRetirementAmount = Math.round(
      grossSalary * EmployeeContributionRates.RETIREMENT_EMPLOYEE
    );
    const employeeDisabilityAmount = Math.round(
      grossSalary * EmployeeContributionRates.DISABILITY_EMPLOYEE
    );
    const employeeSicknessAmount = Math.round(
      grossSalary * EmployeeContributionRates.SICKNESS_EMPLOYEE
    );

    const totalEmployeeSocial =
      employeeRetirementAmount + employeeDisabilityAmount + employeeSicknessAmount;

    // Health contribution basis = gross - employee social contributions
    const healthBasis = grossSalary - totalEmployeeSocial;
    const employeeHealthAmount = Math.round(healthBasis * EmployeeContributionRates.HEALTH);

    const totalEmployeePortion = totalEmployeeSocial + employeeHealthAmount;

    // Employer portions
    const employerRetirementAmount = Math.round(
      grossSalary * EmployeeContributionRates.RETIREMENT_EMPLOYER
    );
    const employerDisabilityAmount = Math.round(
      grossSalary * EmployeeContributionRates.DISABILITY_EMPLOYER
    );
    const employerAccidentAmount = Math.round(grossSalary * accidentRate);
    const employerLaborFundAmount = Math.round(
      grossSalary * EmployeeContributionRates.LABOR_FUND_EMPLOYER
    );
    const employerFgspAmount = Math.round(grossSalary * EmployeeContributionRates.FGSP_EMPLOYER);

    const totalEmployerPortion =
      employerRetirementAmount +
      employerDisabilityAmount +
      employerAccidentAmount +
      employerLaborFundAmount +
      employerFgspAmount;

    // Totals
    const totalSocialAmount = totalEmployeeSocial + totalEmployerPortion;
    const totalAmount = totalEmployeePortion + totalEmployerPortion;

    return {
      employeeRetirementAmount,
      employeeDisabilityAmount,
      employeeSicknessAmount,
      employeeHealthAmount,
      totalEmployeePortion,
      employerRetirementAmount,
      employerDisabilityAmount,
      employerAccidentAmount,
      employerLaborFundAmount,
      employerFgspAmount,
      totalEmployerPortion,
      totalSocialAmount,
      totalAmount,
      grossSalary,
      socialBasis: grossSalary,
      healthBasis,
      contractType,
      isExempt: false,
    };
  }
}
