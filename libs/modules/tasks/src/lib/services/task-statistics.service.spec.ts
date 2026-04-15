import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Task, TaskStatus, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskNotFoundException } from '../exceptions';
import { TaskStatisticsService } from './task-statistics.service';

describe('TaskStatisticsService', () => {
  let service: TaskStatisticsService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let _systemCompanyService: jest.Mocked<SystemCompanyService>;

  const mockCompanyId = 'company-123';
  const mockUser: Partial<User> = {
    id: 'user-123',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const createMockQueryBuilder = (rawMany: any[] = [], rawOne: any = null) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawMany),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskStatisticsService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
            manager: {
              findOne: jest.fn().mockResolvedValue({ id: 'client-123', companyId: mockCompanyId }),
            },
          },
        },
        {
          provide: SystemCompanyService,
          useValue: {
            getCompanyIdForUser: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
      ],
    }).compile();

    service = module.get<TaskStatisticsService>(TaskStatisticsService);
    taskRepository = module.get(getRepositoryToken(Task));
    _systemCompanyService = module.get(SystemCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClientTaskStatistics', () => {
    it('should throw if client not found', async () => {
      (taskRepository.manager as any).findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.getClientTaskStatistics('nonexistent-client', mockUser as User)
      ).rejects.toThrow(TaskNotFoundException);
    });

    it('should return client statistics grouped by status', async () => {
      const qb = createMockQueryBuilder(
        [
          { status: TaskStatus.TODO, count: '3' },
          { status: TaskStatus.DONE, count: '5' },
        ],
        { totalCount: '8', totalEstimatedMinutes: '120', totalStoryPoints: '13' }
      );
      (taskRepository as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.getClientTaskStatistics('client-123', mockUser as User);

      expect(result.clientId).toBe('client-123');
      expect(result.byStatus[TaskStatus.TODO]).toBe(3);
      expect(result.byStatus[TaskStatus.DONE]).toBe(5);
      expect(result.byStatus[TaskStatus.BACKLOG]).toBe(0);
      expect(result.totalCount).toBe(8);
      expect(result.totalEstimatedMinutes).toBe(120);
      expect(result.totalStoryPoints).toBe(13);
    });
  });

  describe('getGlobalStatistics', () => {
    it('should return global statistics with overdue and due soon counts', async () => {
      let callCount = 0;
      (taskRepository as any).createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder([
            { status: TaskStatus.IN_PROGRESS, count: '4' },
            { status: TaskStatus.DONE, count: '10' },
          ]);
        }
        return createMockQueryBuilder([], { count: '2' });
      });

      const result = await service.getGlobalStatistics(mockUser as User);

      expect(result.total).toBe(14);
      expect(result.byStatus[TaskStatus.IN_PROGRESS]).toBe(4);
      expect(result.byStatus[TaskStatus.DONE]).toBe(10);
      expect(result.overdue).toBe(2);
      expect(result.dueSoon).toBe(2);
      expect(result.unassigned).toBe(2);
    });

    it('should handle empty data', async () => {
      let callCount = 0;
      (taskRepository as any).createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder([]);
        }
        return createMockQueryBuilder([], { count: '0' });
      });

      const result = await service.getGlobalStatistics(mockUser as User);

      expect(result.total).toBe(0);
      expect(result.overdue).toBe(0);
      expect(result.dueSoon).toBe(0);
      expect(result.unassigned).toBe(0);
    });
  });
});
