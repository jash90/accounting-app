import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { MonthlySettlement, SettlementStatus, User, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { EmployeeStatsDto, EmployeeStatsListDto, MyStatsDto, SettlementStatsDto } from '../dto';

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
      .where('settlement.companyId = :companyId', { companyId })
      .andWhere('settlement.month = :month', { month })
      .andWhere('settlement.year = :year', { year });

    // For employees, only count their settlements
    if (!this.canViewAllClients(user)) {
      qb.andWhere('settlement.userId = :userId', { userId: user.id });
    }

    const settlements = await qb.getMany();

    const total = settlements.length;
    const pending = settlements.filter((s) => s.status === SettlementStatus.PENDING).length;
    const inProgress = settlements.filter((s) => s.status === SettlementStatus.IN_PROGRESS).length;
    const completed = settlements.filter((s) => s.status === SettlementStatus.COMPLETED).length;
    const unassigned = settlements.filter((s) => !s.userId).length;
    const requiresAttention = settlements.filter((s) => s.requiresAttention).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      unassigned,
      requiresAttention,
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

    // Get all settlements for this month
    const settlements = await this.settlementRepository.find({
      where: { companyId, month, year },
      select: ['id', 'userId', 'status'],
    });

    // Build stats per employee
    const employeeStats: EmployeeStatsDto[] = employees.map((employee) => {
      const employeeSettlements = settlements.filter((s) => s.userId === employee.id);
      const total = employeeSettlements.length;
      const pending = employeeSettlements.filter(
        (s) => s.status === SettlementStatus.PENDING
      ).length;
      const inProgress = employeeSettlements.filter(
        (s) => s.status === SettlementStatus.IN_PROGRESS
      ).length;
      const completed = employeeSettlements.filter(
        (s) => s.status === SettlementStatus.COMPLETED
      ).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        userId: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        total,
        pending,
        inProgress,
        completed,
        completionRate,
      };
    });

    // Sort by total (descending)
    employeeStats.sort((a, b) => b.total - a.total);

    return { employees: employeeStats };
  }

  async getMyStats(month: number, year: number, user: User): Promise<MyStatsDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const settlements = await this.settlementRepository.find({
      where: { companyId, month, year, userId: user.id },
      select: ['id', 'status'],
    });

    const total = settlements.length;
    const pending = settlements.filter((s) => s.status === SettlementStatus.PENDING).length;
    const inProgress = settlements.filter((s) => s.status === SettlementStatus.IN_PROGRESS).length;
    const completed = settlements.filter((s) => s.status === SettlementStatus.COMPLETED).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate,
    };
  }
}
