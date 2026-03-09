import { TenantService } from '@accounting/common/backend';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { Task, TaskDependency, TaskDependencyType, UserRole, type User } from '@accounting/common';

import {
  TaskDependencyAlreadyExistsException,
  TaskDependencyCycleException,
  TaskDependencyNotFoundException,
  TaskNotFoundException,
  TaskSelfDependencyException,
} from '../exceptions';
import { TaskDependenciesService } from './task-dependencies.service';

describe('TaskDependenciesService', () => {
  let service: TaskDependenciesService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let dependencyRepository: jest.Mocked<Repository<TaskDependency>>;
  let tenantService: jest.Mocked<TenantService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockTaskId = 'task-123';
  const mockDependsOnTaskId = 'task-456';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
    firstName: 'Jan',
    lastName: 'Kowalski',
  };

  const mockTask: Partial<Task> = {
    id: mockTaskId,
    companyId: mockCompanyId,
    title: 'Test task',
  };

  const mockDependsOnTask: Partial<Task> = {
    id: mockDependsOnTaskId,
    companyId: mockCompanyId,
    title: 'Dependency task',
  };

  const mockDependency: Partial<TaskDependency> = {
    id: 'dep-123',
    taskId: mockTaskId,
    dependsOnTaskId: mockDependsOnTaskId,
    dependencyType: TaskDependencyType.BLOCKED_BY,
    createdById: mockUserId,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const mockTaskRepository = {
      findOne: jest.fn(),
    };

    const mockDependencyRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TaskDependenciesService,
          useFactory: () => {
            return new TaskDependenciesService(
              mockTaskRepository as any,
              mockDependencyRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(TaskDependency),
          useValue: mockDependencyRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<TaskDependenciesService>(TaskDependenciesService);
    taskRepository = module.get(getRepositoryToken(Task));
    dependencyRepository = module.get(getRepositoryToken(TaskDependency));
    tenantService = module.get(TenantService);
  });

  describe('findAllForTask', () => {
    it('should return dependencies for a task', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(mockTask);
      dependencyRepository.find = jest.fn().mockResolvedValue([mockDependency]);

      const result = await service.findAllForTask(mockTaskId, mockUser as User);

      expect(result).toEqual([mockDependency]);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTaskId, companyId: mockCompanyId },
      });
      expect(dependencyRepository.find).toHaveBeenCalledWith({
        where: { taskId: mockTaskId },
        relations: ['dependsOnTask', 'dependsOnTask.assignee'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findAllForTask(mockTaskId, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });

    it('should enforce tenant isolation via companyId filter', async () => {
      const otherCompanyId = 'other-company-789';
      mockTenantService.getEffectiveCompanyId.mockResolvedValue(otherCompanyId);
      taskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findAllForTask(mockTaskId, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTaskId, companyId: otherCompanyId },
      });
    });
  });

  describe('findBlockedBy', () => {
    it('should return dependencies where task is blocked by others', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(mockTask);
      dependencyRepository.find = jest.fn().mockResolvedValue([mockDependency]);

      const result = await service.findBlockedBy(mockTaskId, mockUser as User);

      expect(result).toEqual([mockDependency]);
      expect(dependencyRepository.find).toHaveBeenCalledWith({
        where: { taskId: mockTaskId },
        relations: ['dependsOnTask'],
      });
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findBlockedBy(mockTaskId, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });
  });

  describe('findBlocking', () => {
    it('should return dependencies where task is blocking others', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(mockTask);
      const blockingDep: Partial<TaskDependency> = {
        id: 'dep-789',
        taskId: 'task-other',
        dependsOnTaskId: mockTaskId,
      };
      dependencyRepository.find = jest.fn().mockResolvedValue([blockingDep]);

      const result = await service.findBlocking(mockTaskId, mockUser as User);

      expect(result).toEqual([blockingDep]);
      expect(dependencyRepository.find).toHaveBeenCalledWith({
        where: { dependsOnTaskId: mockTaskId },
        relations: ['task'],
      });
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findBlocking(mockTaskId, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });
  });

  describe('create', () => {
    const createDto = {
      dependsOnTaskId: mockDependsOnTaskId,
      dependencyType: TaskDependencyType.BLOCKED_BY,
    };

    it('should create a dependency successfully', async () => {
      taskRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockTask) // task lookup
        .mockResolvedValueOnce(mockDependsOnTask); // dependsOnTask lookup
      dependencyRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null) // no existing dependency
        .mockResolvedValueOnce(mockDependency); // return after save (reload with relations)
      dependencyRepository.find = jest.fn().mockResolvedValue([]); // cycle check - no deps
      dependencyRepository.create = jest.fn().mockReturnValue(mockDependency);
      dependencyRepository.save = jest.fn().mockResolvedValue(mockDependency);

      const result = await service.create(mockTaskId, createDto, mockUser as User);

      expect(result).toEqual(mockDependency);
      expect(dependencyRepository.create).toHaveBeenCalledWith({
        taskId: mockTaskId,
        dependsOnTaskId: mockDependsOnTaskId,
        dependencyType: TaskDependencyType.BLOCKED_BY,
        createdById: mockUserId,
      });
      expect(dependencyRepository.save).toHaveBeenCalled();
    });

    it('should throw TaskSelfDependencyException for self-dependency', async () => {
      const selfDto = {
        dependsOnTaskId: mockTaskId,
        dependencyType: TaskDependencyType.BLOCKED_BY,
      };

      await expect(service.create(mockTaskId, selfDto, mockUser as User)).rejects.toThrow(
        TaskSelfDependencyException
      );

      // Should not even call the repository
      expect(taskRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.create(mockTaskId, createDto, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });

    it('should throw TaskNotFoundException when dependsOnTask does not exist', async () => {
      taskRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockTask) // task exists
        .mockResolvedValueOnce(null); // dependsOnTask does not exist

      await expect(service.create(mockTaskId, createDto, mockUser as User)).rejects.toThrow(
        TaskNotFoundException
      );
    });

    it('should throw TaskDependencyAlreadyExistsException for duplicate dependency', async () => {
      taskRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockDependsOnTask);
      dependencyRepository.findOne = jest.fn().mockResolvedValue(mockDependency); // already exists

      await expect(service.create(mockTaskId, createDto, mockUser as User)).rejects.toThrow(
        TaskDependencyAlreadyExistsException
      );
    });

    it('should throw TaskDependencyCycleException when cycle would be created', async () => {
      // Scenario: task-123 depends on task-456, now trying to make task-456 depend on task-123
      const reverseDto = {
        dependsOnTaskId: mockTaskId, // task-123
        dependencyType: TaskDependencyType.BLOCKED_BY,
      };

      taskRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockDependsOnTask) // task-456 exists
        .mockResolvedValueOnce(mockTask); // task-123 exists
      dependencyRepository.findOne = jest.fn().mockResolvedValue(null); // no existing dup

      // Cycle detection: when checking from task-123 (dependsOnTaskId), find that task-123
      // depends on task-456 (the taskId we're adding the dep to)
      dependencyRepository.find = jest
        .fn()
        .mockResolvedValue([{ dependsOnTaskId: mockDependsOnTaskId } as Partial<TaskDependency>]);

      await expect(
        service.create(mockDependsOnTaskId, reverseDto, mockUser as User)
      ).rejects.toThrow(TaskDependencyCycleException);
    });
  });

  describe('remove', () => {
    it('should remove a dependency successfully', async () => {
      const depWithTask = {
        ...mockDependency,
        task: { ...mockTask },
      };
      dependencyRepository.findOne = jest.fn().mockResolvedValue(depWithTask);
      dependencyRepository.remove = jest.fn().mockResolvedValue(undefined);

      await service.remove('dep-123', mockUser as User);

      expect(dependencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'dep-123' },
        relations: ['task'],
      });
      expect(dependencyRepository.remove).toHaveBeenCalledWith(depWithTask);
    });

    it('should throw TaskDependencyNotFoundException when dependency does not exist', async () => {
      dependencyRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('nonexistent-dep', mockUser as User)).rejects.toThrow(
        TaskDependencyNotFoundException
      );
    });

    it('should throw TaskDependencyNotFoundException for tenant isolation violation', async () => {
      const depFromOtherCompany = {
        ...mockDependency,
        task: { ...mockTask, companyId: 'other-company-789' },
      };
      dependencyRepository.findOne = jest.fn().mockResolvedValue(depFromOtherCompany);

      await expect(service.remove('dep-123', mockUser as User)).rejects.toThrow(
        TaskDependencyNotFoundException
      );

      expect(dependencyRepository.remove).not.toHaveBeenCalled();
    });
  });
});
