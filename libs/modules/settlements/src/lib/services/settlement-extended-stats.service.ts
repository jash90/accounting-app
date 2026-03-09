import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  calcRankedDurationStats,
  mapRawToRankings,
  MonthlySettlement,
  SettlementStatus,
  User,
} from '@accounting/common';
import { applyDateRangeFilter, TenantService } from '@accounting/common/backend';

import {
  BlockedClientsStatsDto,
  SettlementCompletionDurationStatsDto,
  SettlementEmployeeRankingDto,
  SettlementStatsPeriodFilterDto,
} from '../dto/settlement-extended-stats.dto';

@Injectable()
export class SettlementExtendedStatsService {
  constructor(
    @InjectRepository(MonthlySettlement)
    private readonly settlementRepository: Repository<MonthlySettlement>,
    private readonly tenantService: TenantService
  ) {}

  async getCompletionDurationStats(
    user: User,
    filters?: SettlementStatsPeriodFilterDto
  ): Promise<SettlementCompletionDurationStatsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const qb = this.settlementRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.client', 'client')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.status = :status', { status: SettlementStatus.COMPLETED })
      .andWhere('s.settledAt IS NOT NULL');

    applyDateRangeFilter(qb, 's', 'settledAt', filters);

    const settlements = await qb.getMany();

    const withDuration = settlements.map((s) => ({
      id: s.id,
      clientName: s.client?.name ?? 'Unknown',
      month: s.month,
      year: s.year,
      durationDays: Math.round(
        ((s.settledAt?.getTime() ?? Date.now()) - s.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
      completedAt: s.settledAt?.toISOString(),
    }));

    const { longest, shortest, averageDuration } = calcRankedDurationStats(
      withDuration,
      (s) => s.durationDays,
      1
    );

    return { longest, shortest, averageDurationDays: averageDuration };
  }

  async getEmployeeCompletionRanking(
    user: User,
    filters?: SettlementStatsPeriodFilterDto
  ): Promise<SettlementEmployeeRankingDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const qb = this.settlementRepository
      .createQueryBuilder('s')
      .select('s.userId', 'userId')
      .addSelect('COUNT(*)', 'completedCount')
      .leftJoin('s.assignedUser', 'user')
      .addSelect('user.email', 'email')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.status = :status', { status: SettlementStatus.COMPLETED })
      .andWhere('s.userId IS NOT NULL')
      .groupBy('s.userId')
      .addGroupBy('user.id')
      .addGroupBy('user.email')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('COUNT(*)', 'DESC');

    applyDateRangeFilter(qb, 's', 'settledAt', filters);

    const raw = await qb.getRawMany<{
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      completedCount: string;
    }>();

    return { rankings: mapRawToRankings(raw) };
  }

  async getBlockedClientsStats(
    user: User,
    filters?: SettlementStatsPeriodFilterDto
  ): Promise<BlockedClientsStatsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Count settlements per client where status is one of the blocked statuses
    const qb = this.settlementRepository
      .createQueryBuilder('s')
      .select('s.clientId', 'clientId')
      .addSelect('COUNT(*)', 'blockCount')
      .leftJoin('s.client', 'client')
      .addSelect('client.name', 'clientName')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.status IN (:...blockedStatuses)', {
        blockedStatuses: [
          SettlementStatus.MISSING_INVOICE,
          SettlementStatus.MISSING_INVOICE_VERIFICATION,
        ],
      })
      .groupBy('s.clientId')
      .addGroupBy('client.id')
      .addGroupBy('client.name')
      .orderBy('COUNT(*)', 'DESC');

    applyDateRangeFilter(qb, 's', 'createdAt', filters);

    const raw = await qb.getRawMany<{
      clientId: string;
      clientName: string;
      blockCount: string;
    }>();

    return {
      clients: raw.map((r) => ({
        clientId: r.clientId,
        clientName: r.clientName,
        blockCount: parseInt(r.blockCount, 10),
      })),
    };
  }
}
