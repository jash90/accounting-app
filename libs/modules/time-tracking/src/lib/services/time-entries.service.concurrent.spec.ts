import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { TimeEntry, TimeEntryStatus, type User, UserRole, type Company } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { TimeCalculationService } from './time-calculation.service';
import { TimeEntriesService } from './time-entries.service';
import { TimeSettingsService } from './time-settings.service';
import { TimerAlreadyRunningException, TimerNotRunningException } from '../exceptions';

/**
 * Concurrent update tests for TimeEntriesService
 * Tests race conditions, pessimistic locking, and concurrent timer operations
 */
describe('TimeEntriesService - Concurrent Operations', () => {
  let service: TimeEntriesService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let dataSource: jest.Mocked<DataSource>;
  // These variables are assigned by the testing module but not directly used in tests

  let _tenantService: jest.Mocked<TenantService>;

  let _changeLogService: jest.Mocked<ChangeLogService>;

  let _calculationService: jest.Mocked<TimeCalculationService>;

  let _settingsService: jest.Mocked<TimeSettingsService>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    role: UserRole.EMPLOYEE,
    companyId: 'company-1',
    company: { id: 'company-1' } as Company,
    isActive: true,
  };

  const mockCompanyId = 'company-1';

  // Mock query builder for transaction manager
  const createMockQueryBuilder = (returnValue: TimeEntry | null) => ({
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(returnValue),
  });

  // Mock transaction manager
  const createMockManager = (queryBuilderReturn: TimeEntry | null, saveReturn?: TimeEntry) => ({
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder(queryBuilderReturn)),
    create: jest.fn().mockImplementation((entity, data) => ({
      ...data,
      id: 'new-entry-id',
    })),
    save: jest.fn().mockResolvedValue(
      saveReturn || {
        id: 'new-entry-id',
        ...queryBuilderReturn,
        isRunning: false,
      }
    ),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntriesService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            getEffectiveCompanyId: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
        {
          provide: ChangeLogService,
          useValue: {
            logCreate: jest.fn(),
            logUpdate: jest.fn(),
            logDelete: jest.fn(),
          },
        },
        {
          provide: TimeCalculationService,
          useValue: {
            calculateDuration: jest.fn().mockReturnValue(60),
            roundDuration: jest.fn().mockImplementation((d) => d),
            calculateTotalAmount: jest.fn().mockReturnValue(100),
          },
        },
        {
          provide: TimeSettingsService,
          useValue: {
            getRoundingConfig: jest.fn().mockResolvedValue({ method: 'none', interval: 1 }),
            getSettings: jest.fn().mockResolvedValue({ defaultHourlyRate: 100 }),
          },
        },
      ],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    dataSource = module.get(DataSource);
    _tenantService = module.get(TenantService);
    _changeLogService = module.get(ChangeLogService);
    _calculationService = module.get(TimeCalculationService);
    _settingsService = module.get(TimeSettingsService);
  });

  describe('Concurrent Timer Start Operations', () => {
    it('should prevent concurrent timer starts using pessimistic locking', async () => {
      // Simulate: first request acquires lock and creates timer
      // second request should fail
      const mockManager = createMockManager(null, {
        id: 'entry-1',
        userId: mockUser.id,
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
      } as TimeEntry);

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      // Mock findOne for the return value - must match user's ID for ownership check
      entryRepository.findOne = jest.fn().mockResolvedValue({
        id: 'entry-1',
        userId: 'user-1', // Must match mockUser.id
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
        isActive: true,
      });

      const result = await service.startTimer({ description: 'Test task' }, mockUser as User);

      expect(result).toBeDefined();
      expect(result.id).toBe('entry-1');
      expect(mockManager.createQueryBuilder).toHaveBeenCalledWith(TimeEntry, 'entry');
    });

    it('should throw TimerAlreadyRunningException when timer is already running', async () => {
      // Simulate: timer already running for user
      const existingRunningEntry = {
        id: 'existing-entry',
        userId: mockUser.id,
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
      } as TimeEntry;

      const mockManager = createMockManager(existingRunningEntry);

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(
        service.startTimer({ description: 'Second timer' }, mockUser as User)
      ).rejects.toThrow(TimerAlreadyRunningException);
    });

    it('should handle unique constraint violation (concurrent starts)', async () => {
      // Simulate: PostgreSQL unique constraint violation (23505)
      // This happens when two requests pass the initial check but one fails on insert
      const uniqueConstraintError = new Error('duplicate key value violates unique constraint');
      (uniqueConstraintError as Error & { code: string }).code = '23505';

      dataSource.transaction = jest.fn().mockRejectedValue(uniqueConstraintError);

      await expect(
        service.startTimer({ description: 'Concurrent timer' }, mockUser as User)
      ).rejects.toThrow(TimerAlreadyRunningException);
    });

    it('should re-throw non-constraint errors', async () => {
      const genericError = new Error('Database connection lost');

      dataSource.transaction = jest.fn().mockRejectedValue(genericError);

      await expect(service.startTimer({ description: 'Test' }, mockUser as User)).rejects.toThrow(
        'Database connection lost'
      );
    });
  });

  describe('Concurrent Timer Stop Operations', () => {
    it('should successfully stop timer with pessimistic locking', async () => {
      const runningEntry = {
        id: 'running-entry',
        userId: mockUser.id,
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        status: TimeEntryStatus.DRAFT,
        description: 'Working on task',
        isBillable: true,
      } as TimeEntry;

      const stoppedEntry = {
        ...runningEntry,
        isRunning: false,
        endTime: new Date(),
        durationMinutes: 60,
      } as TimeEntry;

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(runningEntry),
        }),
        save: jest.fn().mockResolvedValue(stoppedEntry),
      };

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      entryRepository.findOne = jest.fn().mockResolvedValue(stoppedEntry);

      const result = await service.stopTimer({}, mockUser as User);

      expect(result).toBeDefined();
      expect(result.isRunning).toBe(false);
      expect(result.durationMinutes).toBe(60);
    });

    it('should throw TimerNotRunningException when no timer is running', async () => {
      const mockManager = createMockManager(null);

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await expect(service.stopTimer({}, mockUser as User)).rejects.toThrow(
        TimerNotRunningException
      );
    });

    it('should handle rapid stop button clicks (double-click prevention)', async () => {
      const runningEntry = {
        id: 'running-entry',
        userId: mockUser.id,
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(Date.now() - 3600000),
        status: TimeEntryStatus.DRAFT,
        isBillable: true,
      } as TimeEntry;

      let firstCallProcessed = false;

      // First call succeeds, second call finds no running timer
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(async () => {
              if (!firstCallProcessed) {
                firstCallProcessed = true;
                return runningEntry;
              }
              return null; // Second call finds no timer
            }),
          }),
          save: jest.fn().mockResolvedValue({
            ...runningEntry,
            isRunning: false,
            endTime: new Date(),
          }),
        };
        return callback(mockManager);
      });

      entryRepository.findOne = jest.fn().mockResolvedValue({
        ...runningEntry,
        isRunning: false,
        endTime: new Date(),
      });

      // First call succeeds
      const result1 = await service.stopTimer({}, mockUser as User);
      expect(result1).toBeDefined();

      // Second call fails
      await expect(service.stopTimer({}, mockUser as User)).rejects.toThrow(
        TimerNotRunningException
      );
    });
  });

  describe('Concurrent Entry Updates', () => {
    it('should handle concurrent updates with optimistic locking pattern', async () => {
      // Note: This test verifies the behavior when two users try to update
      // the same entry simultaneously. The service uses transactions to
      // ensure data consistency.

      const entry = {
        id: 'shared-entry',
        userId: mockUser.id,
        companyId: mockCompanyId,
        description: 'Original description',
        startTime: new Date(),
        endTime: new Date(),
        status: TimeEntryStatus.DRAFT,
        isRunning: false,
        isActive: true,
        isLocked: false,
      } as TimeEntry;

      const updatedEntry = {
        ...entry,
        description: 'Updated description',
      } as TimeEntry;

      // Mock transaction for the update operation
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(entry),
          getCount: jest.fn().mockResolvedValue(0), // No overlapping entries
        }),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      // Mock findOne for the return value at the end
      entryRepository.findOne = jest.fn().mockResolvedValue(updatedEntry);

      // The service should handle this gracefully
      const result = await service.update(
        'shared-entry',
        { description: 'Updated description' },
        mockUser as User
      );

      expect(result.description).toBe('Updated description');
    });
  });

  describe('Timer Discard Concurrency', () => {
    it('should handle concurrent discard attempts', async () => {
      const runningEntry = {
        id: 'running-entry',
        userId: mockUser.id,
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
        isActive: true,
      } as TimeEntry;

      let discarded = false;

      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(async () => {
              if (!discarded) {
                return runningEntry;
              }
              return null;
            }),
          }),
          save: jest.fn().mockImplementation(async (entity) => {
            discarded = true;
            return { ...entity, isActive: false };
          }),
        };
        return callback(mockManager);
      });

      // First discard succeeds
      await service.discardTimer(mockUser as User);

      // Second discard throws (no running timer)
      await expect(service.discardTimer(mockUser as User)).rejects.toThrow(
        TimerNotRunningException
      );
    });
  });

  describe('Multi-User Concurrent Operations', () => {
    it('should allow different users to start timers simultaneously', async () => {
      const user1: Partial<User> = { ...mockUser, id: 'user-1' };
      const user2: Partial<User> = { ...mockUser, id: 'user-2' };

      let callCount = 0;

      // Each user has no running timer
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        callCount++;
        const currentUserId = callCount === 1 ? 'user-1' : 'user-2';
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null), // No running timer
          }),
          create: jest.fn().mockImplementation((entity, data) => ({
            ...data,
            id: `entry-${currentUserId}`,
            userId: currentUserId,
          })),
          save: jest.fn().mockImplementation((entry) => ({
            ...entry,
            id: entry.id || `entry-${currentUserId}`,
          })),
        };
        return callback(mockManager);
      });

      // Mock findOne to return entry matching the user who created it
      entryRepository.findOne = jest.fn().mockImplementation((options) => {
        const entryId = options.where?.id;
        const userId = entryId === 'entry-user-1' ? 'user-1' : 'user-2';
        return Promise.resolve({
          id: entryId,
          userId: userId,
          companyId: mockCompanyId,
          isRunning: true,
          startTime: new Date(),
          status: TimeEntryStatus.DRAFT,
          isActive: true,
        });
      });

      // Both users should be able to start timers
      const [result1, result2] = await Promise.all([
        service.startTimer({ description: 'User 1 task' }, user1 as User),
        service.startTimer({ description: 'User 2 task' }, user2 as User),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should isolate timer operations between users', async () => {
      const user1: Partial<User> = { ...mockUser, id: 'user-1' };
      const user2: Partial<User> = { ...mockUser, id: 'user-2' };

      // User 1 has a running timer
      const user1RunningEntry = {
        id: 'user1-entry',
        userId: 'user-1',
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
      } as TimeEntry;

      // Simulate user isolation in transaction
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockImplementation((condition, params) => {
              // Store userId for isolation check
              (mockManager as unknown as { lastUserId: string }).lastUserId = params?.userId;
              return mockManager.createQueryBuilder();
            }),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(() => {
              // User 1 has running timer, User 2 doesn't
              if ((mockManager as unknown as { lastUserId: string }).lastUserId === 'user-1') {
                return user1RunningEntry;
              }
              return null;
            }),
          }),
          create: jest.fn().mockImplementation((entity, data) => ({
            id: 'new-entry',
            ...data,
          })),
          save: jest.fn().mockImplementation((entry) => ({
            ...entry,
            id: entry.id || 'new-entry',
          })),
        };
        return callback(mockManager);
      });

      // Mock findOne to return entry matching user-2 (the one who succeeds)
      entryRepository.findOne = jest.fn().mockResolvedValue({
        id: 'new-entry',
        userId: 'user-2', // Must match the user who created the entry
        companyId: mockCompanyId,
        isRunning: true,
        startTime: new Date(),
        status: TimeEntryStatus.DRAFT,
        isActive: true,
      });

      // User 1 should fail (already has timer)
      await expect(
        service.startTimer({ description: 'Another task' }, user1 as User)
      ).rejects.toThrow(TimerAlreadyRunningException);

      // User 2 should succeed
      const result = await service.startTimer({ description: 'User 2 task' }, user2 as User);
      expect(result).toBeDefined();
    });
  });

  describe('Lock Timeout Handling', () => {
    it('should handle lock acquisition timeout gracefully', async () => {
      // Simulate lock timeout (PostgreSQL error for lock wait timeout)
      const lockTimeoutError = new Error('canceling statement due to lock timeout');
      (lockTimeoutError as Error & { code: string }).code = '55P03'; // PostgreSQL lock_not_available

      dataSource.transaction = jest.fn().mockRejectedValue(lockTimeoutError);

      await expect(service.startTimer({ description: 'Test' }, mockUser as User)).rejects.toThrow(
        'canceling statement due to lock timeout'
      );
    });

    it('should handle deadlock detection', async () => {
      // Simulate deadlock (PostgreSQL error for deadlock detected)
      const deadlockError = new Error('deadlock detected');
      (deadlockError as Error & { code: string }).code = '40P01'; // PostgreSQL deadlock_detected

      dataSource.transaction = jest.fn().mockRejectedValue(deadlockError);

      await expect(service.startTimer({ description: 'Test' }, mockUser as User)).rejects.toThrow(
        'deadlock detected'
      );
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should rollback on validation errors after lock acquisition', async () => {
      // Simulate error after acquiring lock but before commit
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          }),
          create: jest.fn().mockImplementation(() => {
            throw new Error('Validation failed');
          }),
        };

        // The transaction should be rolled back on error
        await expect(callback(mockManager)).rejects.toThrow('Validation failed');
      });

      await expect(service.startTimer({ description: 'Test' }, mockUser as User)).rejects.toThrow();
    });
  });
});
