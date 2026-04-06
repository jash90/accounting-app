import { sanitizeForLog } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { isOwnerOrAdmin, TimeEntry, User } from '@accounting/common';

import { TimeEntryLockedException, TimeEntryUnlockNotAuthorizedException } from '../exceptions';
import { TimeSettingsService } from './time-settings.service';

@Injectable()
export class TimeEntryLockingService {
  private readonly logger = new Logger(TimeEntryLockingService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly changeLogService: ChangeLogService,
    private readonly settingsService: TimeSettingsService
  ) {}

  async lockEntry(entry: TimeEntry, user: User, reason?: string): Promise<TimeEntry> {
    // Only managers can lock entries
    if (!isOwnerOrAdmin(user)) {
      throw new TimeEntryUnlockNotAuthorizedException();
    }

    if (entry.isLocked) {
      // Already locked, return as-is
      return entry;
    }

    const oldValues = this.sanitizeTimeEntryForLog(entry);

    entry.isLocked = true;
    entry.lockedAt = new Date();
    entry.lockedById = user.id;

    const savedEntry = await this.entryRepository.save(entry);

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeTimeEntryForLog(savedEntry),
      user
    );

    this.logger.log(`Time entry ${entry.id} locked by ${user.id}${reason ? `: ${reason}` : ''}`);

    return savedEntry;
  }

  async unlockEntry(entry: TimeEntry, user: User, reason?: string): Promise<TimeEntry> {
    // Only ADMIN/COMPANY_OWNER can unlock
    if (!isOwnerOrAdmin(user)) {
      throw new TimeEntryUnlockNotAuthorizedException();
    }

    if (!entry.isLocked) {
      // Already unlocked, return as-is
      return entry;
    }

    const oldValues = this.sanitizeTimeEntryForLog(entry);

    entry.isLocked = false;
    entry.lockedAt = null as unknown as undefined;
    entry.lockedById = null as unknown as undefined;

    const savedEntry = await this.entryRepository.save(entry);

    await this.changeLogService.logUpdate(
      'TimeEntry',
      savedEntry.id,
      oldValues,
      this.sanitizeTimeEntryForLog(savedEntry),
      user
    );

    this.logger.log(`Time entry ${entry.id} unlocked by ${user.id}${reason ? `: ${reason}` : ''}`);

    return savedEntry;
  }

  /**
   * Checks if an entry is locked (explicitly or by age-based policy).
   * @throws TimeEntryLockedException if entry is locked
   */
  async enforceEntryNotLocked(entry: TimeEntry, user: User): Promise<void> {
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
