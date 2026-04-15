import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import {
  applyUpdate,
  Client,
  ErrorMessages,
  MonthlySettlement,
  Task,
  TimeEntry,
  TimeEntryStatus,
  User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { StartTimerDto, StopTimerDto, UpdateTimerDto } from '../dto/timer.dto';
import { TimerAlreadyRunningException, TimerNotRunningException } from '../exceptions';
import { TimeCalculationService } from './time-calculation.service';
import { TimeSettingsService } from './time-settings.service';

@Injectable()
export class TimerService {
  private readonly logger = new Logger(TimerService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly calculationService: TimeCalculationService,
    private readonly settingsService: TimeSettingsService,
    private readonly dataSource: DataSource
  ) {}

  async startTimer(dto: StartTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    if (dto.taskId && dto.settlementId) {
      throw new BadRequestException(ErrorMessages.TIME_TRACKING.TASK_AND_SETTLEMENT_EXCLUSIVE);
    }

    // Validate client/task/settlement ownership to prevent cross-tenant data access
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }
    if (dto.settlementId) {
      await this.validateSettlementOwnership(dto.settlementId, companyId);
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

      return savedEntry;
    } catch (error) {
      // Handle unique constraint violation from the partial index (PostgreSQL error 23505)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        this.logger.warn(`Concurrent timer start detected for user ${user.id}`);
        throw new TimerAlreadyRunningException();
      }
      throw error;
    }
  }

  async stopTimer(dto: StopTimerDto, user: User): Promise<TimeEntry> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
        endTime
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
      `Timer stopped for user ${user.id} (entry ${savedEntry.id}, duration: ${savedEntry.durationMinutes}m)`
    );

    return savedEntry;
  }

  async getActiveTimer(user: User): Promise<TimeEntry | null> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const runningEntry = await this.entryRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        isRunning: true,
        isActive: true,
      },
      relations: ['client', 'task', 'settlement', 'settlement.client'],
    });

    return runningEntry;
  }

  async discardTimer(user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Validate client/task/settlement ownership if being changed
    if (dto.clientId) {
      await this.validateClientOwnership(dto.clientId, companyId);
    }
    if (dto.taskId) {
      await this.validateTaskOwnership(dto.taskId, companyId);
    }
    if (dto.settlementId) {
      await this.validateSettlementOwnership(dto.settlementId, companyId);
    }

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., user updating timer from multiple tabs simultaneously)
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

      // Check mutual exclusivity with effective values
      const effectiveTaskId = dto.taskId !== undefined ? dto.taskId : runningEntry.taskId;
      const effectiveSettlementId =
        dto.settlementId !== undefined ? dto.settlementId : runningEntry.settlementId;
      if (effectiveTaskId && effectiveSettlementId) {
        throw new BadRequestException(ErrorMessages.TIME_TRACKING.TASK_AND_SETTLEMENT_EXCLUSIVE);
      }

      applyUpdate(runningEntry, dto, ['id', 'companyId', 'userId', 'createdAt']);
      return manager.save(runningEntry);
    });

    return savedEntry;
  }

  // ==================== Validation Helpers ====================

  private async validateClientOwnership(clientId: string, companyId: string): Promise<void> {
    const client = await this.dataSource.getRepository(Client).findOne({
      where: { id: clientId, companyId, isActive: true },
    });
    if (!client) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND.CLIENT);
    }
  }

  private async validateTaskOwnership(taskId: string, companyId: string): Promise<void> {
    const task = await this.dataSource.getRepository(Task).findOne({
      where: { id: taskId, companyId, isActive: true },
    });
    if (!task) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND.TASK);
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
      throw new NotFoundException(ErrorMessages.NOT_FOUND.SETTLEMENT);
    }
  }
}
