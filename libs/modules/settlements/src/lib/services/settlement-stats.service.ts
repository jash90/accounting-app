import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { MonthlySettlement, SettlementStatus, User, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { EmployeeStatsDto, EmployeeStatsListDto, MyStatsDto, SettlementStatsDto } from '../dto';

interface StatusCounts {
  pending: number;
  inProgress: number;
  completed: number;
}

@Injectable()
export class SettlementStatsService {
  constructor(
    @InjectRepository(MonthlySettlement)
    private readonly settlementRepository: Repository<MonthlySettlement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantService: TenantService
  ) {}

  private canViewAllClients(user: User): boolean {
    return [UserRole.COMPANY_OWNER, UserRole.ADMIN].includes(user.role);
  }

  async getOverviewStats(month: number, year: number, user: User): Promise<SettlementStatsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const qb = this.settlementRepository
      .createQueryBuilder('settlement')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(CASE WHEN settlement.status = :pending THEN 1 END)`, 'pending')
      .addSelect(`COUNT(CASE WHEN settlement.status = :inProgress THEN 1 END)`, 'inProgress')
      .addSelect(`COUNT(CASE WHEN settlement.status = :completed THEN 1 END)`, 'completed')
      .addSelect(`COUNT(CASE WHEN settlement.userId IS NULL THEN 1 END)`, 'unassigned')
      .addSelect(
        `COUNT(CASE WHEN settlement.requiresAttention = true THEN 1 END)`,
        'requiresAttention'
      )
      .where('settlement.companyId = :companyId', { companyId })
      .andWhere('settlement.month = :month', { month })
      .andWhere('settlement.year = :year', { year })
      .setParameters({
        pending: SettlementStatus.PENDING,
        inProgress: SettlementStatus.IN_PROGRESS,
        completed: SettlementStatus.COMPLETED,
      });

    // For employees, only count their settlements
    if (!this.canViewAllClients(user)) {
      qb.andWhere('settlement.userId = :userId', { userId: user.id });
    }

    const stats = await qb.getRawOne<{
      total: string;
      pending: string;
      inProgress: string;
      completed: string;
      unassigned: string;
      requiresAttention: string;
    }>();

    const total = parseInt(stats?.total ?? '0', 10);
    const completed = parseInt(stats?.completed ?? '0', 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending: parseInt(stats?.pending ?? '0', 10),
      inProgress: parseInt(stats?.inProgress ?? '0', 10),
      completed,
      unassigned: parseInt(stats?.unassigned ?? '0', 10),
      requiresAttention: parseInt(stats?.requiresAttention ?? '0', 10),
      completionRate,
    };
  }

  async getEmployeeStats(month: number, year: number, user: User): Promise<EmployeeStatsListDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get all employees in the company
    const employees = await this.userRepository.find({
      where: { companyId, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName'],
    });

    // Use SQL aggregation to get counts per user directly from database
    const statsRaw = await this.settlementRepository
      .createQueryBuilder('settlement')
      .select('settlement.userId', 'userId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`COUNT(CASE WHEN settlement.status = :pending THEN 1 END)`, 'pending')
      .addSelect(`COUNT(CASE WHEN settlement.status = :inProgress THEN 1 END)`, 'inProgress')
      .addSelect(`COUNT(CASE WHEN settlement.status = :completed THEN 1 END)`, 'completed')
      .where('settlement.companyId = :companyId', { companyId })
      .andWhere('settlement.month = :month', { month })
      .andWhere('settlement.year = :year', { year })
      .andWhere('settlement.userId IS NOT NULL')
      .groupBy('settlement.userId')
      .setParameters({
        pending: SettlementStatus.PENDING,
        inProgress: SettlementStatus.IN_PROGRESS,
        completed: SettlementStatus.COMPLETED,
      })
      .getRawMany<{
        userId: string;
        total: string;
        pending: string;
        inProgress: string;
        completed: string;
      }>();

    // Build lookup map for O(1) access - avoids O(n×m) nested iteration
    const statsMap = new Map<string, StatusCounts & { total: number }>();
    for (const row of statsRaw) {
      statsMap.set(row.userId, {
        total: parseInt(row.total, 10),
        pending: parseInt(row.pending, 10),
        inProgress: parseInt(row.inProgress, 10),
        completed: parseInt(row.completed, 10),
      });
    }

    // Build stats per employee using O(1) map lookup
    const employeeStats: EmployeeStatsDto[] = employees.map((employee) => {
      const stats = statsMap.get(employee.id) ?? {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
      };
      const completionRate =
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      return {
        userId: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        total: stats.total,
        pending: stats.pending,
        inProgress: stats.inProgress,
        completed: stats.completed,
        completionRate,
      };
    });

    // Sort by total (descending)
    employeeStats.sort((a, b) => b.total - a.total);

    return { employees: employeeStats };
  }

  async getMyStats(month: number, year: number, user: User): Promise<MyStatsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Use SQL aggregation instead of loading all records into memory
    const stats = await this.settlementRepository
      .createQueryBuilder('settlement')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(CASE WHEN settlement.status = :pending THEN 1 END)`, 'pending')
      .addSelect(`COUNT(CASE WHEN settlement.status = :inProgress THEN 1 END)`, 'inProgress')
      .addSelect(`COUNT(CASE WHEN settlement.status = :completed THEN 1 END)`, 'completed')
      .where('settlement.companyId = :companyId', { companyId })
      .andWhere('settlement.month = :month', { month })
      .andWhere('settlement.year = :year', { year })
      .andWhere('settlement.userId = :userId', { userId: user.id })
      .setParameters({
        pending: SettlementStatus.PENDING,
        inProgress: SettlementStatus.IN_PROGRESS,
        completed: SettlementStatus.COMPLETED,
      })
      .getRawOne<{
        total: string;
        pending: string;
        inProgress: string;
        completed: string;
      }>();

    const total = parseInt(stats?.total ?? '0', 10);
    const completed = parseInt(stats?.completed ?? '0', 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending: parseInt(stats?.pending ?? '0', 10),
      inProgress: parseInt(stats?.inProgress ?? '0', 10),
      completed,
      completionRate,
    };
  }
}
