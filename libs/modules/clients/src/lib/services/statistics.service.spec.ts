import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  ChangeLog,
  Client,
  EmploymentType,
  Task,
  TimeEntry,
  UserRole,
  VatStatus,
  type User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { ClientStatisticsService } from './statistics.service';

describe('ClientStatisticsService', () => {
  let service: ClientStatisticsService;
  let _clientRepository: jest.Mocked<Repository<Client>>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const createMockQueryBuilder = (rawResult: any[] = []) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  });

  const mockClientRepository = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockChangeLogRepository = {
    find: jest.fn(),
  };

  const mockTaskRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockTimeEntryRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientStatisticsService,
          useFactory: () =>
            new ClientStatisticsService(
              mockClientRepository as any,
              mockChangeLogRepository as any,
              mockTaskRepository as any,
              mockTimeEntryRepository as any,
              mockSystemCompanyService as any
            ),
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(ChangeLog),
          useValue: mockChangeLogRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockTimeEntryRepository,
        },
        {
          provide: SystemCompanyService,
          useValue: mockSystemCompanyService,
        },
      ],
    }).compile();

    service = module.get<ClientStatisticsService>(ClientStatisticsService);
    _clientRepository = module.get(getRepositoryToken(Client));
  });

  describe('getStatistics', () => {
    it('should return total, active, and inactive client counts', async () => {
      mockClientRepository.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40) // active
        .mockResolvedValueOnce(10) // inactive
        .mockResolvedValueOnce(5) // addedThisMonth
        .mockResolvedValueOnce(8); // addedLast30Days

      const emptyQb = createMockQueryBuilder([]);
      mockClientRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStatistics(mockUser as User);

      expect(result.total).toBe(50);
      expect(result.active).toBe(40);
      expect(result.inactive).toBe(10);
      expect(result.addedThisMonth).toBe(5);
      expect(result.addedLast30Days).toBe(8);
    });

    it('should return counts by employment type', async () => {
      mockClientRepository.count.mockResolvedValue(0);

      const employmentQb = createMockQueryBuilder([
        { type: EmploymentType.DG, count: '15' },
        { type: EmploymentType.DG_ETAT, count: '10' },
      ]);
      const emptyQb = createMockQueryBuilder([]);

      mockClientRepository.createQueryBuilder
        .mockReturnValueOnce(employmentQb) // employment type
        .mockReturnValueOnce(emptyQb) // VAT
        .mockReturnValueOnce(emptyQb) // tax scheme
        .mockReturnValueOnce(emptyQb); // ZUS

      const result = await service.getStatistics(mockUser as User);

      expect(result.byEmploymentType[EmploymentType.DG]).toBe(15);
      expect(result.byEmploymentType[EmploymentType.DG_ETAT]).toBe(10);
    });

    it('should return counts by VAT status', async () => {
      mockClientRepository.count.mockResolvedValue(0);

      const emptyQb = createMockQueryBuilder([]);
      const vatQb = createMockQueryBuilder([{ status: VatStatus.VAT_MONTHLY, count: '20' }]);

      mockClientRepository.createQueryBuilder
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(vatQb)
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(emptyQb);

      const result = await service.getStatistics(mockUser as User);

      expect(result.byVatStatus[VatStatus.VAT_MONTHLY]).toBe(20);
    });

    it('should initialize all enum counts to 0 by default', async () => {
      mockClientRepository.count.mockResolvedValue(0);
      const emptyQb = createMockQueryBuilder([]);
      mockClientRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStatistics(mockUser as User);

      // All employment types should be initialized to 0
      for (const type of Object.values(EmploymentType)) {
        expect(result.byEmploymentType[type]).toBe(0);
      }
      for (const status of Object.values(VatStatus)) {
        expect(result.byVatStatus[status]).toBe(0);
      }
    });

    it('should use tenant service to resolve companyId', async () => {
      mockClientRepository.count.mockResolvedValue(0);
      const emptyQb = createMockQueryBuilder([]);
      mockClientRepository.createQueryBuilder.mockReturnValue(emptyQb);

      await service.getStatistics(mockUser as User);

      expect(mockSystemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getStatisticsWithRecent', () => {
    it('should return base stats with recently added clients', async () => {
      // Mock base stats
      mockClientRepository.count.mockResolvedValue(0);
      const emptyQb = createMockQueryBuilder([]);
      mockClientRepository.createQueryBuilder.mockReturnValue(emptyQb);

      // Mock recent clients
      const recentClients = [
        {
          id: 'c-1',
          name: 'Client A',
          nip: '111',
          email: 'a@test.com',
          employmentType: EmploymentType.DG,
          createdAt: new Date(),
        },
      ];
      mockClientRepository.find.mockResolvedValue(recentClients);

      // Mock change logs
      mockChangeLogRepository.find.mockResolvedValue([]);

      const result = await service.getStatisticsWithRecent(mockUser as User);

      expect(result.recentlyAdded).toHaveLength(1);
      expect(result.recentlyAdded[0].name).toBe('Client A');
      expect(result.recentActivity).toEqual([]);
    });

    it('should include recent activity with client names', async () => {
      mockClientRepository.count.mockResolvedValue(0);
      const emptyQb = createMockQueryBuilder([]);
      mockClientRepository.createQueryBuilder.mockReturnValue(emptyQb);
      mockClientRepository.find
        .mockResolvedValueOnce([]) // recent clients (getStatisticsWithRecent)
        .mockResolvedValueOnce([{ id: 'c-1', name: 'Client B' }]); // client name lookup

      mockChangeLogRepository.find.mockResolvedValue([
        {
          id: 'log-1',
          entityId: 'c-1',
          action: 'CREATE',
          createdAt: new Date(),
          changedBy: { firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.com' },
        },
      ]);

      const result = await service.getStatisticsWithRecent(mockUser as User);

      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0].entityName).toBe('Client B');
      expect(result.recentActivity[0].changedByName).toBe('Jan Kowalski');
    });
  });

  describe('getClientTaskAndTimeStats', () => {
    it('should return per-client task and time statistics', async () => {
      const taskQb = createMockQueryBuilder([
        { clientId: 'c-1', totalTasks: '10', completedTasks: '7' },
      ]);
      const timeQb = createMockQueryBuilder([{ clientId: 'c-1', totalMinutes: '120' }]);

      mockTaskRepository.createQueryBuilder.mockReturnValue(taskQb);
      mockTimeEntryRepository.createQueryBuilder.mockReturnValue(timeQb);
      mockClientRepository.find.mockResolvedValue([{ id: 'c-1', name: 'Client A' }]);

      const result = await service.getClientTaskAndTimeStats(mockUser as User);

      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe('c-1');
      expect(result[0].totalTasks).toBe(10);
      expect(result[0].completedTasks).toBe(7);
      expect(result[0].totalMinutes).toBe(120);
      expect(result[0].totalHours).toBe(2); // 120/6/10 rounded = 2.0
    });

    it('should filter out clients with no tasks and no time entries', async () => {
      const taskQb = createMockQueryBuilder([]);
      const timeQb = createMockQueryBuilder([]);

      mockTaskRepository.createQueryBuilder.mockReturnValue(taskQb);
      mockTimeEntryRepository.createQueryBuilder.mockReturnValue(timeQb);
      mockClientRepository.find.mockResolvedValue([
        { id: 'c-1', name: 'Client A' },
        { id: 'c-2', name: 'Client B' },
      ]);

      const result = await service.getClientTaskAndTimeStats(mockUser as User);

      expect(result).toHaveLength(0);
    });

    it('should sort results by total minutes descending', async () => {
      const taskQb = createMockQueryBuilder([
        { clientId: 'c-1', totalTasks: '5', completedTasks: '2' },
        { clientId: 'c-2', totalTasks: '3', completedTasks: '1' },
      ]);
      const timeQb = createMockQueryBuilder([
        { clientId: 'c-1', totalMinutes: '60' },
        { clientId: 'c-2', totalMinutes: '180' },
      ]);

      mockTaskRepository.createQueryBuilder.mockReturnValue(taskQb);
      mockTimeEntryRepository.createQueryBuilder.mockReturnValue(timeQb);
      mockClientRepository.find.mockResolvedValue([
        { id: 'c-1', name: 'Client A' },
        { id: 'c-2', name: 'Client B' },
      ]);

      const result = await service.getClientTaskAndTimeStats(mockUser as User);

      expect(result[0].clientId).toBe('c-2'); // 180 minutes first
      expect(result[1].clientId).toBe('c-1'); // 60 minutes second
    });
  });
});
