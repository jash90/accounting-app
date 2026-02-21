import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  ChangeLog,
  Client,
  EmploymentType,
  TaxScheme,
  User,
  VatStatus,
  ZusStatus,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  ClientStatisticsDto,
  ClientStatisticsWithRecentDto,
  RecentActivityDto,
  RecentClientDto,
} from '../dto/statistics.dto';

@Injectable()
export class ClientStatisticsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ChangeLog)
    private readonly changeLogRepository: Repository<ChangeLog>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Get comprehensive statistics about clients for a company.
   */
  async getStatistics(user: User): Promise<ClientStatisticsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get basic counts
    const [total, active, inactive] = await Promise.all([
      this.clientRepository.count({ where: { companyId } }),
      this.clientRepository.count({ where: { companyId, isActive: true } }),
      this.clientRepository.count({ where: { companyId, isActive: false } }),
    ]);

    // Get counts by employment type
    const employmentTypeCounts = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.employmentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('client.companyId = :companyId', { companyId })
      .andWhere('client.isActive = true')
      .andWhere('client.employmentType IS NOT NULL')
      .groupBy('client.employmentType')
      .getRawMany();

    // Get counts by VAT status
    const vatStatusCounts = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.vatStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('client.companyId = :companyId', { companyId })
      .andWhere('client.isActive = true')
      .andWhere('client.vatStatus IS NOT NULL')
      .groupBy('client.vatStatus')
      .getRawMany();

    // Get counts by tax scheme
    const taxSchemeCounts = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.taxScheme', 'scheme')
      .addSelect('COUNT(*)', 'count')
      .where('client.companyId = :companyId', { companyId })
      .andWhere('client.isActive = true')
      .andWhere('client.taxScheme IS NOT NULL')
      .groupBy('client.taxScheme')
      .getRawMany();

    // Get counts by ZUS status
    const zusStatusCounts = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.zusStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('client.companyId = :companyId', { companyId })
      .andWhere('client.isActive = true')
      .andWhere('client.zusStatus IS NOT NULL')
      .groupBy('client.zusStatus')
      .getRawMany();

    // Get clients added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const addedThisMonth = await this.clientRepository.count({
      where: {
        companyId,
        createdAt: MoreThanOrEqual(startOfMonth),
      },
    });

    // Get clients added in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const addedLast30Days = await this.clientRepository.count({
      where: {
        companyId,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    // Build response with initialized counters
    const byEmploymentType = this.initializeEnumCounts<EmploymentType>(EmploymentType);
    const byVatStatus = this.initializeEnumCounts<VatStatus>(VatStatus);
    const byTaxScheme = this.initializeEnumCounts<TaxScheme>(TaxScheme);
    const byZusStatus = this.initializeEnumCounts<ZusStatus>(ZusStatus);

    // Fill in actual counts
    for (const row of employmentTypeCounts) {
      if (row.type) byEmploymentType[row.type as EmploymentType] = parseInt(row.count, 10);
    }
    for (const row of vatStatusCounts) {
      if (row.status) byVatStatus[row.status as VatStatus] = parseInt(row.count, 10);
    }
    for (const row of taxSchemeCounts) {
      if (row.scheme) byTaxScheme[row.scheme as TaxScheme] = parseInt(row.count, 10);
    }
    for (const row of zusStatusCounts) {
      if (row.status) byZusStatus[row.status as ZusStatus] = parseInt(row.count, 10);
    }

    return {
      total,
      active,
      inactive,
      byEmploymentType,
      byVatStatus,
      byTaxScheme,
      byZusStatus,
      addedThisMonth,
      addedLast30Days,
    };
  }

  /**
   * Get statistics with recent clients and activity.
   */
  async getStatisticsWithRecent(user: User): Promise<ClientStatisticsWithRecentDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get base statistics
    const baseStats = await this.getStatistics(user);

    // Get recently added clients (last 10)
    const recentClients = await this.clientRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'name', 'nip', 'email', 'employmentType', 'createdAt'],
    });

    const recentlyAdded: RecentClientDto[] = recentClients.map((client) => ({
      id: client.id,
      name: client.name,
      nip: client.nip,
      email: client.email,
      employmentType: client.employmentType,
      createdAt: client.createdAt,
    }));

    // Get recent activity (last 20 changelog entries for clients)
    const recentLogs = await this.changeLogRepository.find({
      where: {
        companyId,
        entityType: 'Client',
      },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    // Get client names for the changelog entries
    const clientIds = [...new Set(recentLogs.map((log) => log.entityId))];
    const clients =
      clientIds.length > 0
        ? await this.clientRepository.find({
            where: clientIds.map((id) => ({ id, companyId })),
            select: ['id', 'name'],
          })
        : [];
    const clientNameMap = new Map(clients.map((c) => [c.id, c.name]));

    const recentActivity: RecentActivityDto[] = recentLogs.map((log) => ({
      id: log.id,
      entityId: log.entityId,
      action: log.action,
      entityName: clientNameMap.get(log.entityId) || 'Nieznany klient',
      changedByName: log.changedBy
        ? `${log.changedBy.firstName ?? ''} ${log.changedBy.lastName ?? ''}`.trim() ||
          log.changedBy.email
        : undefined,
      createdAt: log.createdAt,
    }));

    return {
      ...baseStats,
      recentlyAdded,
      recentActivity,
    };
  }

  private initializeEnumCounts<T extends string>(enumObj: Record<string, T>): Record<T, number> {
    const counts = {} as Record<T, number>;
    for (const value of Object.values(enumObj)) {
      counts[value] = 0;
    }
    return counts;
  }
}
