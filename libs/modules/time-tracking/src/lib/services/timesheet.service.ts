import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Between, DataSource, Repository } from 'typeorm';

import { TimeEntry, User, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { TimeCalculationService } from './time-calculation.service';
import { TimeSettingsService } from './time-settings.service';
import {
  DailyTimesheetDto,
  ReportFiltersDto,
  TimesheetGroupBy,
  WeeklyTimesheetDto,
} from '../dto/timesheet.dto';

export interface DayEntry {
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
  billableMinutes: number;
  totalAmount: number;
}

export interface TimesheetSummary {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
  entriesCount: number;
}

export interface DailyTimesheetResponse {
  date: string;
  entries: TimeEntry[];
  summary: TimesheetSummary;
}

export interface WeeklyTimesheetResponse {
  weekStart: string;
  weekEnd: string;
  days: DayEntry[];
  summary: TimesheetSummary;
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
  entriesCount: number;
  groupedData?: GroupedReportData[];
}

export interface GroupedReportData {
  groupId: string;
  groupName: string;
  totalMinutes: number;
  billableMinutes: number;
  totalAmount: number;
  entriesCount: number;
}

@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly calculationService: TimeCalculationService,
    private readonly settingsService: TimeSettingsService,
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource
  ) {}

  private canViewAllEntries(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.COMPANY_OWNER;
  }

  /**
   * Validates that a user belongs to the specified company.
   * Throws NotFoundException if user doesn't exist or doesn't belong to company.
   */
  private async validateUserBelongsToCompany(userId: string, companyId: string): Promise<void> {
    const targetUser = await this.dataSource.getRepository(User).findOne({
      where: { id: userId, companyId, isActive: true },
    });
    if (!targetUser) {
      throw new NotFoundException('Użytkownik nie należy do tej firmy');
    }
  }

  async getDailyTimesheet(dto: DailyTimesheetDto, user: User): Promise<DailyTimesheetResponse> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const date = new Date(dto.date);
    const { startOfDay, endOfDay } = this.calculationService.getDayBounds(date);

    // Determine which user's data to fetch
    let targetUserId = user.id;
    if (dto.userId && this.canViewAllEntries(user)) {
      // Validate that the requested user belongs to this company (IDOR protection)
      await this.validateUserBelongsToCompany(dto.userId, companyId);
      targetUserId = dto.userId;
    }

    const entries = await this.entryRepository.find({
      where: {
        companyId,
        userId: targetUserId,
        startTime: Between(startOfDay, endOfDay),
        isActive: true,
      },
      relations: ['client', 'task'],
      order: { startTime: 'ASC' },
    });

    const summary = this.calculateSummary(entries);

    return {
      date: dto.date,
      entries,
      summary,
    };
  }

  async getWeeklyTimesheet(dto: WeeklyTimesheetDto, user: User): Promise<WeeklyTimesheetResponse> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const settings = await this.settingsService.getSettings(user);
    const date = new Date(dto.weekStart);
    const { startOfWeek, endOfWeek } = this.calculationService.getWeekBounds(
      date,
      settings.weekStartDay
    );

    // Determine which user's data to fetch
    let targetUserId = user.id;
    if (dto.userId && this.canViewAllEntries(user)) {
      // Validate that the requested user belongs to this company (IDOR protection)
      await this.validateUserBelongsToCompany(dto.userId, companyId);
      targetUserId = dto.userId;
    }

    const entries = await this.entryRepository.find({
      where: {
        companyId,
        userId: targetUserId,
        startTime: Between(startOfWeek, endOfWeek),
        isActive: true,
      },
      relations: ['client', 'task'],
      order: { startTime: 'ASC' },
    });

    // Group entries by day
    const dayMap = new Map<string, TimeEntry[]>();
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + i);
      const dateStr = dayDate.toISOString().split('T')[0];
      dayMap.set(dateStr, []);
    }

    for (const entry of entries) {
      const dateStr = entry.startTime.toISOString().split('T')[0];
      const dayEntries = dayMap.get(dateStr) ?? [];
      dayEntries.push(entry);
      dayMap.set(dateStr, dayEntries);
    }

    const days: DayEntry[] = Array.from(dayMap.entries()).map(([date, dayEntries]) => {
      const daySummary = this.calculateSummary(dayEntries);
      return {
        date,
        entries: dayEntries,
        totalMinutes: daySummary.totalMinutes,
        billableMinutes: daySummary.billableMinutes,
        totalAmount: daySummary.totalAmount,
      };
    });

    const summary = this.calculateSummary(entries);

    return {
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
      days,
      summary,
    };
  }

  async getReportSummary(dto: ReportFiltersDto, user: User): Promise<ReportSummary> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Build base query with filters
    const baseQueryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .where('entry.companyId = :companyId', { companyId })
      .andWhere('entry.startTime >= :startDate', { startDate })
      .andWhere('entry.startTime <= :endDate', { endDate })
      .andWhere('entry.isActive = true');

    // Apply filters
    if (!this.canViewAllEntries(user)) {
      baseQueryBuilder.andWhere('entry.userId = :userId', { userId: user.id });
    } else if (dto.userId) {
      // Validate that the requested user belongs to this company (IDOR protection)
      await this.validateUserBelongsToCompany(dto.userId, companyId);
      baseQueryBuilder.andWhere('entry.userId = :userId', { userId: dto.userId });
    }

    if (dto.clientId) {
      baseQueryBuilder.andWhere('entry.clientId = :clientId', { clientId: dto.clientId });
    }
    if (dto.taskId) {
      baseQueryBuilder.andWhere('entry.taskId = :taskId', { taskId: dto.taskId });
    }
    if (dto.isBillable !== undefined) {
      baseQueryBuilder.andWhere('entry.isBillable = :isBillable', { isBillable: dto.isBillable });
    }

    // Use database-level aggregation for summary to avoid loading all entries into memory
    const summaryResult = await baseQueryBuilder
      .clone()
      .select('COUNT(*)', 'entriesCount')
      .addSelect('COALESCE(SUM(entry.durationMinutes), 0)', 'totalMinutes')
      .addSelect(
        'COALESCE(SUM(CASE WHEN entry.isBillable = true THEN entry.durationMinutes ELSE 0 END), 0)',
        'billableMinutes'
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN entry.isBillable = true THEN entry.totalAmount ELSE 0 END), 0)',
        'totalAmount'
      )
      .getRawOne();

    const entriesCount = parseInt(summaryResult?.entriesCount ?? '0', 10);
    const totalMinutes = parseInt(summaryResult?.totalMinutes ?? '0', 10);
    const billableMinutes = parseInt(summaryResult?.billableMinutes ?? '0', 10);
    const totalAmount = parseFloat(summaryResult?.totalAmount ?? '0');

    // Group data if requested - requires loading entries with safety limit
    let groupedData: GroupedReportData[] | undefined;
    if (dto.groupBy) {
      // Safety limit to prevent OOM on very large datasets
      const MAX_ENTRIES_FOR_GROUPING = 1000;

      const entries = await baseQueryBuilder
        .clone()
        .leftJoinAndSelect('entry.client', 'client')
        .leftJoinAndSelect('entry.task', 'task')
        .orderBy('entry.startTime', 'ASC')
        .take(MAX_ENTRIES_FOR_GROUPING)
        .getMany();

      groupedData = this.groupEntries(entries, dto.groupBy);

      // Log warning if results were truncated
      if (entries.length === MAX_ENTRIES_FOR_GROUPING && entriesCount > MAX_ENTRIES_FOR_GROUPING) {
        this.logger.warn(
          `Report grouping truncated: ${entriesCount} total entries, only first ${MAX_ENTRIES_FOR_GROUPING} grouped`
        );
      }
    }

    return {
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      totalAmount,
      entriesCount,
      groupedData,
    };
  }

  async getClientReport(
    clientId: string,
    dto: ReportFiltersDto,
    user: User
  ): Promise<ReportSummary> {
    return this.getReportSummary({ ...dto, clientId }, user);
  }

  private calculateSummary(entries: TimeEntry[]): TimesheetSummary {
    let totalMinutes = 0;
    let billableMinutes = 0;
    let totalAmount = 0;

    for (const entry of entries) {
      const duration = entry.durationMinutes ?? 0;
      totalMinutes += duration;

      if (entry.isBillable) {
        billableMinutes += duration;
        // TypeORM returns decimal columns as strings, so we need to parse them
        const amount = entry.totalAmount != null ? parseFloat(String(entry.totalAmount)) : 0;
        totalAmount += isNaN(amount) ? 0 : amount;
      }
    }

    return {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      totalAmount,
      entriesCount: entries.length,
    };
  }

  private groupEntries(entries: TimeEntry[], groupBy: TimesheetGroupBy): GroupedReportData[] {
    const groupMap = new Map<string, { name: string; entries: TimeEntry[] }>();

    for (const entry of entries) {
      let groupId: string;
      let groupName: string;

      switch (groupBy) {
        case TimesheetGroupBy.DAY:
          groupId = entry.startTime.toISOString().split('T')[0];
          groupName = groupId;
          break;

        case TimesheetGroupBy.CLIENT:
          groupId = entry.clientId ?? 'no-client';
          groupName = entry.client?.name ?? 'Bez klienta';
          break;

        case TimesheetGroupBy.TASK:
          groupId = entry.taskId ?? 'no-task';
          groupName = entry.task?.title ?? 'Bez zadania';
          break;

        default:
          groupId = 'all';
          groupName = 'Wszystkie';
      }

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { name: groupName, entries: [] });
      }
      groupMap.get(groupId)!.entries.push(entry);
    }

    return Array.from(groupMap.entries()).map(([groupId, { name, entries: groupEntries }]) => {
      const summary = this.calculateSummary(groupEntries);
      return {
        groupId,
        groupName: name,
        totalMinutes: summary.totalMinutes,
        billableMinutes: summary.billableMinutes,
        totalAmount: summary.totalAmount,
        entriesCount: summary.entriesCount,
      };
    });
  }
}
