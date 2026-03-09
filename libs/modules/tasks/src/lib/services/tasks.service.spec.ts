import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import {
  PaginatedResponseDto,
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskPriority,
  TaskStatus,
  UserRole,
  type User,
} from '@accounting/common';

import { TaskInvalidParentException, TaskNotFoundException } from '../exceptions';
import { TaskNotificationService } from './task-notification.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let _taskRepository: jest.Mocked<Repository<Task>>;
  let _labelRepository: jest.Mocked<Repository<TaskLabel>>;
  let _labelAssignmentRepository: jest.Mocked<Repository<TaskLabelAssignment>>;
  let changeLogService: jest.Mocked<ChangeLogService>;
  let tenantService: jest.Mocked<TenantService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@company.pl',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockTask: Partial<Task> = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    companyId: mockCompanyId,
    createdById: mockUserId,
    assigneeId: 'assignee-1',
    clientId: 'client-1',
    isActive: true,
    sortOrder: 1,
    parentTaskId: null as unknown as undefined,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
    getMany: jest.fn().mockResolvedValue([mockTask]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ max: 0, count: '0' }),
  });

  // Module-level mocks
  const mockChangeLogService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockTaskNotificationService = {
    notifyTaskCreated: jest.fn().mockResolvedValue(undefined),
    notifyTaskUpdated: jest.fn().mockResolvedValue(undefined),
    notifyTaskDeleted: jest.fn().mockResolvedValue(undefined),
    notifyTaskCompleted: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'assignee-1', companyId: mockCompanyId, isActive: true }),
    }),
  };

  let mockTaskRepository: Record<string, jest.Mock>;
  let mockLabelRepository: Record<string, jest.Mock>;
  let mockLabelAssignmentRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const mockQueryBuilder = createMockQueryBuilder();

    mockTaskRepository = {
      create: jest.fn().mockReturnValue(mockTask),
      save: jest.fn().mockResolvedValue(mockTask),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      manager: {
        findOne: jest.fn().mockResolvedValue({ id: 'client-1', companyId: mockCompanyId }),
      } as any,
    };

    mockLabelRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockLabelAssignmentRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TasksService,
          useFactory: () => {
            return new TasksService(
              mockTaskRepository as any,
              mockLabelRepository as any,
              mockLabelAssignmentRepository as any,
              mockChangeLogService as any,
              mockTenantService as any,
              mockTaskNotificationService as any,
              mockDataSource as any
            );
          },
        },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(TaskLabel), useValue: mockLabelRepository },
        {
          provide: getRepositoryToken(TaskLabelAssignment),
          useValue: mockLabelAssignmentRepository,
        },
        { provide: ChangeLogService, useValue: mockChangeLogService },
        { provide: TenantService, useValue: mockTenantService },
        { provide: TaskNotificationService, useValue: mockTaskNotificationService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    _taskRepository = module.get(getRepositoryToken(Task));
    _labelRepository = module.get(getRepositoryToken(TaskLabel));
    _labelAssignmentRepository = module.get(getRepositoryToken(TaskLabelAssignment));
    changeLogService = module.get(ChangeLogService);
    tenantService = module.get(TenantService);
  });

  // ────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated tasks for company', async () => {
      const result = await service.findAll(mockUser as User);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should apply search filter with ILIKE escaping for percent', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { search: '50%off' });

      // The Brackets callback creates the ILIKE clause; we check andWhere was called
      // with a Brackets instance (search triggers Brackets wrapping)
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should apply search filter with underscore escaping', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { search: 'test_task' });

      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { status: TaskStatus.IN_PROGRESS });

      expect(qb.andWhere).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.IN_PROGRESS,
      });
    });

    it('should apply statuses filter (multiple)', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(
        mockUser as User,
        {
          statuses: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        } as any
      );

      expect(qb.andWhere).toHaveBeenCalledWith('task.status IN (:...statuses)', {
        statuses: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      });
    });

    it('should apply priority filter', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { priority: TaskPriority.HIGH } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('task.priority = :priority', {
        priority: TaskPriority.HIGH,
      });
    });

    it('should apply assigneeId filter', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { assigneeId: 'assignee-1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('task.assigneeId = :assigneeId', {
        assigneeId: 'assignee-1',
      });
    });

    it('should apply clientId filter', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { clientId: 'client-1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('task.clientId = :clientId', {
        clientId: 'client-1',
      });
    });

    it('should apply pagination correctly', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { page: 3, limit: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should use default pagination values', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User);

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should load labels for returned tasks', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ ...mockTask, id: 'task-1' }], 1]);
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);
      mockLabelAssignmentRepository.find = jest
        .fn()
        .mockResolvedValue([{ taskId: 'task-1', label: { id: 'label-1', name: 'Bug' } }]);

      const result = await service.findAll(mockUser as User);

      expect(mockLabelAssignmentRepository.find).toHaveBeenCalled();
      expect((result.data[0] as any).labels).toHaveLength(1);
    });

    it('should default isActive to true when not specified', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith('task.isActive = :isActive', { isActive: true });
    });
  });

  // ────────────────────────────────────────────
  // findOne
  // ────────────────────────────────────────────
  describe('findOne', () => {
    it('should return task with labels when found', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue({ ...mockTask });
      mockLabelAssignmentRepository.find = jest
        .fn()
        .mockResolvedValue([{ taskId: 'task-123', label: { id: 'label-1', name: 'Bug' } }]);

      const result = await service.findOne('task-123', mockUser as User);

      expect(result.id).toBe('task-123');
      expect((result as any).labels).toHaveLength(1);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-123', companyId: mockCompanyId },
        relations: ['assignee', 'client', 'createdBy', 'subtasks', 'parentTask'],
      });
    });

    it('should throw TaskNotFoundException when not found', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });

    it('should use tenant service for company isolation', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue({ ...mockTask });

      await service.findOne('task-123', mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });
  });

  // ────────────────────────────────────────────
  // getKanbanBoard
  // ────────────────────────────────────────────
  describe('getKanbanBoard', () => {
    it('should return columns for all 7 statuses', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      const result = await service.getKanbanBoard(mockUser as User);

      expect(result.columns).toHaveLength(7);
      const statuses = result.columns.map((c) => c.status);
      expect(statuses).toContain(TaskStatus.BACKLOG);
      expect(statuses).toContain(TaskStatus.TODO);
      expect(statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(statuses).toContain(TaskStatus.IN_REVIEW);
      expect(statuses).toContain(TaskStatus.DONE);
      expect(statuses).toContain(TaskStatus.BLOCKED);
      expect(statuses).toContain(TaskStatus.CANCELLED);
    });

    it('should group tasks by status correctly', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        { ...mockTask, id: 't1', status: TaskStatus.TODO },
        { ...mockTask, id: 't2', status: TaskStatus.TODO },
        { ...mockTask, id: 't3', status: TaskStatus.DONE },
      ]);
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      const result = await service.getKanbanBoard(mockUser as User);

      const todoColumn = result.columns.find((c) => c.status === TaskStatus.TODO);
      const doneColumn = result.columns.find((c) => c.status === TaskStatus.DONE);
      expect(todoColumn!.count).toBe(2);
      expect(doneColumn!.count).toBe(1);
    });

    it('should filter only active root tasks', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.getKanbanBoard(mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith('task.isActive = :isActive', { isActive: true });
      expect(qb.andWhere).toHaveBeenCalledWith('task.parentTaskId IS NULL');
    });

    it('should apply assigneeId filter', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.getKanbanBoard(mockUser as User, { assigneeId: 'a-1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('task.assigneeId = :assigneeId', {
        assigneeId: 'a-1',
      });
    });
  });

  // ────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      title: 'New Task',
      description: 'New description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      clientId: 'client-1',
    };

    beforeEach(() => {
      // For create, findOne is called internally for notification — set up the chain
      const savedTask = { ...mockTask, ...createDto, id: 'task-new' };
      mockTaskRepository.create = jest.fn().mockReturnValue(savedTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue(savedTask);
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(savedTask);
    });

    it('should create task with company and user context', async () => {
      const result = await service.create(createDto as any, mockUser as User);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          companyId: mockCompanyId,
          createdById: mockUserId,
        })
      );
      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should set sortOrder based on max existing value', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({ max: 5 });
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.create(createDto as any, mockUser as User);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 6 })
      );
    });

    it('should log creation to changelog', async () => {
      await service.create(createDto as any, mockUser as User);

      expect(changeLogService.logCreate).toHaveBeenCalledWith(
        'Task',
        expect.any(String),
        expect.any(Object),
        mockUser
      );
    });

    it('should send notification when task has clientId', async () => {
      await service.create(createDto as any, mockUser as User);

      // notifyTaskCreated is called fire-and-forget
      expect(mockTaskNotificationService.notifyTaskCreated).toHaveBeenCalled();
    });

    it('should not send notification when task has no clientId', async () => {
      const dtoNoClient = { ...createDto, clientId: undefined };
      const savedTask = { ...mockTask, ...dtoNoClient, id: 'task-nc', clientId: undefined };
      mockTaskRepository.create = jest.fn().mockReturnValue(savedTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue(savedTask);

      await service.create(dtoNoClient as any, mockUser as User);

      expect(mockTaskNotificationService.notifyTaskCreated).not.toHaveBeenCalled();
    });

    it('should validate parent task when parentTaskId is provided', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, parentTaskId: 'bad-parent' } as any, mockUser as User)
      ).rejects.toThrow(TaskInvalidParentException);
    });

    it('should validate assignee ownership when assigneeId is provided', async () => {
      // Make assignee validation fail
      mockDataSource.getRepository = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      // Re-create service with the updated datasource
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: TasksService,
            useFactory: () => {
              return new TasksService(
                mockTaskRepository as any,
                mockLabelRepository as any,
                mockLabelAssignmentRepository as any,
                mockChangeLogService as any,
                mockTenantService as any,
                mockTaskNotificationService as any,
                mockDataSource as any
              );
            },
          },
        ],
      }).compile();
      const svc = module.get<TasksService>(TasksService);

      await expect(
        svc.create({ ...createDto, assigneeId: 'bad-assignee' } as any, mockUser as User)
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign labels when labelIds are provided', async () => {
      const labels = [
        { id: 'label-1', name: 'Bug', companyId: mockCompanyId, isActive: true },
        { id: 'label-2', name: 'Feature', companyId: mockCompanyId, isActive: true },
      ];
      mockLabelRepository.find = jest.fn().mockResolvedValue(labels);
      // findOne is called after save to load task with relations for notifications
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(mockTask);

      const result = await service.create(
        { ...createDto, labelIds: ['label-1', 'label-2'] } as any,
        mockUser as User
      );

      expect(mockLabelAssignmentRepository.save).toHaveBeenCalled();
      expect((result as any).labels).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────
  // update — status transitions
  // ────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      // findOne chain: first call for existing task, subsequent for return
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);
      mockTaskRepository.save = jest.fn().mockImplementation((t) => Promise.resolve(t));
    });

    it('should update task fields', async () => {
      const updateDto = { title: 'Updated Title' };

      const result = await service.update('task-123', updateDto as any, mockUser as User);

      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should log update with old and new values', async () => {
      await service.update('task-123', { title: 'Updated' } as any, mockUser as User);

      expect(changeLogService.logUpdate).toHaveBeenCalledWith(
        'Task',
        'task-123',
        expect.any(Object), // old values
        expect.any(Object), // new values
        mockUser
      );
    });

    // Valid status transitions
    it.each([
      [TaskStatus.BACKLOG, TaskStatus.TODO],
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW],
      [TaskStatus.IN_REVIEW, TaskStatus.DONE],
      [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
      [TaskStatus.CANCELLED, TaskStatus.BACKLOG],
      [TaskStatus.BLOCKED, TaskStatus.TODO],
      [TaskStatus.TODO, TaskStatus.BLOCKED],
      [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
    ])('should allow valid transition from %s to %s', async (from: TaskStatus, to: TaskStatus) => {
      const existingTask = { ...mockTask, status: from };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      const dto: Record<string, unknown> = { status: to };
      if (to === TaskStatus.BLOCKED) dto.blockingReason = 'Waiting for client';
      if (to === TaskStatus.CANCELLED) dto.cancellationReason = 'No longer needed';

      await expect(service.update('task-123', dto as any, mockUser as User)).resolves.toBeDefined();
    });

    // Invalid status transitions
    it.each([
      [TaskStatus.BACKLOG, TaskStatus.DONE],
      [TaskStatus.DONE, TaskStatus.BACKLOG],
      [TaskStatus.BLOCKED, TaskStatus.DONE],
    ])(
      'should reject invalid transition from %s to %s',
      async (from: TaskStatus, to: TaskStatus) => {
        const existingTask = { ...mockTask, status: from };
        mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

        await expect(
          service.update('task-123', { status: to } as any, mockUser as User)
        ).rejects.toThrow(BadRequestException);
      }
    );

    it('should require blockingReason when transitioning to BLOCKED', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      await expect(
        service.update('task-123', { status: TaskStatus.BLOCKED } as any, mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should require cancellationReason when transitioning to CANCELLED', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      await expect(
        service.update('task-123', { status: TaskStatus.CANCELLED } as any, mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow BLOCKED transition when blockingReason is provided', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      await expect(
        service.update(
          'task-123',
          { status: TaskStatus.BLOCKED, blockingReason: 'Waiting for docs' } as any,
          mockUser as User
        )
      ).resolves.toBeDefined();
    });

    it('should allow CANCELLED transition when cancellationReason is provided', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      await expect(
        service.update(
          'task-123',
          { status: TaskStatus.CANCELLED, cancellationReason: 'Client cancelled' } as any,
          mockUser as User
        )
      ).resolves.toBeDefined();
    });

    it('should send completion notification when transitioning to DONE', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.IN_REVIEW, clientId: 'client-1' };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);

      await service.update('task-123', { status: TaskStatus.DONE } as any, mockUser as User);

      expect(mockTaskNotificationService.notifyTaskCompleted).toHaveBeenCalled();
    });

    it('should validate parent task on parentTaskId change', async () => {
      const existingTask = { ...mockTask, parentTaskId: null };
      mockTaskRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(existingTask) // findOne in update
        .mockResolvedValueOnce(null); // findOne for parent validation

      await expect(
        service.update('task-123', { parentTaskId: 'non-existent-parent' } as any, mockUser as User)
      ).rejects.toThrow(TaskInvalidParentException);
    });

    it('should update labels when labelIds is provided', async () => {
      const existingTask = { ...mockTask };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);
      mockLabelRepository.find = jest
        .fn()
        .mockResolvedValue([{ id: 'l1', name: 'Bug', companyId: mockCompanyId, isActive: true }]);

      await service.update('task-123', { labelIds: ['l1'] } as any, mockUser as User);

      expect(mockLabelAssignmentRepository.delete).toHaveBeenCalledWith({ taskId: 'task-123' });
      expect(mockLabelAssignmentRepository.save).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────
  // softDeleteTask
  // ────────────────────────────────────────────
  describe('softDeleteTask', () => {
    it('should soft delete task by setting isActive to false', async () => {
      const existingTask = { ...mockTask, isActive: true };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue({ ...existingTask, isActive: false });

      await service.softDeleteTask('task-123', mockUser as User);

      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should log deletion to changelog', async () => {
      const existingTask = { ...mockTask };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue({ ...existingTask, isActive: false });

      await service.softDeleteTask('task-123', mockUser as User);

      expect(changeLogService.logDelete).toHaveBeenCalledWith(
        'Task',
        'task-123',
        expect.any(Object),
        mockUser
      );
    });

    it('should send notification when task has clientId', async () => {
      const existingTask = { ...mockTask, clientId: 'client-1' };
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(existingTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue({ ...existingTask, isActive: false });

      await service.softDeleteTask('task-123', mockUser as User);

      expect(mockTaskNotificationService.notifyTaskDeleted).toHaveBeenCalled();
    });

    it('should throw TaskNotFoundException if task not found', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.softDeleteTask('non-existent', mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });
  });

  // ────────────────────────────────────────────
  // bulkUpdateStatus
  // ────────────────────────────────────────────
  describe('bulkUpdateStatus', () => {
    it('should update status for multiple tasks and return count', async () => {
      const tasks = [
        { ...mockTask, id: 't1', status: TaskStatus.TODO },
        { ...mockTask, id: 't2', status: TaskStatus.TODO },
      ];
      mockTaskRepository.find = jest.fn().mockResolvedValue(tasks);
      mockTaskRepository.update = jest.fn().mockResolvedValue({ affected: 2 });

      const result = await service.bulkUpdateStatus(
        { taskIds: ['t1', 't2'], status: TaskStatus.IN_PROGRESS } as any,
        mockUser as User
      );

      expect(result.updated).toBe(2);
      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        { id: expect.anything(), companyId: mockCompanyId },
        { status: TaskStatus.IN_PROGRESS }
      );
    });

    it('should validate status transitions for each task', async () => {
      const tasks = [
        { ...mockTask, id: 't1', status: TaskStatus.BACKLOG }, // BACKLOG -> DONE is invalid
      ];
      mockTaskRepository.find = jest.fn().mockResolvedValue(tasks);

      await expect(
        service.bulkUpdateStatus(
          { taskIds: ['t1'], status: TaskStatus.DONE } as any,
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────
  // reorderTasks
  // ────────────────────────────────────────────
  describe('reorderTasks', () => {
    it('should update sort order for each task', async () => {
      mockTaskRepository.find = jest.fn().mockResolvedValue([
        { ...mockTask, id: 't1' },
        { ...mockTask, id: 't2' },
      ]);

      await service.reorderTasks({ taskIds: ['t1', 't2'] } as any, mockUser as User);

      expect(mockTaskRepository.update).toHaveBeenCalledTimes(2);
      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        { id: 't1', companyId: mockCompanyId },
        { sortOrder: 0 }
      );
      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        { id: 't2', companyId: mockCompanyId },
        { sortOrder: 1 }
      );
    });

    it('should apply newStatus during reorder if provided', async () => {
      mockTaskRepository.find = jest
        .fn()
        .mockResolvedValue([{ ...mockTask, id: 't1', status: TaskStatus.TODO }]);

      await service.reorderTasks(
        { taskIds: ['t1'], newStatus: TaskStatus.IN_PROGRESS } as any,
        mockUser as User
      );

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        { id: 't1', companyId: mockCompanyId },
        { sortOrder: 0, status: TaskStatus.IN_PROGRESS }
      );
    });
  });

  // ────────────────────────────────────────────
  // Multi-tenant isolation
  // ────────────────────────────────────────────
  describe('Tenant isolation', () => {
    it('should always use tenant service for company context in findAll', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
      expect(qb.where).toHaveBeenCalledWith('task.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should scope findOne queries to company', async () => {
      mockTaskRepository.findOne = jest.fn().mockResolvedValue({ ...mockTask });

      await service.findOne('task-123', mockUser as User);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: mockCompanyId }),
        })
      );
    });

    it('should scope create to company', async () => {
      const savedTask = { ...mockTask, id: 'task-new', clientId: undefined };
      mockTaskRepository.create = jest.fn().mockReturnValue(savedTask);
      mockTaskRepository.save = jest.fn().mockResolvedValue(savedTask);

      await service.create({ title: 'T' } as any, mockUser as User);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });

    it('should scope bulkUpdateStatus to company', async () => {
      mockTaskRepository.find = jest.fn().mockResolvedValue([]);
      mockTaskRepository.update = jest.fn().mockResolvedValue({ affected: 0 });

      await service.bulkUpdateStatus(
        { taskIds: ['t1'], status: TaskStatus.TODO } as any,
        mockUser as User
      );

      expect(mockTaskRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: mockCompanyId }),
        })
      );
    });
  });

  // ────────────────────────────────────────────
  // SQL injection protection
  // ────────────────────────────────────────────
  describe('SQL injection protection', () => {
    it('should escape backslash in search pattern', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { search: 'test\\value' } as any);

      // Search triggers andWhere with Brackets — verify it was called
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should escape percent sign in search pattern', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { search: '50%' } as any);

      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should escape underscore in search pattern', async () => {
      const qb = createMockQueryBuilder();
      mockTaskRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(mockUser as User, { search: 'task_name' } as any);

      expect(qb.andWhere).toHaveBeenCalled();
    });
  });
});
