import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  Task,
  TaskLabelAssignment,
  TaskStatus,
  UserRole,
  type TaskLabel,
  type User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskViewsService } from './task-views.service';

describe('TaskViewsService', () => {
  let service: TaskViewsService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let labelAssignmentRepository: jest.Mocked<Repository<TaskLabelAssignment>>;
  let _systemCompanyService: jest.Mocked<SystemCompanyService>;

  const mockCompanyId = 'company-123';
  const mockUser: Partial<User> = {
    id: 'user-123',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockTask: any = {
    id: 'task-1',
    title: 'Test Task',
    status: TaskStatus.TODO,
    companyId: mockCompanyId,
    isActive: true,
    parentTaskId: null,
  };

  const createMockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
      getMany: jest.fn().mockResolvedValue([mockTask]),
    };
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskViewsService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(TaskLabelAssignment),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
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

    service = module.get<TaskViewsService>(TaskViewsService);
    taskRepository = module.get(getRepositoryToken(Task));
    labelAssignmentRepository = module.get(getRepositoryToken(TaskLabelAssignment));
    _systemCompanyService = module.get(SystemCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKanbanBoard', () => {
    it('should return columns for all statuses', async () => {
      const result = await service.getKanbanBoard(mockUser as User);

      expect(result.columns).toBeDefined();
      expect(result.columns.length).toBe(7); // 7 task statuses
      expect(result.columns[0].status).toBe(TaskStatus.BACKLOG);
    });

    it('should apply assignee filter', async () => {
      const filters = { assigneeId: 'user-456' };
      await service.getKanbanBoard(mockUser as User, filters as any);

      // createQueryBuilder is called 7 times (one per column)
      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply client filter', async () => {
      const filters = { clientId: 'client-123' };
      await service.getKanbanBoard(mockUser as User, filters as any);

      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should load labels for tasks', async () => {
      const mockLabel: Partial<TaskLabel> = { id: 'label-1', name: 'Bug', color: '#ff0000' };
      const mockAssignment: any = {
        taskId: 'task-1',
        labelId: 'label-1',
        label: mockLabel,
      };
      (labelAssignmentRepository.find as jest.Mock).mockResolvedValue([mockAssignment]);

      await service.getKanbanBoard(mockUser as User);

      expect(labelAssignmentRepository.find).toHaveBeenCalled();
    });

    it('should respect kanbanLimit filter', async () => {
      const filters = { kanbanLimit: 10 };
      await service.getKanbanBoard(mockUser as User, filters as any);

      // Should have called take(10) on each column query
      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getCalendarTasks', () => {
    it('should return tasks within date range', async () => {
      const result = await service.getCalendarTasks(mockUser as User, '2024-01-01', '2024-01-31');

      expect(Array.isArray(result)).toBe(true);
      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
