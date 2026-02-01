import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  User,
  ZusClientSettings,
  ZusContribution,
  ZusContributionStatus,
  ZusDiscountType,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  ZusMonthlyComparisonDto,
  ZusStatisticsDto,
  ZusTopClientDto,
  ZusTotalsDto,
  ZusUpcomingPaymentDto,
} from '../dto';

/**
 * Polish month names
 */
const MONTH_NAMES_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

/**
 * Service for ZUS statistics and reporting
 * Serwis statystyk i raportów ZUS
 */
@Injectable()
export class ZusStatisticsService {
  private readonly logger = new Logger(ZusStatisticsService.name);

  constructor(
    @InjectRepository(ZusContribution)
    private readonly contributionRepository: Repository<ZusContribution>,
    @InjectRepository(ZusClientSettings)
    private readonly settingsRepository: Repository<ZusClientSettings>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStatistics(user: User): Promise<ZusStatisticsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get contribution counts and sums
    const stats = await this.contributionRepository
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.totalAmount)', 'totalAmount')
      .where('c.companyId = :companyId', { companyId })
      .groupBy('c.status')
      .getRawMany();

    // Get discount type breakdown
    const discountStats = await this.contributionRepository
      .createQueryBuilder('c')
      .select('c.discountType', 'discountType')
      .addSelect('COUNT(*)', 'count')
      .where('c.companyId = :companyId', { companyId })
      .groupBy('c.discountType')
      .getRawMany();

    // Get client count with settings
    const clientsWithSettings = await this.settingsRepository.count({
      where: { companyId, isActive: true },
    });

    // Build statistics
    const byStatus: Record<ZusContributionStatus, number> = {
      [ZusContributionStatus.DRAFT]: 0,
      [ZusContributionStatus.CALCULATED]: 0,
      [ZusContributionStatus.PAID]: 0,
      [ZusContributionStatus.OVERDUE]: 0,
    };

    const byDiscountType: Record<ZusDiscountType, number> = {
      [ZusDiscountType.NONE]: 0,
      [ZusDiscountType.STARTUP_RELIEF]: 0,
      [ZusDiscountType.SMALL_ZUS]: 0,
      [ZusDiscountType.SMALL_ZUS_PLUS]: 0,
    };

    let totalContributions = 0;
    let paidContributions = 0;
    let overdueContributions = 0;
    let pendingContributions = 0;
    let totalPaidAmount = 0;
    let totalPendingAmount = 0;
    let totalOverdueAmount = 0;

    for (const stat of stats) {
      const count = parseInt(stat.count, 10);
      const amount = parseInt(stat.totalAmount || '0', 10);

      byStatus[stat.status as ZusContributionStatus] = count;
      totalContributions += count;

      switch (stat.status) {
        case ZusContributionStatus.PAID:
          paidContributions = count;
          totalPaidAmount = amount;
          break;
        case ZusContributionStatus.OVERDUE:
          overdueContributions = count;
          totalOverdueAmount = amount;
          break;
        case ZusContributionStatus.DRAFT:
        case ZusContributionStatus.CALCULATED:
          pendingContributions += count;
          totalPendingAmount += amount;
          break;
      }
    }

    for (const stat of discountStats) {
      byDiscountType[stat.discountType as ZusDiscountType] = parseInt(stat.count, 10);
    }

    return {
      totalContributions,
      paidContributions,
      overdueContributions,
      pendingContributions,
      totalPaidAmount,
      totalPendingAmount,
      totalOverdueAmount,
      totalPaidAmountPln: formatGroszeToPln(totalPaidAmount),
      totalPendingAmountPln: formatGroszeToPln(totalPendingAmount),
      totalOverdueAmountPln: formatGroszeToPln(totalOverdueAmount),
      clientsWithSettings,
      byDiscountType,
      byStatus,
    };
  }

  /**
   * Get upcoming payments
   */
  async getUpcomingPayments(user: User, days: number = 30): Promise<ZusUpcomingPaymentDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const contributions = await this.contributionRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.status IN (:...statuses)', {
        statuses: [
          ZusContributionStatus.DRAFT,
          ZusContributionStatus.CALCULATED,
          ZusContributionStatus.OVERDUE,
        ],
      })
      .andWhere('c.dueDate <= :futureDate', { futureDate })
      .orderBy('c.dueDate', 'ASC')
      .limit(50)
      .getMany();

    return contributions.map((c) => {
      const dueDate = new Date(c.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: c.id,
        clientId: c.clientId,
        clientName: c.client?.name ?? 'Nieznany klient',
        periodMonth: c.periodMonth,
        periodYear: c.periodYear,
        dueDate: c.dueDate.toISOString?.() ?? String(c.dueDate),
        totalAmount: c.totalAmount,
        totalAmountPln: formatGroszeToPln(c.totalAmount),
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      };
    });
  }

  /**
   * Get monthly comparison data
   */
  async getMonthlyComparison(user: User, months: number = 6): Promise<ZusMonthlyComparisonDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const now = new Date();
    const results: ZusMonthlyComparisonDto[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const stats = await this.contributionRepository
        .createQueryBuilder('c')
        .select('SUM(c.totalSocialAmount)', 'totalSocial')
        .addSelect('SUM(c.healthAmount)', 'totalHealth')
        .addSelect('SUM(c.totalAmount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('c.periodMonth = :month', { month })
        .andWhere('c.periodYear = :year', { year })
        .getRawOne();

      const totalSocialAmount = parseInt(stats?.totalSocial || '0', 10);
      const totalHealthAmount = parseInt(stats?.totalHealth || '0', 10);
      const totalAmount = parseInt(stats?.total || '0', 10);
      const contributionsCount = parseInt(stats?.count || '0', 10);

      results.push({
        month,
        year,
        periodLabel: `${MONTH_NAMES_PL[month - 1]} ${year}`,
        totalSocialAmount,
        totalHealthAmount,
        totalAmount,
        totalSocialAmountPln: formatGroszeToPln(totalSocialAmount),
        totalHealthAmountPln: formatGroszeToPln(totalHealthAmount),
        totalAmountPln: formatGroszeToPln(totalAmount),
        contributionsCount,
      });
    }

    return results;
  }

  /**
   * Get top clients by total contributions amount
   */
  async getTopClientsByContributions(user: User, limit: number = 10): Promise<ZusTopClientDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const results = await this.contributionRepository
      .createQueryBuilder('c')
      .select('c.clientId', 'clientId')
      .addSelect('client.name', 'clientName')
      .addSelect('SUM(c.totalAmount)', 'totalAmount')
      .addSelect('COUNT(*)', 'contributionsCount')
      .leftJoin('c.client', 'client')
      .where('c.companyId = :companyId', { companyId })
      .groupBy('c.clientId')
      .addGroupBy('client.name')
      .orderBy('SUM(c.totalAmount)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName ?? 'Nieznany klient',
      totalAmount: parseInt(r.totalAmount || '0', 10),
      totalAmountPln: formatGroszeToPln(parseInt(r.totalAmount || '0', 10)),
      contributionsCount: parseInt(r.contributionsCount || '0', 10),
    }));
  }

  /**
   * Get totals for current month
   */
  async getCurrentMonthTotals(user: User): Promise<ZusTotalsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const stats = await this.contributionRepository
      .createQueryBuilder('c')
      .select('SUM(c.totalSocialAmount)', 'totalSocial')
      .addSelect('SUM(c.healthAmount)', 'totalHealth')
      .addSelect('SUM(c.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.periodMonth = :month', { month })
      .andWhere('c.periodYear = :year', { year })
      .getRawOne();

    const totalSocialAmount = parseInt(stats?.totalSocial || '0', 10);
    const totalHealthAmount = parseInt(stats?.totalHealth || '0', 10);
    const totalAmount = parseInt(stats?.total || '0', 10);
    const contributionsCount = parseInt(stats?.count || '0', 10);

    return {
      totalAmount,
      totalAmountPln: formatGroszeToPln(totalAmount),
      totalSocialAmount,
      totalSocialAmountPln: formatGroszeToPln(totalSocialAmount),
      totalHealthAmount,
      totalHealthAmountPln: formatGroszeToPln(totalHealthAmount),
      contributionsCount,
    };
  }

  /**
   * Get totals for current year
   */
  async getCurrentYearTotals(user: User): Promise<ZusTotalsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const year = new Date().getFullYear();

    const stats = await this.contributionRepository
      .createQueryBuilder('c')
      .select('SUM(c.totalSocialAmount)', 'totalSocial')
      .addSelect('SUM(c.healthAmount)', 'totalHealth')
      .addSelect('SUM(c.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.periodYear = :year', { year })
      .getRawOne();

    const totalSocialAmount = parseInt(stats?.totalSocial || '0', 10);
    const totalHealthAmount = parseInt(stats?.totalHealth || '0', 10);
    const totalAmount = parseInt(stats?.total || '0', 10);
    const contributionsCount = parseInt(stats?.count || '0', 10);

    return {
      totalAmount,
      totalAmountPln: formatGroszeToPln(totalAmount),
      totalSocialAmount,
      totalSocialAmountPln: formatGroszeToPln(totalSocialAmount),
      totalHealthAmount,
      totalHealthAmountPln: formatGroszeToPln(totalHealthAmount),
      contributionsCount,
    };
  }
}

/**
 * Helper function to format grosze to PLN string
 */
function formatGroszeToPln(grosze: number): string {
  return (grosze / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
