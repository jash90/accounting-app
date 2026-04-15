import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import {
  applyUpdate,
  Client,
  ErrorMessages,
  escapeLikePattern,
  isOwnerOrAdmin,
  MonthlySettlement,
  PaginatedResponseDto,
  Task,
  TimeEntry,
  TimeEntryStatus,
  TimeRoundingMethod,
  User,
} from '@accounting/common';
import {
  calculatePagination,
  sanitizeForLog,
  SystemCompanyService,
} from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { CreateTimeEntryDto, TimeEntryFiltersDto, UpdateTimeEntryDto } from '../dto/time-entry.dto';
import { StartTimerDto, StopTimerDto, UpdateTimerDto } from '../dto/timer.dto';
import { TimeEntryNotFoundException } from '../exceptions';
import { TimeCalculationService } from './time-calculation.service';
import { TimeEntryApprovalService } from './time-entry-approval.service';
import { TimeEntryLockingService } from './time-entry-locking.service';
import { TimeEntryOverlapService } from './time-entry-overlap.service';
import { TimeSettingsService } from './time-settings.service';
import { TimerService } from './timer.service';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly changeLogService: ChangeLogService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly calculationService: TimeCalculationService,
    private readonly settingsService: TimeSettingsService,
    private readonly dataSource: DataSource,
    private readonly timerService: TimerService,
    private readonly approvalService: TimeEntryApprovalService,
    private readonly lockingService: TimeEntryLockingService,
    private readonly overlapService: TimeEntryOverlapService
  ) {}

  // ==================== CRUD Operations ====================

  async findAll(
    user: User,
    filters?: TimeEntryFiltersDto
  ): Promise<PaginatedResponseDto<TimeEntry>> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const { page, limit, skip } = calculatePagination(filters);

    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.client', 'client')
      .leftJoinAndSelect('entry.task', 'task')
      .leftJoinAndSelect('entry.settlement', 'settlement')
      .leftJoinAndSelect('settlement.client', 'settlementClient')
      .where('entry.companyId = :companyId', { companyId });

    // User filter - non-managers can only see their own entries
    if (!isOwnerOrAdmin(user)) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: user.id });
    } else if (filters?.userId) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: filters.userId });
    }

    // Search filter
    if (filters?.search) {
      const escapedSearch = escapeLikePattern(filters.search);
      queryBuilder.andWhere("entry.description ILIKE :search ESCAPE '\\'", {
        search: `%${escapedSearch}%`,
      });
    }

    // Status filters
    if (filters?.status) {
      queryBuilder.andWhere('entry.status = :status', { status: filters.status });
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      queryBuilder.andWhere('entry.status IN (:...statuses)', {
        statuses: filters.statuses,
      });
    }

    // Relation filters
    if (filters?.clientId) {
      queryBuilder.andWhere('entry.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }
    if (filters?.taskId) {
      queryBuilder.andWhere('entry.taskId = :taskId', { taskId: filters.taskId });
    }
    if (filters?.settlementId) {
      queryBuilder.andWhere('entry.settlementId = :settlementId', {
        settlementId: filters.settlementId,
      });
    }

    // Billable filter
    if (filters?.isBillable !== undefined) {
      queryBuilder.andWhere('entry.isBillable = :isBillable', {
        isBillable: filters.isBillable,
      });
    }

    // Date range filters
    if (filters?.startDateFrom) {
      queryBuilder.andWhere('entry.startTime >= :startDateFrom', {
        startDateFrom: filters.startDateFrom,
      });
    }
    if (filters?.startDateTo) {
      queryBuilder.andWhere('entry.startTime <= :startDateTo', {
        startDateTo: filters.startDateTo,
      });
    }

    // Active filter (default true)
    const isActive = filters?.isActive ?? true;
    queryBuilder.andWhere('entry.isActive = :isActive', { isActive });

    queryBuilder.orderBy('entry.startTime', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<TimeEntry> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const entry = await this.entryRepository.findOne({
      where: { id, companyId },
      relations: [
        'user',
        'client',
        'task',
        'settlement',
        'settlement.client',
        'approvedBy',
        'createdBy',
      ],
    });

    if (!entry) {
      throw new TimeEntryNotFoundException();
    }

    // Non-managers can only see their own entries
    if (!isOwnerOrAdmin(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    return entry;
  }

  async create(dto: CreateTimeEntryDto, user: User): Promise<TimeEntry> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    if (dto.taskId && dto.settlementId) {
      throw new BadRequestException(ErrorMessages.TIME_TRACKING.TASK_AND_SETTLEMENT_EXCLUSIVE);
    }

    // Validate client/task ownership to prevent cross-tenant data access
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }
    if (dto.settlementId) {
      await this.validateSettlementOwnership(dto.settlementId, companyId);
    }

    // Fetch settings once to avoid N+1 query
    const settings = await this.settingsService.getSettings(user);

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;

    // Calculate duration and amount (outside transaction as these are pure calculations)
    let durationMinutes = dto.durationMinutes;
    if (!durationMinutes && endTime) {
      durationMinutes = this.calculationService.calculateDuration(startTime, endTime);
    }

    // Apply rounding using settings we already have
    if (durationMinutes) {
      durationMinutes = this.calculationService.roundDuration(
        durationMinutes,
        settings.roundingMethod,
        settings.roundingIntervalMinutes
      );
    }

    // Get effective hourly rate from settings
    let hourlyRate = dto.hourlyRate;
    if (!hourlyRate) {
      hourlyRate = settings.defaultHourlyRate ?? undefined;
    }

    // Calculate total amount
    let totalAmount: number | undefined;
    if (
      durationMinutes !== undefined &&
      durationMinutes !== null &&
      hourlyRate !== undefined &&
      hourlyRate !== null &&
      dto.isBillable !== false
    ) {
      totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
    }

    // Use transaction with pessimistic locking to prevent race conditions
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      // Check for overlapping entries with lock if not allowed
      if (!settings.allowOverlappingEntries) {
        await this.overlapService.enforceNoTimeOverlapWithLock(
          manager,
          user.id,
          companyId,
          startTime,
          endTime || null
        );
      }

      const entry = manager.create(TimeEntry, {
        ...dto,
        startTime,
        endTime,
        durationMinutes,
        hourlyRate,
        totalAmount,
        companyId,
        userId: user.id,
        createdById: user.id,
        status: TimeEntryStatus.DRAFT,
        isRunning: false,
      });

      return manager.save(entry);
    });

    await this.changeLogService.logCreate(
      'TimeEntry',
      savedEntry.id,
      this.sanitizeTimeEntryForLog(savedEntry),
      user
    );

    return this.findOne(savedEntry.id, user);
  }

  async update(id: string, dto: UpdateTimeEntryDto, user: User): Promise<TimeEntry> {
    // First fetch entry without lock for validation checks
    const entry = await this.findOne(id, user);
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Validate client/task/settlement ownership if being changed
    if (dto.clientId && dto.clientId !== entry.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId && dto.taskId !== entry.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }
    if (dto.settlementId && dto.settlementId !== entry.settlementId) {
      await this.validateSettlementOwnership(dto.settlementId, companyId);
    }

    // Check mutual exclusivity with effective values
    const effectiveTaskId = dto.taskId !== undefined ? dto.taskId : entry.taskId;
    const effectiveSettlementId =
      dto.settlementId !== undefined ? dto.settlementId : entry.settlementId;
    if (effectiveTaskId && effectiveSettlementId) {
      throw new BadRequestException(ErrorMessages.TIME_TRACKING.TASK_AND_SETTLEMENT_EXCLUSIVE);
    }

    // Check if entry is locked
    await this.lockingService.enforceEntryNotLocked(entry, user);

    // Non-managers can only edit their own entries
    if (!isOwnerOrAdmin(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    const oldValues = this.sanitizeTimeEntryForLog(entry);

    // Check if times are being changed
    const timesChanged = dto.startTime !== undefined || dto.endTime !== undefined;

    // Fetch settings outside transaction (read-only operation)
    const settings = await this.settingsService.getSettings(user);
    const needsOverlapCheck = timesChanged && !settings.allowOverlappingEntries;

    // Prepare rounding config if needed
    let roundingConfig: { method: TimeRoundingMethod; interval: number } | undefined;
    if (timesChanged) {
      roundingConfig = await this.settingsService.getRoundingConfig(user);
    }

    // Use transaction with pessimistic locking to prevent race conditions
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      // Fetch entry with pessimistic write lock to prevent concurrent modifications
      const lockedEntry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.id = :id', { id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .getOne();

      if (!lockedEntry) {
        throw new TimeEntryNotFoundException();
      }

      // Handle date changes
      const startTime = dto.startTime ? new Date(dto.startTime) : lockedEntry.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : lockedEntry.endTime;

      // Check for overlapping entries with lock if times are being changed
      if (needsOverlapCheck) {
        await this.overlapService.enforceNoTimeOverlapWithLock(
          manager,
          lockedEntry.userId,
          companyId,
          startTime,
          endTime || null,
          id
        );
      }

      // Recalculate duration if times changed
      let durationMinutes = dto.durationMinutes ?? lockedEntry.durationMinutes;
      if (timesChanged && endTime && roundingConfig) {
        durationMinutes = this.calculationService.calculateDuration(startTime, endTime);
        durationMinutes = this.calculationService.roundDuration(
          durationMinutes,
          roundingConfig.method,
          roundingConfig.interval
        );
      }

      // Recalculate amount if needed
      const hourlyRate = dto.hourlyRate ?? lockedEntry.hourlyRate;
      const isBillable = dto.isBillable ?? lockedEntry.isBillable;
      let totalAmount = lockedEntry.totalAmount;
      if (durationMinutes && hourlyRate && isBillable) {
        totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
      }

      applyUpdate(
        lockedEntry,
        {
          ...dto,
          startTime,
          endTime,
          durationMinutes,
          hourlyRate,
          totalAmount,
        },
        ['id', 'companyId', 'userId', 'createdAt']
      );

      return manager.save(lockedEntry);
    });

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeTimeEntryForLog(savedEntry),
      user
    );

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const entry = await this.findOne(id, user);

    // Check if entry is locked
    await this.lockingService.enforceEntryNotLocked(entry, user);

    // Non-managers can only delete their own entries
    if (!isOwnerOrAdmin(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    const oldValues = this.sanitizeTimeEntryForLog(entry);

    // Soft delete
    entry.isActive = false;
    await this.entryRepository.save(entry);

    await this.changeLogService.logDelete('TimeEntry', entry.id, oldValues, user);
  }

  // ==================== Timer Operations (delegated) ====================

  async startTimer(dto: StartTimerDto, user: User): Promise<TimeEntry> {
    const entry = await this.timerService.startTimer(dto, user);
    return this.findOne(entry.id, user);
  }

  async stopTimer(dto: StopTimerDto, user: User): Promise<TimeEntry> {
    const entry = await this.timerService.stopTimer(dto, user);
    return this.findOne(entry.id, user);
  }

  async getActiveTimer(user: User): Promise<TimeEntry | null> {
    return this.timerService.getActiveTimer(user);
  }

  async discardTimer(user: User): Promise<void> {
    return this.timerService.discardTimer(user);
  }

  async updateTimer(dto: UpdateTimerDto, user: User): Promise<TimeEntry> {
    const entry = await this.timerService.updateTimer(dto, user);
    return this.findOne(entry.id, user);
  }

  // ==================== Approval Workflow (delegated) ====================

  async submitEntry(id: string, user: User): Promise<TimeEntry> {
    const entry = await this.approvalService.submitEntry(id, user);
    return this.findOne(entry.id, user);
  }

  async approveEntry(id: string, user: User): Promise<TimeEntry> {
    const entry = await this.approvalService.approveEntry(id, user);
    return this.findOne(entry.id, user);
  }

  async rejectEntry(id: string, rejectionNote: string, user: User): Promise<TimeEntry> {
    const entry = await this.approvalService.rejectEntry(id, rejectionNote, user);
    return this.findOne(entry.id, user);
  }

  async bulkApprove(
    entryIds: string[],
    user: User
  ): Promise<{ approved: number; notFound: number }> {
    return this.approvalService.bulkApprove(entryIds, user);
  }

  async bulkReject(
    entryIds: string[],
    rejectionNote: string,
    user: User
  ): Promise<{ rejected: number; notFound: number }> {
    return this.approvalService.bulkReject(entryIds, rejectionNote, user);
  }

  // ==================== Locking Operations (delegated) ====================

  async lockEntry(id: string, user: User, reason?: string): Promise<TimeEntry> {
    const entry = await this.findOne(id, user);
    await this.lockingService.lockEntry(entry, user, reason);
    return this.findOne(id, user);
  }

  async unlockEntry(id: string, user: User, reason?: string): Promise<TimeEntry> {
    const entry = await this.findOne(id, user);
    await this.lockingService.unlockEntry(entry, user, reason);
    return this.findOne(id, user);
  }

  // ==================== Validation Helpers ====================

  private async validateClientOwnership(clientId: string, companyId: string): Promise<void> {
    const client = await this.dataSource.getRepository(Client).findOne({
      where: { id: clientId, companyId, isActive: true },
    });
    if (!client) {
      throw new NotFoundException(ErrorMessages.TIME_TRACKING.CLIENT_NOT_IN_COMPANY);
    }
  }

  private async validateSettlementOwnership(
    settlementId: string,
    companyId: string
  ): Promise<void> {
    const settlement = await this.dataSource.getRepository(MonthlySettlement).findOne({
      where: { id: settlementId, companyId },
    });
    if (!settlement) {
      throw new NotFoundException(ErrorMessages.TIME_TRACKING.SETTLEMENT_NOT_IN_COMPANY);
    }
  }

  private async validateTaskOwnership(taskId: string, companyId: string): Promise<void> {
    const task = await this.dataSource.getRepository(Task).findOne({
      where: { id: taskId, companyId, isActive: true },
    });
    if (!task) {
      throw new NotFoundException(ErrorMessages.TIME_TRACKING.TASK_NOT_IN_COMPANY);
    }
  }

  private sanitizeTimeEntryForLog(entry: TimeEntry): Record<string, unknown> {
    return sanitizeForLog(entry, [
      'description',
      'startTime',
      'endTime',
      'durationMinutes',
      'isBillable',
      'hourlyRate',
      'totalAmount',
      'status',
      'userId',
      'clientId',
      'taskId',
      'settlementId',
      'isActive',
      'isLocked',
      'lockedAt',
      'lockedById',
    ]);
  }
}
