import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import {
  TimeEntry,
  TimeEntryStatus,
  TimeRoundingMethod,
  UserRole,
  type TimeSettings,
  type User,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { TimeCalculationService } from './time-calculation.service';
import { TimeSettingsService } from './time-settings.service';
import { TimesheetService } from './timesheet.service';
import { TimesheetGroupBy } from '../dto/timesheet.dto';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let tenantService: jest.Mocked<TenantService>;
  let settingsService: jest.Mocked<TimeSettingsService>;
  let _calculationService: TimeCalculationService;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockEmployee: Partial<User> = {
    id: mockUserId,
    email: 'employee@example.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
  };

  const mockOwner: Partial<User> = {
    id: 'owner-123',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSettings: Partial<TimeSettings> = {
    id: 'settings-123',
    companyId: mockCompanyId,
    roundingMethod: TimeRoundingMethod.NONE,
    roundingIntervalMinutes: 15,
    requireApproval: false,
    allowOverlappingEntries: true,
    weekStartDay: 1, // Monday
  };

  const mockClient = {
    id: 'client-123',
    name: 'Test Client',
    companyId: mockCompanyId,
  };

  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    companyId: mockCompanyId,
  };

  const createMockEntry = (overrides: Partial<TimeEntry> = {}): Partial<TimeEntry> => ({
    id: 'entry-' + Math.random().toString(36).substr(2, 9),
    description: 'Test entry',
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    durationMinutes: 120,
    isRunning: false,
    isBillable: true,
    totalAmount: 200,
    status: TimeEntryStatus.DRAFT,
    companyId: mockCompanyId,
    userId: mockUserId,
    clientId: 'client-123',
    client: mockClient as any,
    taskId: 'task-123',
    task: mockTask as any,
    isActive: true,
    ...overrides,
  });

  const createMockQueryBuilder = () => {
    const mockQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        entriesCount: '0',
        totalMinutes: '0',
        billableMinutes: '0',
        totalAmount: '0',
      }),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockImplementation(() => mockQb),
    };
    return mockQb;
  };

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetService,
        TimeCalculationService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: TenantService,
          useValue: {
            getEffectiveCompanyId: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
        {
          provide: TimeSettingsService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue(mockSettings),
          },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue({
                id: mockUserId,
                companyId: mockCompanyId,
                isActive: true,
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TimesheetService>(TimesheetService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    tenantService = module.get(TenantService);
    settingsService = module.get(TimeSettingsService);
    _calculationService = module.get(TimeCalculationService);
  });

  describe('getDailyTimesheet', () => {
    it('should return entries for current user on specified date', async () => {
      const mockEntries = [createMockEntry(), createMockEntry()];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.date).toBe('2024-01-15');
      expect(result.entries).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            userId: mockUserId,
            isActive: true,
          }),
        })
      );
    });

    it('should allow managers to view other users timesheets', async () => {
      const mockEntries = [createMockEntry({ userId: 'other-user' })];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      await service.getDailyTimesheet(
        { date: '2024-01-15', userId: 'other-user' },
        mockOwner as User
      );

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'other-user',
          }),
        })
      );
    });

    it('should ignore userId for non-managers', async () => {
      const mockEntries = [createMockEntry()];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      await service.getDailyTimesheet(
        { date: '2024-01-15', userId: 'other-user' },
        mockEmployee as User
      );

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId, // Should use current user, not other-user
          }),
        })
      );
    });

    it('should include client and task relations', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.arrayContaining(['client', 'task']),
        })
      );
    });

    it('should order entries by startTime ASC', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { startTime: 'ASC' },
        })
      );
    });
  });

  describe('getWeeklyTimesheet', () => {
    it('should return 7 days of entries', async () => {
      const mockEntries = [
        createMockEntry({ startTime: new Date('2024-01-15T09:00:00Z') }),
        createMockEntry({ startTime: new Date('2024-01-16T09:00:00Z') }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getWeeklyTimesheet(
        { weekStart: '2024-01-15' },
        mockEmployee as User
      );

      expect(result.days).toHaveLength(7);
      expect(result.weekStart).toBeDefined();
      expect(result.weekEnd).toBeDefined();
    });

    it('should respect week start day from settings', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);
      settingsService.getSettings = jest.fn().mockResolvedValue({
        ...mockSettings,
        weekStartDay: 0, // Sunday
      });

      await service.getWeeklyTimesheet({ weekStart: '2024-01-14' }, mockEmployee as User);

      expect(settingsService.getSettings).toHaveBeenCalledWith(mockEmployee);
    });

    it('should group entries by day', async () => {
      const mockEntries = [
        createMockEntry({
          startTime: new Date('2024-01-15T09:00:00Z'),
          durationMinutes: 60,
        }),
        createMockEntry({
          startTime: new Date('2024-01-15T14:00:00Z'),
          durationMinutes: 60,
        }),
        createMockEntry({
          startTime: new Date('2024-01-16T09:00:00Z'),
          durationMinutes: 120,
        }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getWeeklyTimesheet(
        { weekStart: '2024-01-15' },
        mockEmployee as User
      );

      // Find the day with 2 entries
      const dayWith2Entries = result.days.find((d) => d.entries.length === 2);
      expect(dayWith2Entries).toBeDefined();
      expect(dayWith2Entries?.totalMinutes).toBe(120);
    });

    it('should calculate totals per day', async () => {
      const mockEntries = [
        createMockEntry({
          startTime: new Date('2024-01-15T09:00:00Z'),
          durationMinutes: 60,
          isBillable: true,
          totalAmount: 100,
        }),
        createMockEntry({
          startTime: new Date('2024-01-15T14:00:00Z'),
          durationMinutes: 60,
          isBillable: false,
          totalAmount: 0,
        }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getWeeklyTimesheet(
        { weekStart: '2024-01-15' },
        mockEmployee as User
      );

      const dayWithEntries = result.days.find((d) => d.entries.length > 0);
      expect(dayWithEntries?.totalMinutes).toBe(120);
      expect(dayWithEntries?.billableMinutes).toBe(60);
    });

    it('should allow managers to view other users weekly timesheets', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      await service.getWeeklyTimesheet(
        { weekStart: '2024-01-15', userId: 'other-user' },
        mockOwner as User
      );

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'other-user',
          }),
        })
      );
    });
  });

  describe('getReportSummary', () => {
    beforeEach(() => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;
    });

    it('should filter by date range', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        mockEmployee as User
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.startTime >= :startDate',
        expect.any(Object)
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.startTime <= :endDate',
        expect.any(Object)
      );
    });

    it('should filter by clientId', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', clientId: 'client-123' },
        mockEmployee as User
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.clientId = :clientId', {
        clientId: 'client-123',
      });
    });

    it('should filter by taskId', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', taskId: 'task-123' },
        mockEmployee as User
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.taskId = :taskId', {
        taskId: 'task-123',
      });
    });

    it('should filter by billable status', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', isBillable: true },
        mockEmployee as User
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.isBillable = :isBillable', {
        isBillable: true,
      });
    });

    it('should filter by userId for non-managers', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        mockEmployee as User
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entry.userId = :userId', {
        userId: mockUserId,
      });
    });

    it('should allow managers to see all entries', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        mockOwner as User
      );

      // Should not call andWhere with userId for managers without userId filter
      const calls = mockQueryBuilder.andWhere.mock.calls;
      const hasUserIdFilter = calls.some((call: any) => call[0] === 'entry.userId = :userId');
      expect(hasUserIdFilter).toBe(false);
    });

    it('should group by day when specified', async () => {
      const mockEntries = [
        createMockEntry({ startTime: new Date('2024-01-15T09:00:00Z') }),
        createMockEntry({ startTime: new Date('2024-01-15T14:00:00Z') }),
        createMockEntry({ startTime: new Date('2024-01-16T09:00:00Z') }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.DAY },
        mockEmployee as User
      );

      expect(result.groupedData).toBeDefined();
      expect(result.groupedData?.length).toBeGreaterThan(0);
    });

    it('should group by client when specified', async () => {
      const mockEntries = [
        createMockEntry({
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Client 1' } as any,
        }),
        createMockEntry({
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Client 1' } as any,
        }),
        createMockEntry({
          clientId: 'client-2',
          client: { id: 'client-2', name: 'Client 2' } as any,
        }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.CLIENT },
        mockEmployee as User
      );

      expect(result.groupedData).toBeDefined();
      expect(result.groupedData?.length).toBe(2);
    });

    it('should group by task when specified', async () => {
      const mockEntries = [
        createMockEntry({ taskId: 'task-1', task: { id: 'task-1', title: 'Task 1' } as any }),
        createMockEntry({ taskId: 'task-2', task: { id: 'task-2', title: 'Task 2' } as any }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.TASK },
        mockEmployee as User
      );

      expect(result.groupedData).toBeDefined();
      expect(result.groupedData?.length).toBe(2);
    });
  });

  describe('getClientReport', () => {
    it('should delegate to getReportSummary with clientId', async () => {
      const mockEntries: TimeEntry[] = [];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const spy = jest.spyOn(service, 'getReportSummary');

      await service.getClientReport(
        'client-123',
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        mockEmployee as User
      );

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-123' }),
        mockEmployee
      );
    });
  });

  describe('calculateSummary (via getDailyTimesheet)', () => {
    it('should sum total minutes correctly', async () => {
      const mockEntries = [
        createMockEntry({ durationMinutes: 60 }),
        createMockEntry({ durationMinutes: 90 }),
        createMockEntry({ durationMinutes: 30 }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.totalMinutes).toBe(180);
    });

    it('should separate billable vs non-billable', async () => {
      const mockEntries = [
        createMockEntry({ durationMinutes: 60, isBillable: true }),
        createMockEntry({ durationMinutes: 60, isBillable: false }),
        createMockEntry({ durationMinutes: 60, isBillable: true }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.billableMinutes).toBe(120);
      expect(result.summary.nonBillableMinutes).toBe(60);
    });

    it('should handle decimal amounts from TypeORM', async () => {
      const mockEntries = [
        createMockEntry({
          durationMinutes: 60,
          isBillable: true,
          totalAmount: '150.50' as any, // TypeORM returns decimals as strings
        }),
        createMockEntry({
          durationMinutes: 60,
          isBillable: true,
          totalAmount: '99.99' as any,
        }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.totalAmount).toBeCloseTo(250.49, 2);
    });

    it('should handle empty entries array', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.totalMinutes).toBe(0);
      expect(result.summary.billableMinutes).toBe(0);
      expect(result.summary.nonBillableMinutes).toBe(0);
      expect(result.summary.totalAmount).toBe(0);
      expect(result.summary.entriesCount).toBe(0);
    });

    it('should handle null durationMinutes', async () => {
      const mockEntries = [
        createMockEntry({ durationMinutes: undefined as any }),
        createMockEntry({ durationMinutes: 60 }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.totalMinutes).toBe(60);
    });

    it('should handle null totalAmount', async () => {
      const mockEntries = [
        createMockEntry({
          durationMinutes: 60,
          isBillable: true,
          totalAmount: null as any,
        }),
      ];
      entryRepository.find = jest.fn().mockResolvedValue(mockEntries);

      const result = await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(result.summary.totalAmount).toBe(0);
    });
  });

  describe('groupEntries (via getReportSummary)', () => {
    it('should use Polish labels for no-client grouping', async () => {
      const mockEntries = [
        createMockEntry({
          clientId: undefined as any,
          client: undefined as any,
        }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.CLIENT },
        mockEmployee as User
      );

      const noClientGroup = result.groupedData?.find((g) => g.groupId === 'no-client');
      expect(noClientGroup?.groupName).toBe('Bez klienta');
    });

    it('should use Polish labels for no-task grouping', async () => {
      const mockEntries = [
        createMockEntry({
          taskId: undefined as any,
          task: undefined as any,
        }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.TASK },
        mockEmployee as User
      );

      const noTaskGroup = result.groupedData?.find((g) => g.groupId === 'no-task');
      expect(noTaskGroup?.groupName).toBe('Bez zadania');
    });

    it('should calculate correct totals per group', async () => {
      const mockEntries = [
        createMockEntry({
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Client 1' } as any,
          durationMinutes: 60,
          isBillable: true,
          totalAmount: 100,
        }),
        createMockEntry({
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Client 1' } as any,
          durationMinutes: 90,
          isBillable: true,
          totalAmount: 150,
        }),
        createMockEntry({
          clientId: 'client-2',
          client: { id: 'client-2', name: 'Client 2' } as any,
          durationMinutes: 30,
          isBillable: false,
          totalAmount: 0,
        }),
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockEntries);
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const result = await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31', groupBy: TimesheetGroupBy.CLIENT },
        mockEmployee as User
      );

      const client1Group = result.groupedData?.find((g) => g.groupId === 'client-1');
      expect(client1Group?.totalMinutes).toBe(150);
      expect(client1Group?.billableMinutes).toBe(150);
      expect(client1Group?.totalAmount).toBe(250);
      expect(client1Group?.entriesCount).toBe(2);

      const client2Group = result.groupedData?.find((g) => g.groupId === 'client-2');
      expect(client2Group?.totalMinutes).toBe(30);
      expect(client2Group?.billableMinutes).toBe(0);
      expect(client2Group?.entriesCount).toBe(1);
    });
  });

  describe('Tenant isolation', () => {
    it('should always use tenant service for company context', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockEmployee);
    });

    it('should filter by companyId in all queries', async () => {
      entryRepository.find = jest.fn().mockResolvedValue([]);

      await service.getDailyTimesheet({ date: '2024-01-15' }, mockEmployee as User);

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
          }),
        })
      );
    });

    it('should filter by companyId in report queries', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getReportSummary(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        mockEmployee as User
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entry.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });
  });
});
