import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In, Not, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  TimeEntry,
  TimeEntryStatus,
  User,
  UserRole,
  PaginatedResponseDto,
  TenantService,
} from '@accounting/common';
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
} from '../exceptions';

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
      throw new TimeEntryNotFoundException(id);
    }

    // Non-managers can only see their own entries
    if (!this.canViewAllEntries(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException(id);
    }

    return entry;
  }

  async create(dto: CreateTimeEntryDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;

    // Check for overlapping entries if not allowed
    if (!(await this.settingsService.allowsOverlapping(user))) {
      await this.checkOverlap(user.id, companyId, startTime, endTime || null);
    }

    // Calculate duration and amount
    let durationMinutes = dto.durationMinutes;
    if (!durationMinutes && endTime) {
      durationMinutes = this.calculationService.calculateDuration(startTime, endTime);
    }

    // Apply rounding
    if (durationMinutes) {
      const { method, interval } = await this.settingsService.getRoundingConfig(user);
      durationMinutes = this.calculationService.roundDuration(durationMinutes, method, interval);
    }

    // Get effective hourly rate
    let hourlyRate = dto.hourlyRate;
    if (!hourlyRate) {
      const settings = await this.settingsService.getSettings(user);
      hourlyRate = settings.defaultHourlyRate ?? undefined;
    }

    // Calculate total amount
    let totalAmount: number | undefined;
    if (durationMinutes && hourlyRate && dto.isBillable !== false) {
      totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
    }

    const entry = this.entryRepository.create({
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

    const savedEntry = await this.entryRepository.save(entry);

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
    const entry = await this.findOne(id, user);

    // Check if entry is locked
    await this.checkEntryLocked(entry, user);

    // Non-managers can only edit their own entries
    if (!this.canViewAllEntries(user) && entry.userId !== user.id) {
      throw new TimeEntryNotFoundException(id);
    }

    const oldValues = this.sanitizeForLog(entry);

    // Handle date changes
    const startTime = dto.startTime ? new Date(dto.startTime) : entry.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : entry.endTime;

    // Recalculate duration if times changed
    let durationMinutes = dto.durationMinutes ?? entry.durationMinutes;
    if ((dto.startTime || dto.endTime) && endTime) {
      durationMinutes = this.calculationService.calculateDuration(startTime, endTime);
      const { method, interval } = await this.settingsService.getRoundingConfig(user);
      durationMinutes = this.calculationService.roundDuration(durationMinutes, method, interval);
    }

    // Recalculate amount if needed
    const hourlyRate = dto.hourlyRate ?? entry.hourlyRate;
    const isBillable = dto.isBillable ?? entry.isBillable;
    let totalAmount = entry.totalAmount;
    if (durationMinutes && hourlyRate && isBillable) {
      totalAmount = this.calculationService.calculateTotalAmount(durationMinutes, hourlyRate);
    }

    Object.assign(entry, {
      ...dto,
      startTime,
      endTime,
      durationMinutes,
      hourlyRate,
      totalAmount,
    });

    const savedEntry = await this.entryRepository.save(entry);

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
      throw new TimeEntryNotFoundException(id);
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

    // Check if timer is already running
    const runningEntry = await this.entryRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        isRunning: true,
        isActive: true,
      },
    });

    if (runningEntry) {
      throw new TimerAlreadyRunningException();
    }

    const entry = this.entryRepository.create({
      ...dto,
      startTime: new Date(),
      companyId,
      userId: user.id,
      createdById: user.id,
      status: TimeEntryStatus.DRAFT,
      isRunning: true,
      isBillable: dto.isBillable ?? true,
    });

    const savedEntry = await this.entryRepository.save(entry);

    this.logger.log(`Timer started for user ${user.id} (entry ${savedEntry.id})`);

    return this.findOne(savedEntry.id, user);
  }

  async stopTimer(dto: StopTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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

    const savedEntry = await this.entryRepository.save(runningEntry);

    this.logger.log(
      `Timer stopped for user ${user.id} (entry ${savedEntry.id}, duration: ${durationMinutes}m)`,
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

    // Hard delete running timer
    await this.entryRepository.remove(runningEntry);

    this.logger.log(`Timer discarded for user ${user.id}`);
  }

  async updateTimer(dto: UpdateTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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
      throw new TimeEntryNotFoundException(id);
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

    await this.entryRepository.save(entry);

    this.logger.log(`Time entry ${id} approved by ${user.id}`);

    return this.findOne(id, user);
  }

  async rejectEntry(id: string, rejectionNote: string, user: User): Promise<TimeEntry> {
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

  async bulkApprove(entryIds: string[], user: User): Promise<{ approved: number }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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

    return { approved: result.affected ?? 0 };
  }

  async bulkReject(
    entryIds: string[],
    rejectionNote: string,
    user: User,
  ): Promise<{ rejected: number }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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

    return { rejected: result.affected ?? 0 };
  }

  // ==================== Helper Methods ====================

  private async checkOverlap(
    userId: string,
    companyId: string,
    startTime: Date,
    endTime: Date | null,
    excludeEntryId?: string,
  ): Promise<void> {
    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .where('entry.userId = :userId', { userId })
      .andWhere('entry.companyId = :companyId', { companyId })
      .andWhere('entry.isActive = true');

    if (excludeEntryId) {
      queryBuilder.andWhere('entry.id != :excludeId', { excludeId: excludeEntryId });
    }

    const overlapping = await queryBuilder.getMany();

    for (const entry of overlapping) {
      if (
        this.calculationService.checkOverlap(
          startTime,
          endTime,
          entry.startTime,
          entry.endTime ?? null,
        )
      ) {
        throw new TimeEntryOverlapException();
      }
    }
  }

  private async checkEntryLocked(entry: TimeEntry, user: User): Promise<void> {
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
    };
  }
}
