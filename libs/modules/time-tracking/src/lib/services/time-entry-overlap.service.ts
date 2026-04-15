import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, Repository } from 'typeorm';

import { TimeEntry } from '@accounting/common';

import { TimeEntryOverlapException } from '../exceptions';

/**
 * Far future date used for overlap detection with running timers.
 * Running timers have no endTime (null), but SQL range overlap queries
 * require a date for comparison: (start1 < end2) AND (end1 > start2).
 * Using '9999-12-31' allows detecting overlaps with open-ended entries.
 */
const FAR_FUTURE_DATE = '9999-12-31';

@Injectable()
export class TimeEntryOverlapService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>
  ) {}

  /**
   * Check for overlapping entries without pessimistic locking.
   * Use this only outside transactions for non-critical checks.
   */
  async enforceNoTimeOverlap(
    userId: string,
    companyId: string,
    startTime: Date,
    endTime: Date | null,
    excludeEntryId?: string
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
  async enforceNoTimeOverlapWithLock(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startTime: Date,
    endTime: Date | null,
    excludeEntryId?: string
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
}
