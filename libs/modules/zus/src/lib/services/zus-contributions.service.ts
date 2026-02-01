import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import {
  Client,
  ClientEmployee,
  User,
  ZusContribution,
  ZusContributionStatus,
  ZusDiscountType,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import {
  BulkContributionResultDto,
  CalculateEmployeeContributionsDto,
  CalculateZusContributionDto,
  CreateZusContributionDto,
  GenerateMonthlyResultDto,
  PaginatedZusContributionsResponseDto,
  UpdateZusContributionDto,
  ZusContributionFiltersDto,
  ZusContributionResponseDto,
} from '../dto';
import {
  ZusContributionAlreadyExistsException,
  ZusContributionNotFoundException,
} from '../exceptions';
import { ZusCalculationService } from './zus-calculation.service';
import { ZusSettingsService } from './zus-settings.service';

/**
 * Service for managing ZUS contributions
 * Serwis zarządzający rozliczeniami ZUS
 */
@Injectable()
export class ZusContributionsService {
  private readonly logger = new Logger(ZusContributionsService.name);

  constructor(
    @InjectRepository(ZusContribution)
    private readonly contributionRepository: Repository<ZusContribution>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientEmployee)
    private readonly clientEmployeeRepository: Repository<ClientEmployee>,
    private readonly dataSource: DataSource,
    private readonly calculationService: ZusCalculationService,
    private readonly settingsService: ZusSettingsService,
    private readonly changeLogService: ChangeLogService,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Find all contributions with filters and pagination
   */
  async findAll(
    user: User,
    filters: ZusContributionFiltersDto
  ): Promise<PaginatedZusContributionsResponseDto> {
    const {
      clientId,
      periodMonth,
      periodYear,
      status,
      contributionType,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const queryBuilder = this.contributionRepository
      .createQueryBuilder('contribution')
      .leftJoinAndSelect('contribution.client', 'client')
      .leftJoinAndSelect('contribution.clientEmployee', 'clientEmployee')
      .leftJoinAndSelect('contribution.createdBy', 'createdBy')
      .leftJoinAndSelect('contribution.updatedBy', 'updatedBy')
      .where('contribution.companyId = :companyId', {
        companyId,
      });

    if (clientId) {
      queryBuilder.andWhere('contribution.clientId = :clientId', { clientId });
    }

    if (periodMonth) {
      queryBuilder.andWhere('contribution.periodMonth = :periodMonth', {
        periodMonth,
      });
    }

    if (periodYear) {
      queryBuilder.andWhere('contribution.periodYear = :periodYear', {
        periodYear,
      });
    }

    if (status) {
      queryBuilder.andWhere('contribution.status = :status', { status });
    }

    if (contributionType) {
      queryBuilder.andWhere('contribution.contributionType = :contributionType', {
        contributionType,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(client.name) ILIKE LOWER(:search) OR LOWER(clientEmployee.firstName) ILIKE LOWER(:search) OR LOWER(clientEmployee.lastName) ILIKE LOWER(:search))',
        {
          search: `%${search}%`,
        }
      );
    }

    const total = await queryBuilder.getCount();

    const contributions = await queryBuilder
      .orderBy('contribution.periodYear', 'DESC')
      .addOrderBy('contribution.periodMonth', 'DESC')
      .addOrderBy('contribution.contributionType', 'ASC')
      .addOrderBy('client.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: contributions.map((c) => ZusContributionResponseDto.fromEntity(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find contribution by ID
   */
  async findOne(id: string, user: User): Promise<ZusContributionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const contribution = await this.contributionRepository.findOne({
      where: {
        id,
        companyId,
      },
      relations: ['client', 'clientEmployee', 'createdBy', 'updatedBy'],
    });

    if (!contribution) {
      throw new ZusContributionNotFoundException(id);
    }

    return ZusContributionResponseDto.fromEntity(contribution);
  }

  /**
   * Get contributions by client
   */
  async findByClient(clientId: string, user: User): Promise<ZusContributionResponseDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const contributions = await this.contributionRepository.find({
      where: {
        clientId,
        companyId,
      },
      relations: ['client', 'clientEmployee', 'createdBy'],
      order: {
        periodYear: 'DESC',
        periodMonth: 'DESC',
      },
    });

    return contributions.map((c) => ZusContributionResponseDto.fromEntity(c));
  }

  /**
   * Create a new contribution (manual entry)
   */
  async create(dto: CreateZusContributionDto, user: User): Promise<ZusContributionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists
    const client = await this.clientRepository.findOne({
      where: {
        id: dto.clientId,
        companyId,
        isActive: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Klient o ID ${dto.clientId} nie istnieje`);
    }

    // Check if contribution already exists for this period
    const existing = await this.contributionRepository.findOne({
      where: {
        clientId: dto.clientId,
        companyId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
      },
    });

    if (existing) {
      throw new ZusContributionAlreadyExistsException(
        dto.clientId,
        dto.periodMonth,
        dto.periodYear
      );
    }

    // Calculate contributions
    return this.calculateAndCreate(
      {
        clientId: dto.clientId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
      },
      user,
      dto.notes
    );
  }

  /**
   * Calculate ZUS contributions for a client
   */
  async calculate(
    dto: CalculateZusContributionDto,
    user: User
  ): Promise<ZusContributionResponseDto> {
    return this.calculateAndCreate(dto, user);
  }

  /**
   * Internal method to calculate and create contribution
   */
  private async calculateAndCreate(
    dto: CalculateZusContributionDto,
    user: User,
    notes?: string
  ): Promise<ZusContributionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get client settings
    const settings = await this.settingsService.getClientSettingsEntity(dto.clientId, companyId);

    if (!settings) {
      throw new NotFoundException(
        `Brak ustawień ZUS dla klienta ${dto.clientId}. Najpierw skonfiguruj ustawienia ZUS.`
      );
    }

    // Calculate contributions
    const result = await this.calculationService.calculateContributions(
      settings.discountType,
      settings.healthContributionType,
      dto.periodMonth,
      dto.periodYear,
      settings.sicknessInsuranceOptIn,
      Number(settings.accidentRate),
      dto.healthBasis
    );

    // Calculate due date
    const dueDate = this.calculationService.calculateDueDate(
      dto.periodMonth,
      dto.periodYear,
      settings.paymentDay
    );

    // Check if contribution already exists - block duplicates
    const existing = await this.contributionRepository.findOne({
      where: {
        clientId: dto.clientId,
        companyId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
      },
    });

    if (existing) {
      throw new ZusContributionAlreadyExistsException(
        dto.clientId,
        dto.periodMonth,
        dto.periodYear
      );
    }

    // Create new contribution
    const contribution = this.contributionRepository.create({
      clientId: dto.clientId,
      companyId,
      periodMonth: dto.periodMonth,
      periodYear: dto.periodYear,
      status: ZusContributionStatus.CALCULATED,
      dueDate,
      retirementAmount: result.social.retirementAmount,
      disabilityAmount: result.social.disabilityAmount,
      sicknessAmount: result.social.sicknessAmount,
      accidentAmount: result.social.accidentAmount,
      laborFundAmount: result.social.laborFundAmount,
      healthAmount: result.health.healthAmount,
      totalSocialAmount: result.social.totalSocialAmount,
      totalAmount: result.totalAmount,
      socialBasis: result.social.basis,
      healthBasis: result.health.basis,
      discountType: result.discountType,
      sicknessOptedIn: settings.sicknessInsuranceOptIn,
      notes,
      createdById: user.id,
    });

    const saved = await this.contributionRepository.save(contribution);

    // Log change
    await this.changeLogService.logCreate(
      'ZusContribution',
      saved.id,
      {
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        totalAmount: result.totalAmount,
      },
      user
    );

    // Reload with relations
    const reloaded = await this.contributionRepository.findOne({
      where: { id: saved.id },
      relations: ['client', 'createdBy', 'updatedBy'],
    });

    return ZusContributionResponseDto.fromEntity(reloaded!);
  }

  /**
   * Generate monthly contributions for all clients with ZUS settings
   */
  async generateMonthly(
    month: number,
    year: number,
    user: User
  ): Promise<GenerateMonthlyResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const clientsWithSettings = await this.settingsService.getClientsWithSettings(user);

    let generated = 0;
    let skipped = 0;
    let noSettings = 0;

    for (const settings of clientsWithSettings) {
      // Check if contribution already exists
      const existing = await this.contributionRepository.findOne({
        where: {
          clientId: settings.clientId,
          companyId,
          periodMonth: month,
          periodYear: year,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      try {
        await this.calculateAndCreate(
          {
            clientId: settings.clientId,
            periodMonth: month,
            periodYear: year,
          },
          user
        );
        generated++;
      } catch (error) {
        this.logger.warn(
          `Failed to generate contribution for client ${settings.clientId}: ${error}`
        );
        noSettings++;
      }
    }

    this.logger.log(
      `Generated ${generated} contributions for ${month}/${year}, skipped ${skipped}, failed ${noSettings}`
    );

    return { generated, skipped, noSettings };
  }

  /**
   * Update contribution
   */
  async update(
    id: string,
    dto: UpdateZusContributionDto,
    user: User
  ): Promise<ZusContributionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const contribution = await this.contributionRepository.findOne({
      where: { id, companyId },
      relations: ['client'],
    });

    if (!contribution) {
      throw new ZusContributionNotFoundException(id);
    }

    const oldData = { status: contribution.status, notes: contribution.notes };

    if (dto.status) {
      contribution.status = dto.status;
    }
    if (dto.notes !== undefined) {
      contribution.notes = dto.notes;
    }
    contribution.updatedById = user.id;

    const saved = await this.contributionRepository.save(contribution);

    await this.changeLogService.logUpdate(
      'ZusContribution',
      saved.id,
      oldData,
      dto as Record<string, unknown>,
      user
    );

    const reloaded = await this.contributionRepository.findOne({
      where: { id: saved.id },
      relations: ['client', 'createdBy', 'updatedBy'],
    });

    return ZusContributionResponseDto.fromEntity(reloaded!);
  }

  /**
   * Mark contribution as paid
   */
  async markAsPaid(id: string, paidDate: Date, user: User): Promise<ZusContributionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const contribution = await this.contributionRepository.findOne({
      where: { id, companyId },
    });

    if (!contribution) {
      throw new ZusContributionNotFoundException(id);
    }

    const oldData = { status: contribution.status, paidDate: contribution.paidDate };

    contribution.status = ZusContributionStatus.PAID;
    contribution.paidDate = paidDate;
    contribution.updatedById = user.id;

    const saved = await this.contributionRepository.save(contribution);

    await this.changeLogService.logUpdate(
      'ZusContribution',
      saved.id,
      oldData,
      { status: ZusContributionStatus.PAID, paidDate },
      user
    );

    const reloaded = await this.contributionRepository.findOne({
      where: { id: saved.id },
      relations: ['client', 'createdBy', 'updatedBy'],
    });

    return ZusContributionResponseDto.fromEntity(reloaded!);
  }

  /**
   * Delete contribution
   */
  async remove(id: string, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const contribution = await this.contributionRepository.findOne({
      where: { id, companyId },
    });

    if (!contribution) {
      throw new ZusContributionNotFoundException(id);
    }

    const deleteData = {
      id: contribution.id,
      clientId: contribution.clientId,
      periodMonth: contribution.periodMonth,
      periodYear: contribution.periodYear,
    };

    await this.contributionRepository.remove(contribution);

    await this.changeLogService.logDelete('ZusContribution', id, deleteData, user);

    this.logger.log(`ZUS contribution ${id} deleted`);
  }

  /**
   * Update overdue status for contributions past due date
   */
  async updateOverdueStatus(): Promise<number> {
    const result = await this.contributionRepository
      .createQueryBuilder()
      .update(ZusContribution)
      .set({ status: ZusContributionStatus.OVERDUE })
      .where('status IN (:...statuses)', {
        statuses: [ZusContributionStatus.DRAFT, ZusContributionStatus.CALCULATED],
      })
      .andWhere('dueDate < :now', { now: new Date() })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} contributions as overdue`);
    }

    return result.affected ?? 0;
  }

  /**
   * Calculate ZUS contributions for multiple employees of a client
   */
  async calculateEmployeeContributions(
    dto: CalculateEmployeeContributionsDto,
    user: User
  ): Promise<BulkContributionResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists
    const client = await this.clientRepository.findOne({
      where: {
        id: dto.clientId,
        companyId,
        isActive: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Klient o ID ${dto.clientId} nie istnieje`);
    }

    // Get client settings for accident rate and payment day
    const settings = await this.settingsService.getClientSettingsEntity(dto.clientId, companyId);
    const accidentRate = settings ? Number(settings.accidentRate) : 0.0167;
    const paymentDay = settings?.paymentDay ?? 15;

    // Calculate due date
    const dueDate = this.calculationService.calculateDueDate(
      dto.periodMonth,
      dto.periodYear,
      paymentDay
    );

    const result: BulkContributionResultDto = {
      created: 0,
      skipped: 0,
      exempt: 0,
      errors: 0,
      contributionIds: [],
      errorMessages: [],
    };

    // Process each employee
    for (const employeeId of dto.employeeIds) {
      try {
        // Get employee
        const employee = await this.clientEmployeeRepository.findOne({
          where: {
            id: employeeId,
            clientId: dto.clientId,
            companyId,
            isActive: true,
          },
        });

        if (!employee) {
          result.errors++;
          result.errorMessages.push(
            `Pracownik o ID ${employeeId} nie istnieje lub jest nieaktywny`
          );
          continue;
        }

        // Check if contribution already exists for this employee and period
        const existing = await this.contributionRepository.findOne({
          where: {
            clientId: dto.clientId,
            clientEmployeeId: employeeId,
            companyId,
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
          },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Calculate employee contribution
        const calculation = this.calculationService.calculateEmployeeContribution(
          employee,
          employee.grossSalary ?? 0,
          accidentRate
        );

        // Skip exempt employees (e.g., UMOWA_O_DZIELO, students)
        if (calculation.isExempt) {
          result.exempt++;
          continue;
        }

        // Create contribution record
        const contribution = this.contributionRepository.create({
          clientId: dto.clientId,
          clientEmployeeId: employeeId,
          companyId,
          contributionType: 'EMPLOYEE',
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
          status: ZusContributionStatus.CALCULATED,
          dueDate,
          // Store total amounts (employer + employee portions combined for ZUS payment)
          retirementAmount:
            calculation.employeeRetirementAmount + calculation.employerRetirementAmount,
          disabilityAmount:
            calculation.employeeDisabilityAmount + calculation.employerDisabilityAmount,
          sicknessAmount: calculation.employeeSicknessAmount,
          accidentAmount: calculation.employerAccidentAmount,
          laborFundAmount: calculation.employerLaborFundAmount + calculation.employerFgspAmount,
          healthAmount: calculation.employeeHealthAmount,
          totalSocialAmount: calculation.totalSocialAmount,
          totalAmount: calculation.totalAmount,
          socialBasis: calculation.socialBasis,
          healthBasis: calculation.healthBasis,
          discountType: ZusDiscountType.NONE, // Employees don't have discounts
          sicknessOptedIn: true, // Always included for employees
          notes: calculation.exemptReason,
          createdById: user.id,
        });

        const saved = await this.contributionRepository.save(contribution);

        // Log change
        await this.changeLogService.logCreate(
          'ZusContribution',
          saved.id,
          {
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            totalAmount: calculation.totalAmount,
            contributionType: 'EMPLOYEE',
            employeeId,
          },
          user
        );

        result.created++;
        result.contributionIds.push(saved.id);
      } catch (error) {
        result.errors++;
        result.errorMessages.push(
          `Błąd dla pracownika ${employeeId}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
        );
        this.logger.error(`Error calculating contribution for employee ${employeeId}:`, error);
      }
    }

    this.logger.log(
      `Employee contributions for ${dto.periodMonth}/${dto.periodYear}: created=${result.created}, skipped=${result.skipped}, exempt=${result.exempt}, errors=${result.errors}`
    );

    return result;
  }
}
