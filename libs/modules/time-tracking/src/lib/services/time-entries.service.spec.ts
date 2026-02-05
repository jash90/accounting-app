import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import {
  TimeEntry,
  TimeEntryStatus,
  TimeRoundingMethod,
  UserRole,
  type User,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { type CreateTimeEntryDto, type UpdateTimeEntryDto } from '../dto/time-entry.dto';
import { type StartTimerDto, type StopTimerDto } from '../dto/timer.dto';
import {
  TimeEntryInvalidStatusException,
  TimeEntryLockedException,
  TimeEntryNotFoundException,
  TimerAlreadyRunningException,
  TimerNotRunningException,
} from '../exceptions';
import { TimeCalculationService } from './time-calculation.service';
import { TimeEntriesService } from './time-entries.service';
import { TimeSettingsService } from './time-settings.service';

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let dataSource: jest.Mocked<DataSource>;
  let changeLogService: jest.Mocked<ChangeLogService>;
  let tenantService: jest.Mocked<TenantService>;
  let _calculationService: TimeCalculationService;
  let settingsService: jest.Mocked<TimeSettingsService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockEntryId = 'entry-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
  };

  const mockOwner: Partial<User> = {
    id: 'owner-123',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockTimeEntry: Partial<TimeEntry> = {
    id: mockEntryId,
    description: 'Test entry',
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    durationMinutes: 120,
    isRunning: false,
    isBillable: true,
    status: TimeEntryStatus.DRAFT,
    companyId: mockCompanyId,
    userId: mockUserId,
    createdById: mockUserId,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockRunningEntry: Partial<TimeEntry> = {
    id: 'running-entry-123',
    description: 'Running timer',
    startTime: new Date('2024-01-15T09:00:00Z'),
    isRunning: true,
    isBillable: true,
    status: TimeEntryStatus.DRAFT,
    companyId: mockCompanyId,
    userId: mockUserId,
    createdById: mockUserId,
    isActive: true,
  };

  const mockSettings = {
    id: 'settings-123',
    companyId: mockCompanyId,
    roundingMethod: TimeRoundingMethod.NONE,
    roundingIntervalMinutes: 15,
    defaultHourlyRate: 100,
    lockEntriesAfterDays: 0,
    allowOverlappingEntries: true,
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTimeEntry], 1]),
  });

  const createMockEntityManager = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'new-entry-id' })),
    save: jest
      .fn()
      .mockImplementation((entry) => Promise.resolve({ ...entry, id: entry.id || 'new-entry-id' })),
  });

  // Create mocks at module level for proper instantiation
  const mockChangeLogService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
    getRoundingConfig: jest.fn(),
    allowsOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
    mockSettingsService.getSettings.mockResolvedValue(mockSettings);
    mockSettingsService.getRoundingConfig.mockResolvedValue({
      method: TimeRoundingMethod.NONE,
      interval: 15,
    });
    mockSettingsService.allowsOverlapping.mockResolvedValue(true);

    const mockQueryBuilder = createMockQueryBuilder();
    const mockEntityManager = createMockEntityManager();

    const mockEntryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // Use useFactory to manually wire dependencies (needed for Bun which doesn't emit decorator metadata)
        {
          provide: TimeEntriesService,
          useFactory: () => {
            return new TimeEntriesService(
              mockEntryRepository as any,
              mockChangeLogService as any,
              mockTenantService as any,
              new TimeCalculationService(),
              mockSettingsService as any,
              mockDataSource as any
            );
          },
        },
        TimeCalculationService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockEntryRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ChangeLogService,
          useValue: mockChangeLogService,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: TimeSettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    dataSource = module.get(DataSource);
    changeLogService = module.get(ChangeLogService);
    tenantService = module.get(TenantService);
    _calculationService = module.get(TimeCalculationService);
    settingsService = module.get(TimeSettingsService);
  });

  describe('findAll', () => {
    it('should return paginated time entries for user', async () => {
      const result = await service.findAll(mockUser as User);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by userId for non-managers', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.userId = :userId', {
        userId: mockUserId,
      });
    });

    it('should allow managers to see all entries', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockOwner as User);

      // Should not filter by userId for managers
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'entry.userId = :userId',
        expect.any(Object)
      );
    });

    it('should apply search filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { search: 'test%value' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%test\\%value%' })
      );
    });

    it('should apply status filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { status: TimeEntryStatus.APPROVED });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.status = :status', {
        status: TimeEntryStatus.APPROVED,
      });
    });

    it('should apply pagination correctly', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should use default pagination values', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    it('should return time entry when found', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(mockTimeEntry);

      const result = await service.findOne(mockEntryId, mockUser as User);

      expect(result).toEqual(mockTimeEntry);
      expect(entryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEntryId, companyId: mockCompanyId },
        relations: expect.arrayContaining(['user', 'client', 'task']),
      });
    });

    it('should throw TimeEntryNotFoundException when not found', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryNotFoundException
      );
    });

    it('should throw when non-manager tries to access another user entry', async () => {
      const otherUserEntry = { ...mockTimeEntry, userId: 'other-user-123' };
      entryRepository.findOne = jest.fn().mockResolvedValue(otherUserEntry);

      await expect(service.findOne(mockEntryId, mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryNotFoundException
      );
    });

    it('should allow manager to access any user entry', async () => {
      const otherUserEntry = { ...mockTimeEntry, userId: 'other-user-123' };
      entryRepository.findOne = jest.fn().mockResolvedValue(otherUserEntry);

      const result = await service.findOne(mockEntryId, mockOwner as User);

      expect(result).toEqual(otherUserEntry);
    });
  });

  describe('create', () => {
    const createDto: CreateTimeEntryDto = {
      description: 'New entry',
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
      isBillable: true,
    };

    it('should create time entry with calculated duration', async () => {
      const savedEntry = { ...mockTimeEntry, ...createDto, id: 'new-entry-id' };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue(savedEntry),
        save: jest.fn().mockResolvedValue(savedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      const result = await service.create(createDto, mockUser as User);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.create).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual(savedEntry);
    });

    it('should log creation to changelog', async () => {
      const savedEntry = { ...mockTimeEntry, ...createDto, id: 'new-entry-id' };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue(savedEntry),
        save: jest.fn().mockResolvedValue(savedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      await service.create(createDto, mockUser as User);

      expect(changeLogService.logCreate).toHaveBeenCalledWith(
        'TimeEntry',
        expect.any(String),
        expect.any(Object),
        mockUser
      );
    });

    it('should use default billable setting', async () => {
      const dtoWithoutBillable = { ...createDto };
      delete dtoWithoutBillable.isBillable;

      const savedEntry = { ...mockTimeEntry, isBillable: true, id: 'new-entry-id' };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue(savedEntry),
        save: jest.fn().mockResolvedValue(savedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      await service.create(dtoWithoutBillable, mockUser as User);

      expect(mockEntityManager.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateTimeEntryDto = {
      description: 'Updated description',
    };

    it('should update time entry', async () => {
      const existingEntry = { ...mockTimeEntry };
      const updatedEntry = { ...existingEntry, ...updateDto };

      // Mock findOne to return existing entry first, then updated entry after save
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(existingEntry);
        return Promise.resolve(updatedEntry);
      });

      // Transaction mock with entity manager
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(existingEntry);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      const result = await service.update(mockEntryId, updateDto, mockUser as User);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result.description).toBe('Updated description');
    });

    it('should throw when entry not found', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockUser as User)
      ).rejects.toBeInstanceOf(TimeEntryNotFoundException);
    });

    it('should throw when non-manager tries to update another user entry', async () => {
      const otherUserEntry = { ...mockTimeEntry, userId: 'other-user-123' };
      entryRepository.findOne = jest.fn().mockResolvedValue(otherUserEntry);

      await expect(service.update(mockEntryId, updateDto, mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryNotFoundException
      );
    });

    it('should log update to changelog', async () => {
      const existingEntry = { ...mockTimeEntry };
      const updatedEntry = { ...existingEntry, ...updateDto };

      // Mock findOne to return existing entry first, then updated entry after save
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(existingEntry);
        return Promise.resolve(updatedEntry);
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(existingEntry);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await service.update(mockEntryId, updateDto, mockUser as User);

      expect(changeLogService.logUpdate).toHaveBeenCalledWith(
        'TimeEntry',
        mockEntryId,
        expect.any(Object),
        expect.any(Object),
        mockUser
      );
    });
  });

  describe('remove', () => {
    it('should soft delete time entry', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue({ ...mockTimeEntry });
      entryRepository.save = jest.fn().mockResolvedValue({ ...mockTimeEntry, isActive: false });

      await service.remove(mockEntryId, mockUser as User);

      expect(entryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should throw when entry not found', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryNotFoundException
      );
    });

    it('should log deletion to changelog', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue({ ...mockTimeEntry });
      entryRepository.save = jest.fn().mockResolvedValue({ ...mockTimeEntry, isActive: false });

      await service.remove(mockEntryId, mockUser as User);

      expect(changeLogService.logDelete).toHaveBeenCalledWith(
        'TimeEntry',
        mockEntryId,
        expect.any(Object),
        mockUser
      );
    });
  });

  describe('startTimer', () => {
    const startDto: StartTimerDto = {
      description: 'New timer',
    };

    it('should start a new timer successfully', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      const savedEntry = {
        ...mockRunningEntry,
        description: startDto.description,
        id: 'new-entry-id',
      };
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      const result = await service.startTimer(startDto, mockUser as User);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
    });

    it('should throw TimerAlreadyRunningException when timer is already running', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(mockRunningEntry);
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.startTimer(startDto, mockUser as User)).rejects.toBeInstanceOf(
        TimerAlreadyRunningException
      );
    });

    it('should use pessimistic locking', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'new-entry-id' })),
        save: jest.fn().mockImplementation((entry) => Promise.resolve({ ...entry })),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest
        .fn()
        .mockResolvedValue({ ...mockRunningEntry, id: 'new-entry-id' });

      await service.startTimer(startDto, mockUser as User);

      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('should set correct default values for new timer', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      const savedEntry = { ...mockRunningEntry, id: 'new-entry-id' };
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      await service.startTimer(startDto, mockUser as User);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        TimeEntry,
        expect.objectContaining({
          isRunning: true,
          status: TimeEntryStatus.DRAFT,
          userId: mockUserId,
          companyId: mockCompanyId,
        })
      );
    });
  });

  describe('stopTimer', () => {
    const stopDto: StopTimerDto = {
      description: 'Final notes',
    };

    it('should stop running timer and calculate duration', async () => {
      const stoppedEntry = {
        ...mockRunningEntry,
        isRunning: false,
        endTime: new Date(),
        durationMinutes: 60,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockRunningEntry);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(stoppedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(stoppedEntry);

      const result = await service.stopTimer(stopDto, mockUser as User);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: false,
        })
      );
      expect(result.isRunning).toBe(false);
    });

    it('should throw TimerNotRunningException when no timer is running', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn(),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.stopTimer(stopDto, mockUser as User)).rejects.toBeInstanceOf(
        TimerNotRunningException
      );
    });

    it('should append description to existing description', async () => {
      const runningWithDescription = {
        ...mockRunningEntry,
        description: 'Initial',
      };
      const stoppedEntry = {
        ...runningWithDescription,
        description: 'Initial Final notes',
        isRunning: false,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(runningWithDescription);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(stoppedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(stoppedEntry);

      await service.stopTimer(stopDto, mockUser as User);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Initial Final notes',
        })
      );
    });
  });

  describe('getActiveTimer', () => {
    it('should return running timer for user', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(mockRunningEntry);

      const result = await service.getActiveTimer(mockUser as User);

      expect(result).toEqual(mockRunningEntry);
      expect(entryRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          companyId: mockCompanyId,
          isRunning: true,
          isActive: true,
        },
        relations: ['client', 'task'],
      });
    });

    it('should return null when no timer is running', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.getActiveTimer(mockUser as User);

      expect(result).toBeNull();
    });
  });

  describe('discardTimer', () => {
    it('should soft delete running timer', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue({ ...mockRunningEntry });
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest
          .fn()
          .mockResolvedValue({ ...mockRunningEntry, isActive: false, isRunning: false }),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await service.discardTimer(mockUser as User);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          isRunning: false,
        })
      );
    });

    it('should throw TimerNotRunningException when no timer is running', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn(),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.discardTimer(mockUser as User)).rejects.toBeInstanceOf(
        TimerNotRunningException
      );
    });
  });

  describe('submitEntry', () => {
    it('should submit draft entry for approval', async () => {
      const draftEntry = { ...mockTimeEntry, status: TimeEntryStatus.DRAFT };
      const submittedEntry = { ...draftEntry, status: TimeEntryStatus.SUBMITTED };

      // Mock findOne to return draft entry first, then submitted entry after save
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(draftEntry);
        return Promise.resolve(submittedEntry);
      });
      entryRepository.save = jest.fn().mockResolvedValue(submittedEntry);

      const result = await service.submitEntry(mockEntryId, mockUser as User);

      expect(entryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TimeEntryStatus.SUBMITTED,
        })
      );
      expect(result.status).toBe(TimeEntryStatus.SUBMITTED);
    });

    it('should throw when entry is not in draft status', async () => {
      const approvedEntry = { ...mockTimeEntry, status: TimeEntryStatus.APPROVED };
      entryRepository.findOne = jest.fn().mockResolvedValue(approvedEntry);

      await expect(service.submitEntry(mockEntryId, mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryInvalidStatusException
      );
    });

    it('should throw when user tries to submit another user entry', async () => {
      const otherUserEntry = {
        ...mockTimeEntry,
        userId: 'other-user-123',
        status: TimeEntryStatus.DRAFT,
      };
      entryRepository.findOne = jest.fn().mockResolvedValue(otherUserEntry);

      await expect(service.submitEntry(mockEntryId, mockUser as User)).rejects.toBeInstanceOf(
        TimeEntryNotFoundException
      );
    });
  });

  describe('approveEntry', () => {
    it('should approve submitted entry', async () => {
      const submittedEntry = { ...mockTimeEntry, status: TimeEntryStatus.SUBMITTED };
      const approvedEntry = { ...submittedEntry, status: TimeEntryStatus.APPROVED };

      // Mock findOne to return submitted entry first, then approved entry after save
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(submittedEntry);
        return Promise.resolve(approvedEntry);
      });
      entryRepository.save = jest.fn().mockResolvedValue(approvedEntry);

      const result = await service.approveEntry(mockEntryId, mockOwner as User);

      expect(entryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TimeEntryStatus.APPROVED,
          approvedById: mockOwner.id,
        })
      );
      expect(result.status).toBe(TimeEntryStatus.APPROVED);
    });

    it('should throw when entry is not in submitted status', async () => {
      const draftEntry = { ...mockTimeEntry, status: TimeEntryStatus.DRAFT };
      entryRepository.findOne = jest.fn().mockResolvedValue(draftEntry);

      await expect(service.approveEntry(mockEntryId, mockOwner as User)).rejects.toBeInstanceOf(
        TimeEntryInvalidStatusException
      );
    });
  });

  describe('rejectEntry', () => {
    it('should reject submitted entry with note', async () => {
      const submittedEntry = { ...mockTimeEntry, status: TimeEntryStatus.SUBMITTED };
      const rejectedEntry = { ...submittedEntry, status: TimeEntryStatus.REJECTED };

      // Use call counter pattern for robust mocking
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(submittedEntry);
        return Promise.resolve(rejectedEntry);
      });
      entryRepository.save = jest.fn().mockResolvedValue(rejectedEntry);

      const result = await service.rejectEntry(
        mockEntryId,
        'Invalid description',
        mockOwner as User
      );

      expect(entryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TimeEntryStatus.REJECTED,
          rejectionNote: 'Invalid description',
        })
      );
      expect(result.status).toBe(TimeEntryStatus.REJECTED);
    });

    it('should throw when entry is not in submitted status', async () => {
      const draftEntry = { ...mockTimeEntry, status: TimeEntryStatus.DRAFT };
      entryRepository.findOne = jest.fn().mockResolvedValue(draftEntry);

      await expect(
        service.rejectEntry(mockEntryId, 'Rejected', mockOwner as User)
      ).rejects.toBeInstanceOf(TimeEntryInvalidStatusException);
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple entries', async () => {
      const entryIds = ['entry-1', 'entry-2', 'entry-3'];
      entryRepository.count = jest.fn().mockResolvedValue(3);
      entryRepository.update = jest.fn().mockResolvedValue({ affected: 3 });

      const result = await service.bulkApprove(entryIds, mockOwner as User);

      expect(result.approved).toBe(3);
      expect(result.notFound).toBe(0);
    });

    it('should report not found entries', async () => {
      const entryIds = ['entry-1', 'entry-2', 'entry-3'];
      entryRepository.count = jest.fn().mockResolvedValue(2);
      entryRepository.update = jest.fn().mockResolvedValue({ affected: 2 });

      const result = await service.bulkApprove(entryIds, mockOwner as User);

      expect(result.approved).toBe(2);
      expect(result.notFound).toBe(1);
    });
  });

  describe('Tenant isolation', () => {
    it('should always use tenant service for company context', async () => {
      entryRepository.findOne = jest.fn().mockResolvedValue(mockTimeEntry);

      await service.findOne(mockEntryId, mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by companyId in all queries', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entry.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });
  });

  describe('Overlap detection', () => {
    const createDto: CreateTimeEntryDto = {
      description: 'New entry',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T12:00:00Z',
      isBillable: true,
    };

    it('should allow overlapping entries when setting is true', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: true,
      });

      const savedEntry = { ...mockTimeEntry, ...createDto, id: 'new-entry-id' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue(savedEntry),
        save: jest.fn().mockResolvedValue(savedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      await expect(service.create(createDto, mockUser as User)).resolves.toBeDefined();

      // Overlap check should not be called when setting allows overlapping
      expect(mockQueryBuilder.setLock).not.toHaveBeenCalledWith('pessimistic_read');
    });

    it('should reject overlapping entries when setting is false', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: false,
      });

      const mockQueryBuilder = createMockQueryBuilder();
      // Simulate finding an overlapping entry (count > 0)
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(1);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn(),
        save: jest.fn(),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.create(createDto, mockUser as User)).rejects.toBeInstanceOf(Error);
    });

    it('should allow non-overlapping entries when setting is false', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: false,
      });

      const savedEntry = { ...mockTimeEntry, ...createDto, id: 'new-entry-id' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue(savedEntry),
        save: jest.fn().mockResolvedValue(savedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));
      entryRepository.findOne = jest.fn().mockResolvedValue(savedEntry);

      await expect(service.create(createDto, mockUser as User)).resolves.toBeDefined();
    });

    it('should exclude current entry when checking overlap during update', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: false,
      });

      const existingEntry = { ...mockTimeEntry };
      const updatedEntry = { ...existingEntry, startTime: new Date('2024-01-15T09:30:00Z') };

      // Use call counter pattern for robust mocking
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(existingEntry);
        return Promise.resolve(updatedEntry);
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(existingEntry);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await service.update(
        mockEntryId,
        { startTime: '2024-01-15T09:30:00Z', endTime: '2024-01-15T11:30:00Z' },
        mockUser as User
      );

      // Verify query excludes the current entry
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.id != :excludeId', {
        excludeId: mockEntryId,
      });
    });
  });

  describe('PostgreSQL error 23505 handling', () => {
    const startDto: StartTimerDto = {
      description: 'New timer',
    };

    it('should convert PostgreSQL 23505 duplicate key error to TimerAlreadyRunningException', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);

      // Simulate PostgreSQL duplicate key error (concurrent timer start)
      const pgError = new Error('duplicate key value violates unique constraint');
      (pgError as any).code = '23505';
      mockEntityManager.save = jest.fn().mockRejectedValue(pgError);

      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.startTimer(startDto, mockUser as User)).rejects.toBeInstanceOf(
        TimerAlreadyRunningException
      );
    });

    it('should rethrow non-23505 errors as-is', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);

      // Simulate a different database error
      const genericError = new Error('Connection timeout');
      (genericError as any).code = 'ETIMEDOUT';
      mockEntityManager.save = jest.fn().mockRejectedValue(genericError);

      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.startTimer(startDto, mockUser as User)).rejects.toHaveProperty(
        'message',
        'Connection timeout'
      );
    });

    it('should rethrow errors without code as-is', async () => {
      const mockEntityManager = createMockEntityManager();
      mockEntityManager.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);

      // Simulate generic error without code
      const genericError = new Error('Unknown error');
      mockEntityManager.save = jest.fn().mockRejectedValue(genericError);

      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(service.startTimer(startDto, mockUser as User)).rejects.toHaveProperty(
        'message',
        'Unknown error'
      );
    });
  });

  describe('Entry locking', () => {
    it('should allow editing entries within lock period', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        lockEntriesAfterDays: 7,
      });

      const recentEntry = {
        ...mockTimeEntry,
        startTime: new Date(), // Today
      };
      const updatedEntry = { ...recentEntry, description: 'Updated' };

      // Use call counter pattern for robust mocking
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(recentEntry);
        return Promise.resolve(updatedEntry);
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(recentEntry);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(
        service.update(mockEntryId, { description: 'Updated' }, mockUser as User)
      ).resolves.toBeDefined();
    });

    it('should block editing entries past lock period', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        lockEntriesAfterDays: 7,
      });

      const oldEntry = {
        ...mockTimeEntry,
        startTime: new Date('2020-01-01'), // Old entry
      };
      entryRepository.findOne = jest.fn().mockResolvedValue(oldEntry);

      await expect(
        service.update(mockEntryId, { description: 'Updated' }, mockUser as User)
      ).rejects.toBeInstanceOf(TimeEntryLockedException);
    });

    it('should not lock entries when lockEntriesAfterDays is 0', async () => {
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        lockEntriesAfterDays: 0,
      });

      const oldEntry = {
        ...mockTimeEntry,
        startTime: new Date('2020-01-01'),
      };
      const updatedEntry = { ...oldEntry, description: 'Updated' };

      // Use call counter pattern for robust mocking
      let findOneCallCount = 0;
      entryRepository.findOne = jest.fn().mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) return Promise.resolve(oldEntry);
        return Promise.resolve(updatedEntry);
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(oldEntry);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(0);
      const mockEntityManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        save: jest.fn().mockResolvedValue(updatedEntry),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager));

      await expect(
        service.update(mockEntryId, { description: 'Updated' }, mockUser as User)
      ).resolves.toBeDefined();
    });
  });
});
