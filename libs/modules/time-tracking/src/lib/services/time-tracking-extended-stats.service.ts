import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { TimeEntry, User, UserRole } from '@accounting/common';
import { resolvePresetDateRange, SystemCompanyService } from '@accounting/common/backend';

export interface TopTaskByTimeDto {
  taskId: string;
  taskTitle: string;
  totalMinutes: number;
  totalHours: number;
}

export interface TopSettlementByTimeDto {
  settlementId: string;
  month: number;
  year: number;
  clientName?: string;
  totalMinutes: number;
  totalHours: number;
}

export interface EmployeeTimeBreakdownItemDto {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  taskMinutes: number;
  settlementMinutes: number;
  totalMinutes: number;
}

export interface ExtendedTimeStatsFilterDto {
  preset?: '30d' | '90d' | '365d';
  startDate?: string;
  endDate?: string;
  userId?: string;
}

@Injectable()
export class TimeTrackingExtendedStatsService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getTopTasksByTime(
    user: User,
    filter: ExtendedTimeStatsFilterDto = {}
  ): Promise<TopTaskByTimeDto[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { start, end } = resolvePresetDateRange(filter);
    const isEmployee = user.role === UserRole.EMPLOYEE;

    const qb = this.timeEntryRepository
      .createQueryBuilder('te')
      .select('te.taskId', 'taskId')
      .addSelect('SUM(te.durationMinutes)', 'totalMinutes')
      .leftJoin('te.task', 'task')
      .addSelect('task.title', 'taskTitle')
      .where('te.companyId = :companyId', { companyId })
      .andWhere('te.taskId IS NOT NULL')
      .andWhere('te.durationMinutes IS NOT NULL')
      .andWhere('te.startTime >= :start', { start })
      .andWhere('te.startTime <= :end', { end })
      .groupBy('te.taskId')
      .addGroupBy('task.id')
      .addGroupBy('task.title')
      .orderBy('"totalMinutes"', 'DESC')
      .limit(20);

    if (isEmployee) {
      qb.andWhere('te.userId = :userId', { userId: user.id });
    }

    const raw = await qb.getRawMany<{ taskId: string; taskTitle: string; totalMinutes: string }>();

    return raw.map((r) => ({
      taskId: r.taskId,
      taskTitle: r.taskTitle ?? 'Unknown',
      totalMinutes: parseInt(r.totalMinutes, 10),
      totalHours: Math.round(parseInt(r.totalMinutes, 10) / 6) / 10,
    }));
  }

  async getTopSettlementsByTime(
    user: User,
    filter: ExtendedTimeStatsFilterDto = {}
  ): Promise<TopSettlementByTimeDto[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { start, end } = resolvePresetDateRange(filter);
    const isEmployee = user.role === UserRole.EMPLOYEE;

    const qb = this.timeEntryRepository
      .createQueryBuilder('te')
      .select('te.settlementId', 'settlementId')
      .addSelect('SUM(te.durationMinutes)', 'totalMinutes')
      .leftJoin('te.settlement', 'settlement')
      .addSelect('settlement.month', 'month')
      .addSelect('settlement.year', 'year')
      .leftJoin('settlement.client', 'client')
      .addSelect('client.name', 'clientName')
      .where('te.companyId = :companyId', { companyId })
      .andWhere('te.settlementId IS NOT NULL')
      .andWhere('te.durationMinutes IS NOT NULL')
      .andWhere('te.startTime >= :start', { start })
      .andWhere('te.startTime <= :end', { end })
      .groupBy('te.settlementId')
      .addGroupBy('settlement.id')
      .addGroupBy('settlement.month')
      .addGroupBy('settlement.year')
      .addGroupBy('client.id')
      .addGroupBy('client.name')
      .orderBy('"totalMinutes"', 'DESC')
      .limit(20);

    if (isEmployee) {
      qb.andWhere('te.userId = :userId', { userId: user.id });
    }

    const raw = await qb.getRawMany<{
      settlementId: string;
      month: number;
      year: number;
      clientName: string;
      totalMinutes: string;
    }>();

    return raw.map((r) => ({
      settlementId: r.settlementId,
      month: r.month,
      year: r.year,
      clientName: r.clientName,
      totalMinutes: parseInt(r.totalMinutes, 10),
      totalHours: Math.round(parseInt(r.totalMinutes, 10) / 6) / 10,
    }));
  }

  async getEmployeeTimeBreakdown(
    user: User,
    filter: ExtendedTimeStatsFilterDto = {}
  ): Promise<EmployeeTimeBreakdownItemDto[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { start, end } = resolvePresetDateRange(filter);
    const isEmployee = user.role === UserRole.EMPLOYEE;

    const qb = this.timeEntryRepository
      .createQueryBuilder('te')
      .select('te.userId', 'userId')
      .addSelect(
        'SUM(CASE WHEN te.taskId IS NOT NULL THEN te.durationMinutes ELSE 0 END)',
        'taskMinutes'
      )
      .addSelect(
        'SUM(CASE WHEN te.settlementId IS NOT NULL THEN te.durationMinutes ELSE 0 END)',
        'settlementMinutes'
      )
      .addSelect('SUM(te.durationMinutes)', 'totalMinutes')
      .leftJoin('te.user', 'user')
      .addSelect('user.email', 'email')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .where('te.companyId = :companyId', { companyId })
      .andWhere('te.durationMinutes IS NOT NULL')
      .andWhere('te.startTime >= :start', { start })
      .andWhere('te.startTime <= :end', { end })
      .groupBy('te.userId')
      .addGroupBy('user.id')
      .addGroupBy('user.email')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('"totalMinutes"', 'DESC');

    if (isEmployee) {
      qb.andWhere('te.userId = :userId', { userId: user.id });
    }

    const raw = await qb.getRawMany<{
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      taskMinutes: string;
      settlementMinutes: string;
      totalMinutes: string;
    }>();

    return raw.map((r) => ({
      userId: r.userId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      taskMinutes: parseInt(r.taskMinutes ?? '0', 10),
      settlementMinutes: parseInt(r.settlementMinutes ?? '0', 10),
      totalMinutes: parseInt(r.totalMinutes ?? '0', 10),
    }));
  }
}
