import { TenantService } from '@accounting/common/backend';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { TimeEntry, UserRole, type User } from '@accounting/common';

import { TimeTrackingExtendedStatsService } from './time-tracking-extended-stats.service';

describe('TimeTrackingExtendedStatsService', () => {
  let service: TimeTrackingExtendedStatsService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let tenantService: jest.Mocked<TenantService>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

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

  const createMockQueryBuilder = () => {
    const mockQb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    return mockQb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const mockQueryBuilder = createMockQueryBuilder();

    const mockEntryRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TimeTrackingExtendedStatsService,
          useFactory: () => {
            return new TimeTrackingExtendedStatsService(
              mockEntryRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockEntryRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<TimeTrackingExtendedStatsService>(TimeTrackingExtendedStatsService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    tenantService = module.get(TenantService);
  });

  describe('getTopTasksByTime', () => {
    it('should return top tasks with duration stats', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        { taskId: 'task-1', taskTitle: 'Build API', totalMinutes: '180' },
        { taskId: 'task-2', taskTitle: 'Write tests', totalMinutes: '90' },
      ]);
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.getTopTasksByTime(mockOwner as User);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        taskId: 'task-1',
        taskTitle: 'Build API',
        totalMinutes: 180,
        totalHours: 3,
      });
      expect(result[1]).toEqual({
        taskId: 'task-2',
        taskTitle: 'Write tests',
        totalMinutes: 90,
        totalHours: 1.5,
      });
    });

    it('should default taskTitle to "Unknown" when null', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        { taskId: 'task-1', taskTitle: null, totalMinutes: '60' },
      ]);
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.getTopTasksByTime(mockOwner as User);

      expect(result[0].taskTitle).toBe('Unknown');
    });

    it('should filter by userId for EMPLOYEE role', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getTopTasksByTime(mockEmployee as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('te.userId = :userId', {
        userId: mockUserId,
      });
    });

    it('should NOT filter by userId for COMPANY_OWNER role', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getTopTasksByTime(mockOwner as User);

      const calls = mockQb.andWhere.mock.calls;
      const hasUserIdFilter = calls.some((call: any) => call[0] === 'te.userId = :userId');
      expect(hasUserIdFilter).toBe(false);
    });

    it('should apply date range from preset filter', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getTopTasksByTime(mockOwner as User, { preset: '90d' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('te.startTime >= :start', expect.any(Object));
      expect(mockQb.andWhere).toHaveBeenCalledWith('te.startTime <= :end', expect.any(Object));
    });
  });

  describe('getTopSettlementsByTime', () => {
    it('should return top settlements with duration stats', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        {
          settlementId: 'sett-1',
          month: 1,
          year: 2024,
          clientName: 'Acme Corp',
          totalMinutes: '240',
        },
      ]);
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.getTopSettlementsByTime(mockOwner as User);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        settlementId: 'sett-1',
        month: 1,
        year: 2024,
        clientName: 'Acme Corp',
        totalMinutes: 240,
        totalHours: 4,
      });
    });

    it('should filter by userId for EMPLOYEE role', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getTopSettlementsByTime(mockEmployee as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('te.userId = :userId', {
        userId: mockUserId,
      });
    });
  });

  describe('getEmployeeTimeBreakdown', () => {
    it('should return employee breakdown with task and settlement minutes', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        {
          userId: 'user-a',
          email: 'a@example.com',
          firstName: 'Anna',
          lastName: 'Kowalska',
          taskMinutes: '120',
          settlementMinutes: '60',
          totalMinutes: '180',
        },
        {
          userId: 'user-b',
          email: 'b@example.com',
          firstName: null,
          lastName: null,
          taskMinutes: null,
          settlementMinutes: null,
          totalMinutes: null,
        },
      ]);
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.getEmployeeTimeBreakdown(mockOwner as User);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'user-a',
        email: 'a@example.com',
        firstName: 'Anna',
        lastName: 'Kowalska',
        taskMinutes: 120,
        settlementMinutes: 60,
        totalMinutes: 180,
      });
      // Null values default to 0
      expect(result[1].taskMinutes).toBe(0);
      expect(result[1].settlementMinutes).toBe(0);
      expect(result[1].totalMinutes).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('should always resolve companyId via tenantService', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getTopTasksByTime(mockEmployee as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockEmployee);
    });

    it('should filter all queries by companyId', async () => {
      const mockQb = createMockQueryBuilder();
      entryRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.getEmployeeTimeBreakdown(mockOwner as User);

      expect(mockQb.where).toHaveBeenCalledWith('te.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });
  });
});
