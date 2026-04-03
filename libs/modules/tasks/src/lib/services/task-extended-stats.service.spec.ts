import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Task, TaskStatus, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskExtendedStatsService } from './task-extended-stats.service';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'createQueryBuilder',
    'leftJoinAndSelect',
    'leftJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  qb['getRawMany'] = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('TaskExtendedStatsService', () => {
  let service: TaskExtendedStatsService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQb = createMockQueryBuilder();

    taskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<Task>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskExtendedStatsService,
          useFactory: () =>
            new TaskExtendedStatsService(taskRepository as any, systemCompanyService as any),
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(TaskExtendedStatsService);
  });

  describe('getCompletionDurationStats', () => {
    it('should return longest, shortest, and average duration for completed tasks', async () => {
      const now = new Date();
      const tasks = [
        {
          id: 't-1',
          title: 'Fast Task',
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h ago
          updatedAt: now,
          assignee: { firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' },
        },
        {
          id: 't-2',
          title: 'Slow Task',
          createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48h ago
          updatedAt: now,
          assignee: { firstName: 'Anna', lastName: 'Nowak', email: 'anna@test.pl' },
        },
      ] as unknown as Task[];

      mockQb['getMany'].mockResolvedValue(tasks);

      const result = await service.getCompletionDurationStats(mockUser);

      expect(result.longest).toBeDefined();
      expect(result.shortest).toBeDefined();
      expect(result.averageDurationHours).toBeGreaterThan(0);
      expect(result.longest.length).toBeGreaterThan(0);
      expect(result.shortest.length).toBeGreaterThan(0);
      // Slow task should be in longest
      expect(result.longest[0].title).toBe('Slow Task');
      expect(result.shortest[0].title).toBe('Fast Task');
    });

    it('should return empty arrays and zero average when no completed tasks', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      const result = await service.getCompletionDurationStats(mockUser);

      expect(result.longest).toEqual([]);
      expect(result.shortest).toEqual([]);
      expect(result.averageDurationHours).toBe(0);
    });

    it('should filter by DONE status and non-template tasks', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      await service.getCompletionDurationStats(mockUser);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.DONE,
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.isTemplate = :isTemplate', {
        isTemplate: false,
      });
    });

    it('should use assignee email as fallback name when firstName/lastName are empty', async () => {
      const now = new Date();
      const tasks = [
        {
          id: 't-1',
          title: 'Task',
          createdAt: new Date(now.getTime() - 3600000),
          updatedAt: now,
          assignee: { firstName: null, lastName: null, email: 'noname@test.pl' },
        },
      ] as unknown as Task[];

      mockQb['getMany'].mockResolvedValue(tasks);

      const result = await service.getCompletionDurationStats(mockUser);

      expect(result.longest[0].assigneeName).toBe('noname@test.pl');
    });
  });

  describe('getStatusDurationRanking', () => {
    it('should return top 10 tasks sorted by duration for given status', async () => {
      const now = Date.now();
      const tasks = Array.from({ length: 12 }, (_, i) => ({
        id: `t-${i}`,
        title: `Task ${i}`,
        updatedAt: new Date(now - (i + 1) * 3600000), // each progressively older
        assignee: null,
        client: undefined,
      })) as unknown as Task[];

      mockQb['getMany'].mockResolvedValue(tasks);

      const result = await service.getStatusDurationRanking(mockUser, {
        status: 'blocked',
      });

      expect(result.longest).toHaveLength(10);
      expect(result.status).toBe('blocked');
      expect(result.averageDurationHours).toBeGreaterThan(0);
      // Oldest task (t-11) should be first (longest duration)
      expect(result.longest[0].id).toBe('t-11');
    });

    it('should apply date range filters when provided', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      await service.getStatusDurationRanking(mockUser, {
        status: 'cancelled',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      });

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.CANCELLED,
      });
      // applyDateRangeFilter adds andWhere calls for start/end dates
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.updatedAt >= :startDate', {
        startDate: '2026-01-01',
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.updatedAt <= :endDate', {
        endDate: '2026-03-01',
      });
    });

    it('should return empty ranking when no tasks match', async () => {
      mockQb['getMany'].mockResolvedValue([]);

      const result = await service.getStatusDurationRanking(mockUser, {
        status: 'in_review',
      });

      expect(result.longest).toEqual([]);
      expect(result.averageDurationHours).toBe(0);
      expect(result.status).toBe('in_review');
    });
  });

  describe('getEmployeeCompletionRanking', () => {
    it('should return employee rankings sorted by completed count', async () => {
      const rawResults = [
        {
          userId: 'u-1',
          email: 'jan@test.pl',
          firstName: 'Jan',
          lastName: 'Kowalski',
          completedCount: '15',
        },
        {
          userId: 'u-2',
          email: 'anna@test.pl',
          firstName: 'Anna',
          lastName: 'Nowak',
          completedCount: '8',
        },
      ];

      mockQb['getRawMany'].mockResolvedValue(rawResults);

      const result = await service.getEmployeeCompletionRanking(mockUser);

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0]).toEqual({
        userId: 'u-1',
        email: 'jan@test.pl',
        firstName: 'Jan',
        lastName: 'Kowalski',
        completedCount: 15,
      });
      expect(result.rankings[1].completedCount).toBe(8);
    });

    it('should return empty rankings when no completed tasks exist', async () => {
      mockQb['getRawMany'].mockResolvedValue([]);

      const result = await service.getEmployeeCompletionRanking(mockUser);

      expect(result.rankings).toEqual([]);
    });

    it('should filter by DONE status and non-template, assigned tasks', async () => {
      mockQb['getRawMany'].mockResolvedValue([]);

      await service.getEmployeeCompletionRanking(mockUser);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.DONE,
      });
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.assigneeId IS NOT NULL');
      expect(mockQb['andWhere']).toHaveBeenCalledWith('task.isTemplate = :isTemplate', {
        isTemplate: false,
      });
    });
  });
});
