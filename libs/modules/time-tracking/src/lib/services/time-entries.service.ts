import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In, Not, IsNull, LessThanOrEqual, MoreThanOrEqual, DataSource, EntityManager } from 'typeorm';
import {
  TimeEntry,
  TimeEntryStatus,
  TimeRoundingMethod,
  User,
  UserRole,
  PaginatedResponseDto,
  Client,
  Task,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import {
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  TimeEntryFiltersDto,
} from '../dto/time-entry.dto';
import { StartTimerDto, StopTimerDto, UpdateTimerDto } from '../dto/timer.dto';
import { TimeCalculationService } from './time-calculation.service';
import { TimeSettingsService } from './time-settings.service';
import {
  TimeEntryNotFoundException,
  TimerAlreadyRunningException,
  TimerNotRunningException,
  TimeEntryOverlapException,
  TimeEntryLockedException,
  TimeEntryInvalidStatusException,
  TimeEntryUnlockNotAuthorizedException,
} from '../exceptions';

/**
 * Far future date used for overlap detection with running timers.
 * Running timers have no endTime (null), but SQL range overlap queries
 * require a date for comparison: (start1 < end2) AND (end1 > start2).
 * Using '9999-12-31' allows detecting overlaps with open-ended entries.
 */
const FAR_FUTURE_DATE = '9999-12-31';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly changeLogService: ChangeLogService,
    private readonly tenantService: TenantService,
    private readonly calculationService: TimeCalculationService,
    private readonly settingsService: TimeSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  /**
   * Check if user can view all entries (owner/admin) or only their own
   */
  private canViewAllEntries(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.COMPANY_OWNER;
  }

  /**
   * Ensures user has permission to manage (approve/reject) time entries.
   * Defense-in-depth: validates authorization at service level in addition to guards.
   * @throws ForbiddenException if user is not ADMIN or COMPANY_OWNER
   */
  private ensureCanManageEntries(user: User): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COMPANY_OWNER) {
      throw new ForbiddenException('Nie masz uprawnień do zarządzania wpisami czasu');
    }
  }

  async findAll(
    user: User,
    filters?: TimeEntryFiltersDto,
  ): Promise<PaginatedResponseDto<TimeEntry>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.client', 'client')
      .leftJoinAndSelect('entry.task', 'task')
      .where('entry.companyId = :companyId', { companyId });

    // User filter - non-managers can only see their own entries
    if (!this.canViewAllEntries(user)) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: user.id });
    } else if (filters?.userId) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: filters.userId });
    }

    // Search filter
    if (filters?.search) {
      const escapedSearch = this.escapeLikePattern(filters.search);
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

    queryBuilder
      .orderBy('entry.startTime', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const entry = await this.entryRepository.findOne({
      where: { id, companyId },
      relations: ['user', 'client', 'task', 'approvedBy', 'createdBy'],
    });

    if (!entry) {
      throw new TimeEntryNotFoundException();
    }

    // Non-managers can only see their own entries
    if (!this.canViewAllEntries(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    return entry;
  }

  async create(dto: CreateTimeEntryDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate client/task ownership to prevent cross-tenant data access
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
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
        settings.roundingIntervalMinutes,
      );
    }

    // Get effective hourly rate from settings
    let hourlyRate = dto.hourlyRate;
    if (!hourlyRate) {
      hourlyRate = settings.defaultHourlyRate ?? undefined;
    }

    // Calculate total amount
    let totalAmount: number | undefined;
    if (durationMinutes && hourlyRate && dto.isBillable !== false) {
      totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
    }

    // Use transaction with pessimistic locking to prevent race conditions
    // where two concurrent requests could both pass the overlap check
    // before either saves, resulting in overlapping entries
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      // Check for overlapping entries with lock if not allowed
      if (!settings.allowOverlappingEntries) {
        await this.checkOverlapWithLock(manager, user.id, companyId, startTime, endTime || null);
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
      this.sanitizeForLog(savedEntry),
      user,
    );

    return this.findOne(savedEntry.id, user);
  }

  async update(
    id: string,
    dto: UpdateTimeEntryDto,
    user: User,
  ): Promise<TimeEntry> {
    // First fetch entry without lock for validation checks
    const entry = await this.findOne(id, user);
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate client/task ownership if being changed
    if (dto.clientId && dto.clientId !== entry.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId && dto.taskId !== entry.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }

    // Check if entry is locked
    await this.checkEntryLocked(entry, user);

    // Non-managers can only edit their own entries
    if (!this.canViewAllEntries(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    const oldValues = this.sanitizeForLog(entry);

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
    // where two concurrent updates could both pass the overlap check
    // before either saves, resulting in overlapping entries
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
        await this.checkOverlapWithLock(manager, lockedEntry.userId, companyId, startTime, endTime || null, id);
      }

      // Recalculate duration if times changed
      // Note: Rounding is intentionally applied when times change, even if the entry
      // was already rounded during creation. This ensures the rounded duration always
      // reflects the current time range according to current rounding settings.
      // If rounding settings change, updating times will apply the new rounding rules.
      // Direct durationMinutes updates bypass rounding to allow manual overrides.
      let durationMinutes = dto.durationMinutes ?? lockedEntry.durationMinutes;
      if (timesChanged && endTime && roundingConfig) {
        durationMinutes = this.calculationService.calculateDuration(startTime, endTime);
        durationMinutes = this.calculationService.roundDuration(
          durationMinutes,
          roundingConfig.method,
          roundingConfig.interval,
        );
      }

      // Recalculate amount if needed
      const hourlyRate = dto.hourlyRate ?? lockedEntry.hourlyRate;
      const isBillable = dto.isBillable ?? lockedEntry.isBillable;
      let totalAmount = lockedEntry.totalAmount;
      if (durationMinutes && hourlyRate && isBillable) {
        totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
      }

      Object.assign(lockedEntry, {
        ...dto,
        startTime,
        endTime,
        durationMinutes,
        hourlyRate,
        totalAmount,
      });

      return manager.save(lockedEntry);
    });

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeForLog(savedEntry),
      user,
    );

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const entry = await this.findOne(id, user);

    // Check if entry is locked
    await this.checkEntryLocked(entry, user);

    // Non-managers can only delete their own entries
    if (!this.canViewAllEntries(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    const oldValues = this.sanitizeForLog(entry);

    // Soft delete
    entry.isActive = false;
    await this.entryRepository.save(entry);

    await this.changeLogService.logDelete('TimeEntry', entry.id, oldValues, user);
  }

  // ==================== Timer Operations ====================

  async startTimer(dto: StartTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate client/task ownership to prevent cross-tenant data access
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }

    try {
      // Use transaction with pessimistic locking to prevent race conditions
      const savedEntry = await this.dataSource.transaction(async (manager) => {
        // Check if timer is already running with pessimistic write lock
        const runningEntry = await manager
          .createQueryBuilder(TimeEntry, 'entry')
          .setLock('pessimistic_write')
          .where('entry.userId = :userId', { userId: user.id })
          .andWhere('entry.companyId = :companyId', { companyId })
          .andWhere('entry.isRunning = :isRunning', { isRunning: true })
          .andWhere('entry.isActive = :isActive', { isActive: true })
          .getOne();

        if (runningEntry) {
          throw new TimerAlreadyRunningException();
        }

        const entry = manager.create(TimeEntry, {
          ...dto,
          startTime: new Date(),
          companyId,
          userId: user.id,
          createdById: user.id,
          status: TimeEntryStatus.DRAFT,
          isRunning: true,
          isBillable: dto.isBillable ?? true,
        });

        return manager.save(entry);
      });

      this.logger.log(`Timer started for user ${user.id} (entry ${savedEntry.id})`);

      return this.findOne(savedEntry.id, user);
    } catch (error) {
      // Handle unique constraint violation from the partial index (PostgreSQL error 23505)
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
        this.logger.warn(`Concurrent timer start detected for user ${user.id}`);
        throw new TimerAlreadyRunningException();
      }
      throw error;
    }
  }

  async stopTimer(dto: StopTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., user clicking stop twice rapidly)
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      const runningEntry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.userId = :userId', { userId: user.id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .andWhere('entry.isRunning = :isRunning', { isRunning: true })
        .andWhere('entry.isActive = :isActive', { isActive: true })
        .getOne();

      if (!runningEntry) {
        throw new TimerNotRunningException();
      }

      const endTime = new Date();
      let durationMinutes = this.calculationService.calculateDuration(
        runningEntry.startTime,
        endTime,
      );

      // Apply rounding
      const { method, interval } = await this.settingsService.getRoundingConfig(user);
      durationMinutes = this.calculationService.roundDuration(durationMinutes, method, interval);

      // Get effective hourly rate
      let hourlyRate = runningEntry.hourlyRate;
      if (!hourlyRate) {
        const settings = await this.settingsService.getSettings(user);
        hourlyRate = settings.defaultHourlyRate ?? undefined;
      }

      // Calculate total amount
      let totalAmount: number | undefined;
      if (durationMinutes && hourlyRate && runningEntry.isBillable) {
        totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
      }

      // Update entry
      runningEntry.endTime = endTime;
      runningEntry.durationMinutes = durationMinutes;
      runningEntry.hourlyRate = hourlyRate;
      runningEntry.totalAmount = totalAmount;
      runningEntry.isRunning = false;

      if (dto.description) {
        runningEntry.description = runningEntry.description
          ? `${runningEntry.description} ${dto.description}`
          : dto.description;
      }

      return manager.save(runningEntry);
    });

    this.logger.log(
      `Timer stopped for user ${user.id} (entry ${savedEntry.id}, duration: ${savedEntry.durationMinutes}m)`,
    );

    return this.findOne(savedEntry.id, user);
  }

  async getActiveTimer(user: User): Promise<TimeEntry | null> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const runningEntry = await this.entryRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        isRunning: true,
        isActive: true,
      },
      relations: ['client', 'task'],
    });

    return runningEntry;
  }

  async discardTimer(user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., user clicking discard twice rapidly)
    await this.dataSource.transaction(async (manager) => {
      const runningEntry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.userId = :userId', { userId: user.id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .andWhere('entry.isRunning = :isRunning', { isRunning: true })
        .andWhere('entry.isActive = :isActive', { isActive: true })
        .getOne();

      if (!runningEntry) {
        throw new TimerNotRunningException();
      }

      // Soft delete for consistency with other time entry operations
      runningEntry.isActive = false;
      runningEntry.isRunning = false;
      await manager.save(runningEntry);
    });

    this.logger.log(`Timer discarded for user ${user.id}`);
  }

  async updateTimer(dto: UpdateTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate client/task ownership if being changed
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }

    const runningEntry = await this.entryRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        isRunning: true,
        isActive: true,
      },
    });

    if (!runningEntry) {
      throw new TimerNotRunningException();
    }

    Object.assign(runningEntry, dto);
    await this.entryRepository.save(runningEntry);

    return this.findOne(runningEntry.id, user);
  }

  // ==================== Approval Workflow ====================

  async submitEntry(id: string, user: User): Promise<TimeEntry> {
    const entry = await this.findOne(id, user);

    if (entry.userId !== user.id) {
      throw new TimeEntryNotFoundException();
    }

    if (entry.status !== TimeEntryStatus.DRAFT) {
      throw new TimeEntryInvalidStatusException(
        entry.status,
        TimeEntryStatus.SUBMITTED,
      );
    }

    entry.status = TimeEntryStatus.SUBMITTED;
    entry.submittedAt = new Date();

    await this.entryRepository.save(entry);

    this.logger.log(`Time entry ${id} submitted for approval`);

    return this.findOne(id, user);
  }

  async approveEntry(id: string, user: User): Promise<TimeEntry> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const entry = await this.findOne(id, user);

    if (entry.status !== TimeEntryStatus.SUBMITTED) {
      throw new TimeEntryInvalidStatusException(
        entry.status,
        TimeEntryStatus.APPROVED,
      );
    }

    entry.status = TimeEntryStatus.APPROVED;
    entry.approvedById = user.id;
    entry.approvedAt = new Date();
    // Auto-lock entry on approval to prevent further modifications
    entry.isLocked = true;
    entry.lockedAt = new Date();
    entry.lockedById = user.id;

    await this.entryRepository.save(entry);

    this.logger.log(`Time entry ${id} approved and locked by ${user.id}`);

    return this.findOne(id, user);
  }

  async rejectEntry(id: string, rejectionNote: string, user: User): Promise<TimeEntry> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const entry = await this.findOne(id, user);

    if (entry.status !== TimeEntryStatus.SUBMITTED) {
      throw new TimeEntryInvalidStatusException(
        entry.status,
        TimeEntryStatus.REJECTED,
      );
    }

    entry.status = TimeEntryStatus.REJECTED;
    entry.rejectionNote = rejectionNote;
    entry.approvedById = user.id;
    entry.approvedAt = new Date();

    await this.entryRepository.save(entry);

    this.logger.log(`Time entry ${id} rejected by ${user.id}`);

    return this.findOne(id, user);
  }

  async bulkApprove(entryIds: string[], user: User): Promise<{ approved: number; notFound: number }> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // First, count valid entries to report how many were not found
    const validCount = await this.entryRepository.count({
      where: {
        id: In(entryIds),
        companyId,
        status: TimeEntryStatus.SUBMITTED,
      },
    });

    const result = await this.entryRepository.update(
      {
        id: In(entryIds),
        companyId,
        status: TimeEntryStatus.SUBMITTED,
      },
      {
        status: TimeEntryStatus.APPROVED,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    );

    return {
      approved: result.affected ?? 0,
      notFound: entryIds.length - validCount,
    };
  }

  async bulkReject(
    entryIds: string[],
    rejectionNote: string,
    user: User,
  ): Promise<{ rejected: number; notFound: number }> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // First, count valid entries to report how many were not found
    const validCount = await this.entryRepository.count({
      where: {
        id: In(entryIds),
        companyId,
        status: TimeEntryStatus.SUBMITTED,
      },
    });

    const result = await this.entryRepository.update(
      {
        id: In(entryIds),
        companyId,
        status: TimeEntryStatus.SUBMITTED,
      },
      {
        status: TimeEntryStatus.REJECTED,
        rejectionNote,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    );

    return {
      rejected: result.affected ?? 0,
      notFound: entryIds.length - validCount,
    };
  }

  // ==================== Locking Operations ====================

  async lockEntry(id: string, user: User, reason?: string): Promise<TimeEntry> {
    const entry = await this.findOne(id, user);

    // Only managers can lock entries
    if (!this.canViewAllEntries(user)) {
      throw new TimeEntryUnlockNotAuthorizedException();
    }

    if (entry.isLocked) {
      // Already locked, return as-is
      return entry;
    }

    const oldValues = this.sanitizeForLog(entry);

    entry.isLocked = true;
    entry.lockedAt = new Date();
    entry.lockedById = user.id;

    const savedEntry = await this.entryRepository.save(entry);

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeForLog(savedEntry),
      user,
    );

    this.logger.log(`Time entry ${id} locked by ${user.id}${reason ? `: ${reason}` : ''}`);

    return this.findOne(id, user);
  }

  async unlockEntry(id: string, user: User, reason?: string): Promise<TimeEntry> {
    // Only ADMIN/COMPANY_OWNER can unlock
    if (!this.canViewAllEntries(user)) {
      throw new TimeEntryUnlockNotAuthorizedException();
    }

    const entry = await this.findOne(id, user);

    if (!entry.isLocked) {
      // Already unlocked, return as-is
      return entry;
    }

    const oldValues = this.sanitizeForLog(entry);

    entry.isLocked = false;
    entry.lockedAt = undefined;
    entry.lockedById = undefined;

    const savedEntry = await this.entryRepository.save(entry);

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeForLog(savedEntry),
      user,
    );

    this.logger.log(`Time entry ${id} unlocked by ${user.id}${reason ? `: ${reason}` : ''}`);

    return this.findOne(id, user);
  }

  // ==================== Helper Methods ====================

  /**
   * Validates that a client belongs to the specified company.
   * Throws NotFoundException if client doesn't exist or doesn't belong to company.
   */
  private async validateClientOwnership(clientId: string, companyId: string): Promise<void> {
    const client = await this.dataSource.getRepository(Client).findOne({
      where: { id: clientId, companyId, isActive: true },
    });
    if (!client) {
      throw new NotFoundException('Klient nie należy do tej firmy lub nie istnieje');
    }
  }

  /**
   * Validates that a task belongs to the specified company.
   * Throws NotFoundException if task doesn't exist or doesn't belong to company.
   */
  private async validateTaskOwnership(taskId: string, companyId: string): Promise<void> {
    const task = await this.dataSource.getRepository(Task).findOne({
      where: { id: taskId, companyId, isActive: true },
    });
    if (!task) {
      throw new NotFoundException('Zadanie nie należy do tej firmy lub nie istnieje');
    }
  }

  private async checkOverlap(
    userId: string,
    companyId: string,
    startTime: Date,
    endTime: Date | null,
    excludeEntryId?: string,
  ): Promise<void> {
    // SQL-based range overlap detection: (start1 < end2) AND (end1 > start2)
    // This is much more efficient than fetching all entries and checking in JS
    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .where('entry.userId = :userId', { userId })
      .andWhere('entry.companyId = :companyId', { companyId })
      .andWhere('entry.isActive = true')
      // Check overlap: new entry starts before existing entry ends
      // Using far future date constant for entries without end time
      .andWhere('entry.startTime < :endTime', {
        endTime: endTime ?? new Date(FAR_FUTURE_DATE),
      })
      // Check overlap: existing entry ends after new entry starts (or is still running)
      .andWhere('(entry.endTime IS NULL OR entry.endTime > :startTime)', {
        startTime,
      });

    if (excludeEntryId) {
      queryBuilder.andWhere('entry.id != :excludeId', { excludeId: excludeEntryId });
    }

    const count = await queryBuilder.getCount();

    if (count > 0) {
      throw new TimeEntryOverlapException();
    }
  }

  /**
   * Check for overlapping entries within a transaction using pessimistic locking.
   * This prevents race conditions where two concurrent requests could both pass
   * the overlap check before either saves, resulting in overlapping entries.
   *
   * Uses pessimistic_read lock to prevent other transactions from modifying
   * the entries being checked until the current transaction completes.
   */
  private async checkOverlapWithLock(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startTime: Date,
    endTime: Date | null,
    excludeEntryId?: string,
  ): Promise<void> {
    const queryBuilder = manager
      .createQueryBuilder(TimeEntry, 'entry')
      .setLock('pessimistic_read')
      .where('entry.userId = :userId', { userId })
      .andWhere('entry.companyId = :companyId', { companyId })
      .andWhere('entry.isActive = true')
      .andWhere('entry.startTime < :endTime', {
        endTime: endTime ?? new Date(FAR_FUTURE_DATE),
      })
      .andWhere('(entry.endTime IS NULL OR entry.endTime > :startTime)', {
        startTime,
      });

    if (excludeEntryId) {
      queryBuilder.andWhere('entry.id != :excludeId', { excludeId: excludeEntryId });
    }

    const count = await queryBuilder.getCount();

    if (count > 0) {
      throw new TimeEntryOverlapException();
    }
  }

  private async checkEntryLocked(entry: TimeEntry, user: User): Promise<void> {
    // Check 1: Explicit lock flag (takes precedence)
    if (entry.isLocked) {
      throw new TimeEntryLockedException();
    }

    // Check 2: Age-based locking
    const settings = await this.settingsService.getSettings(user);
    if (settings.lockEntriesAfterDays > 0) {
      const lockDate = new Date();
      lockDate.setDate(lockDate.getDate() - settings.lockEntriesAfterDays);

      if (entry.startTime < lockDate) {
        throw new TimeEntryLockedException();
      }
    }
  }

  private sanitizeForLog(entry: TimeEntry): Record<string, unknown> {
    return {
      description: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: entry.durationMinutes,
      isBillable: entry.isBillable,
      hourlyRate: entry.hourlyRate,
      totalAmount: entry.totalAmount,
      status: entry.status,
      userId: entry.userId,
      clientId: entry.clientId,
      taskId: entry.taskId,
      isActive: entry.isActive,
      isLocked: entry.isLocked,
      lockedAt: entry.lockedAt,
      lockedById: entry.lockedById,
    };
  }
}
