import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, In, Repository } from 'typeorm';

import {
  ErrorMessages,
  isOwnerOrAdmin,
  TimeEntry,
  TimeEntryStatus,
  User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TimeEntryInvalidStatusException, TimeEntryNotFoundException } from '../exceptions';

@Injectable()
export class TimeEntryApprovalService {
  private readonly logger = new Logger(TimeEntryApprovalService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Ensures user has permission to manage (approve/reject) time entries.
   * Defense-in-depth: validates authorization at service level in addition to guards.
   * @throws ForbiddenException if user is not ADMIN or COMPANY_OWNER
   */
  private ensureCanManageEntries(user: User): void {
    if (!isOwnerOrAdmin(user)) {
      throw new ForbiddenException(ErrorMessages.TIME_TRACKING.CANNOT_MANAGE_ENTRIES);
    }
  }

  async submitEntry(id: string, user: User): Promise<TimeEntry> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., user submitting the same entry from multiple tabs)
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      const entry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.id = :id', { id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .andWhere('entry.userId = :userId', { userId: user.id })
        .andWhere('entry.isActive = :isActive', { isActive: true })
        .getOne();

      if (!entry) {
        throw new TimeEntryNotFoundException();
      }

      if (entry.status !== TimeEntryStatus.DRAFT) {
        throw new TimeEntryInvalidStatusException(entry.status, TimeEntryStatus.SUBMITTED);
      }

      entry.status = TimeEntryStatus.SUBMITTED;
      entry.submittedAt = new Date();

      return manager.save(entry);
    });

    this.logger.log(`Time entry ${id} submitted for approval`);

    return savedEntry;
  }

  async approveEntry(id: string, user: User): Promise<TimeEntry> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., concurrent approve/reject calls for the same entry)
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      const entry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.id = :id', { id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .andWhere('entry.isActive = :isActive', { isActive: true })
        .getOne();

      if (!entry) {
        throw new TimeEntryNotFoundException();
      }

      if (entry.status !== TimeEntryStatus.SUBMITTED) {
        throw new TimeEntryInvalidStatusException(entry.status, TimeEntryStatus.APPROVED);
      }

      entry.status = TimeEntryStatus.APPROVED;
      entry.approvedById = user.id;
      entry.approvedAt = new Date();
      // Auto-lock entry on approval to prevent further modifications
      entry.isLocked = true;
      entry.lockedAt = new Date();
      entry.lockedById = user.id;

      return manager.save(entry);
    });

    this.logger.log(`Time entry ${id} approved and locked by ${user.id}`);

    return savedEntry;
  }

  async rejectEntry(id: string, rejectionNote: string, user: User): Promise<TimeEntry> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Use transaction with pessimistic locking to prevent race conditions
    // (e.g., concurrent approve/reject calls for the same entry)
    const savedEntry = await this.dataSource.transaction(async (manager) => {
      const entry = await manager
        .createQueryBuilder(TimeEntry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.id = :id', { id })
        .andWhere('entry.companyId = :companyId', { companyId })
        .andWhere('entry.isActive = :isActive', { isActive: true })
        .getOne();

      if (!entry) {
        throw new TimeEntryNotFoundException();
      }

      if (entry.status !== TimeEntryStatus.SUBMITTED) {
        throw new TimeEntryInvalidStatusException(entry.status, TimeEntryStatus.REJECTED);
      }

      entry.status = TimeEntryStatus.REJECTED;
      entry.rejectionNote = rejectionNote;
      entry.approvedById = user.id;
      entry.approvedAt = new Date();

      return manager.save(entry);
    });

    this.logger.log(`Time entry ${id} rejected by ${user.id}`);

    return savedEntry;
  }

  async bulkApprove(
    entryIds: string[],
    user: User
  ): Promise<{ approved: number; notFound: number }> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
        isLocked: true,
        lockedAt: new Date(),
        lockedById: user.id,
      }
    );

    return {
      approved: result.affected ?? 0,
      notFound: entryIds.length - validCount,
    };
  }

  async bulkReject(
    entryIds: string[],
    rejectionNote: string,
    user: User
  ): Promise<{ rejected: number; notFound: number }> {
    // Defense-in-depth: validate authorization at service level
    this.ensureCanManageEntries(user);

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
      }
    );

    return {
      rejected: result.affected ?? 0,
      notFound: entryIds.length - validCount,
    };
  }
}
