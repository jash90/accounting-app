import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { TimeEntry, TimeEntryStatus, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { TimerAlreadyRunningException, TimerNotRunningException } from '../exceptions';
import { TimeCalculationService } from './time-calculation.service';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntryApprovalService } from './time-entry-approval.service';
import { TimeEntryLockingService } from './time-entry-locking.service';
import { TimeEntryOverlapService } from './time-entry-overlap.service';
import { TimeSettingsService } from './time-settings.service';
import { TimerService } from './timer.service';

/**
 * Concurrent operation tests for TimeEntriesService
 *
 * Since timer/approval/locking/overlap operations are now delegated to sub-services,
 * these tests verify that TimeEntriesService correctly delegates and handles
 * concurrent scenarios at the facade level.
 */
describe('TimeEntriesService - Concurrent Operations', () => {
  let service: TimeEntriesService;
  let mockTimerService: Record<string, jest.Mock>;
  let mockApprovalService: Record<string, jest.Mock>;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;

  const mockCompanyId = 'company-123';
  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'user@test.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
  };

  const mockRunningEntry = {
    id: 'running-entry',
    userId: 'user-1',
    companyId: mockCompanyId,
    isRunning: true,
    startTime: new Date(),
    status: TimeEntryStatus.DRAFT,
    isActive: true,
  } as TimeEntry;

  beforeEach(async () => {
    mockTimerService = {
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
      getActiveTimer: jest.fn(),
      discardTimer: jest.fn(),
      updateTimer: jest.fn(),
    };

    mockApprovalService = {
      submitEntry: jest.fn(),
      approveEntry: jest.fn(),
      rejectEntry: jest.fn(),
      bulkApprove: jest.fn(),
    };

    const mockLockingService = {
      enforceEntryNotLocked: jest.fn(),
      enforceMonthNotLocked: jest.fn(),
      isMonthLocked: jest.fn().mockResolvedValue(false),
    };

    const mockOverlapService = {
      checkOverlap: jest.fn(),
      validateNoOverlap: jest.fn(),
    };

    const mockEntryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    const mockSystemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(mockCompanyId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TimeEntriesService,
          useFactory: () =>
            new TimeEntriesService(
              mockEntryRepository as any,
              { log: jest.fn() } as any, // ChangeLogService
              mockSystemCompanyService as any,
              new TimeCalculationService(),
              {
                getSettings: jest
                  .fn()
                  .mockResolvedValue({ allowOverlappingEntries: true, lockEntriesAfterDays: 0 }),
                getRoundingConfig: jest.fn().mockResolvedValue({ method: 'none', interval: 15 }),
                allowsOverlapping: jest.fn().mockResolvedValue(true),
              } as any,
              { transaction: jest.fn() } as any, // DataSource
              mockTimerService as any,
              mockApprovalService as any,
              mockLockingService as any,
              mockOverlapService as any
            ),
        },
        { provide: getRepositoryToken(TimeEntry), useValue: mockEntryRepository },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: ChangeLogService, useValue: { log: jest.fn() } },
        { provide: SystemCompanyService, useValue: mockSystemCompanyService },
        { provide: TimeCalculationService, useClass: TimeCalculationService },
        { provide: TimeSettingsService, useValue: {} },
        { provide: TimerService, useValue: mockTimerService },
        { provide: TimeEntryApprovalService, useValue: mockApprovalService },
        { provide: TimeEntryLockingService, useValue: mockLockingService },
        { provide: TimeEntryOverlapService, useValue: mockOverlapService },
      ],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
  });

  describe('Concurrent Timer Start Operations', () => {
    it('should delegate startTimer to timerService', async () => {
      mockTimerService.startTimer.mockResolvedValue(mockRunningEntry);
      entryRepository.findOne = jest.fn().mockResolvedValue(mockRunningEntry);

      const result = await service.startTimer({ description: 'Test' }, mockUser as User);

      expect(mockTimerService.startTimer).toHaveBeenCalledWith({ description: 'Test' }, mockUser);
      expect(result).toBeDefined();
    });

    it('should propagate TimerAlreadyRunningException from timerService', async () => {
      mockTimerService.startTimer.mockRejectedValue(new TimerAlreadyRunningException());

      await expect(
        service.startTimer({ description: 'Second timer' }, mockUser as User)
      ).rejects.toThrow();
    });

    it('should handle concurrent startTimer calls via timerService', async () => {
      // First call succeeds, second throws (TimerAlreadyRunning)
      mockTimerService.startTimer
        .mockResolvedValueOnce(mockRunningEntry)
        .mockRejectedValueOnce(new TimerAlreadyRunningException());

      entryRepository.findOne = jest.fn().mockResolvedValue(mockRunningEntry);

      const result1 = await service.startTimer({ description: 'First' }, mockUser as User);
      expect(result1).toBeDefined();

      await expect(
        service.startTimer({ description: 'Second' }, mockUser as User)
      ).rejects.toThrow();
    });

    it('should propagate database errors from timerService', async () => {
      const dbError = new Error('Connection timeout');
      mockTimerService.startTimer.mockRejectedValue(dbError);

      await expect(
        service.startTimer({ description: 'Test' }, mockUser as User)
      ).rejects.toHaveProperty('message', 'Connection timeout');
    });
  });

  describe('Concurrent Timer Stop Operations', () => {
    it('should delegate stopTimer to timerService', async () => {
      const stoppedEntry = {
        ...mockRunningEntry,
        isRunning: false,
        endTime: new Date(),
        durationMinutes: 60,
      };
      mockTimerService.stopTimer.mockResolvedValue(stoppedEntry);
      entryRepository.findOne = jest.fn().mockResolvedValue(stoppedEntry);

      const result = await service.stopTimer({}, mockUser as User);

      expect(mockTimerService.stopTimer).toHaveBeenCalledWith({}, mockUser);
      expect(result.isRunning).toBe(false);
    });

    it('should propagate TimerNotRunningException from timerService', async () => {
      mockTimerService.stopTimer.mockRejectedValue(new TimerNotRunningException());

      await expect(service.stopTimer({}, mockUser as User)).rejects.toThrow();
    });

    it('should handle rapid stop clicks (double-click prevention) via timerService', async () => {
      const stoppedEntry = { ...mockRunningEntry, isRunning: false };
      mockTimerService.stopTimer
        .mockResolvedValueOnce(stoppedEntry)
        .mockRejectedValueOnce(new TimerNotRunningException());

      entryRepository.findOne = jest.fn().mockResolvedValue(stoppedEntry);

      const result1 = await service.stopTimer({}, mockUser as User);
      expect(result1).toBeDefined();

      await expect(service.stopTimer({}, mockUser as User)).rejects.toThrow();
    });
  });

  describe('Timer Discard Concurrency', () => {
    it('should delegate discardTimer to timerService', async () => {
      mockTimerService.discardTimer.mockResolvedValue(undefined);

      await service.discardTimer(mockUser as User);

      expect(mockTimerService.discardTimer).toHaveBeenCalledWith(mockUser);
    });

    it('should handle concurrent discard attempts', async () => {
      mockTimerService.discardTimer
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new TimerNotRunningException());

      await service.discardTimer(mockUser as User);

      await expect(service.discardTimer(mockUser as User)).rejects.toThrow();
    });
  });

  describe('Multi-User Concurrent Operations', () => {
    it('should allow different users to start timers simultaneously', async () => {
      const user2: Partial<User> = { ...mockUser, id: 'user-2' };

      const entry1 = { ...mockRunningEntry, id: 'entry-1', userId: 'user-1' };
      const entry2 = { ...mockRunningEntry, id: 'entry-2', userId: 'user-2' };

      mockTimerService.startTimer.mockResolvedValueOnce(entry1).mockResolvedValueOnce(entry2);

      // findOne is called after startTimer to reload entry with relations
      entryRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(entry2);

      const [result1, result2] = await Promise.all([
        service.startTimer({ description: 'User 1 task' }, mockUser as User),
        service.startTimer({ description: 'User 2 task' }, user2 as User),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(mockTimerService.startTimer).toHaveBeenCalledTimes(2);
    });

    it('should isolate timer operations between users', async () => {
      const user2: Partial<User> = { ...mockUser, id: 'user-2' };
      const entry2 = { ...mockRunningEntry, id: 'entry-2', userId: 'user-2' };

      // User 1 already has timer, user 2 doesn't
      mockTimerService.startTimer
        .mockRejectedValueOnce(new TimerAlreadyRunningException())
        .mockResolvedValueOnce(entry2);

      entryRepository.findOne = jest.fn().mockResolvedValue(entry2);

      await expect(
        service.startTimer({ description: 'Another task' }, mockUser as User)
      ).rejects.toThrow();

      const result = await service.startTimer({ description: 'User 2 task' }, user2 as User);
      expect(result).toBeDefined();
    });
  });

  describe('Lock Timeout Handling', () => {
    it('should propagate lock timeout errors from timerService', async () => {
      const lockTimeoutError = new Error('canceling statement due to lock timeout');
      mockTimerService.startTimer.mockRejectedValue(lockTimeoutError);

      await expect(
        service.startTimer({ description: 'Test' }, mockUser as User)
      ).rejects.toHaveProperty('message', 'canceling statement due to lock timeout');
    });

    it('should propagate deadlock errors from timerService', async () => {
      const deadlockError = new Error('deadlock detected');
      mockTimerService.startTimer.mockRejectedValue(deadlockError);

      await expect(
        service.startTimer({ description: 'Test' }, mockUser as User)
      ).rejects.toHaveProperty('message', 'deadlock detected');
    });
  });
});
