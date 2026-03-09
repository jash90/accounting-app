import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  PaginatedResponseDto,
  Task,
  TaskPriority,
  TaskStatus,
  type User,
  UserRole,
} from '@accounting/common';
import { type TenantService } from '@accounting/common/backend';

import { TaskTemplateService } from './task-template.service';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;
  let taskRepository: jest.Mocked<
    Pick<Repository<Task>, 'findAndCount' | 'findOne' | 'create' | 'save'>
  >;
  let tenantService: jest.Mocked<Pick<TenantService, 'getEffectiveCompanyId'>>;

  const companyId = 'company-uuid-1';
  const userId = 'user-uuid-1';

  const mockUser = {
    id: userId,
    companyId,
    role: UserRole.COMPANY_OWNER,
  } as User;

  const mockTemplate: Partial<Task> = {
    id: 'template-uuid-1',
    title: 'Monthly report',
    description: 'Generate monthly report',
    priority: TaskPriority.HIGH,
    companyId,
    createdById: userId,
    isTemplate: true,
    isActive: true,
    status: TaskStatus.TODO,
    assigneeId: 'assignee-uuid-1',
    clientId: 'client-uuid-1',
    estimatedMinutes: 120,
    sortOrder: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    tenantService = {
      getEffectiveCompanyId: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskTemplateService,
          useFactory: () =>
            new TaskTemplateService(
              taskRepository as unknown as Repository<Task>,
              tenantService as unknown as TenantService,
            ),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
      ],
    }).compile();

    service = module.get(TaskTemplateService);
  });

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const templates = [mockTemplate as Task];
      taskRepository.findAndCount.mockResolvedValue([templates, 1]);

      const result = await service.findAll(mockUser, { page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual(templates);
      expect(result.meta.total).toBe(1);
      expect(taskRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId,
            isTemplate: true,
            isActive: true,
          }),
          relations: ['assignee', 'client'],
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('should apply search filter with ILIKE escaping', async () => {
      taskRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(mockUser, { search: '100%_done', page: 1, limit: 10 });

      expect(taskRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              _type: 'ilike',
              _value: '%100\\%\\_done%',
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      taskRepository.findOne.mockResolvedValue(mockTemplate as Task);

      const result = await service.findOne('template-uuid-1', mockUser);

      expect(result).toEqual(mockTemplate);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-uuid-1', companyId, isTemplate: true },
        relations: ['assignee', 'client'],
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a template with isTemplate=true and status=TODO', async () => {
      const dto = {
        title: 'New template',
        description: 'Test desc',
        priority: TaskPriority.MEDIUM,
        assigneeId: 'assignee-uuid-1',
        clientId: 'client-uuid-1',
        estimatedMinutes: 60,
      };

      const created = { ...mockTemplate, ...dto } as Task;
      taskRepository.create.mockReturnValue(created);
      taskRepository.save.mockResolvedValue(created);

      const result = await service.create(dto, mockUser);

      expect(result).toEqual(created);
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.title,
          companyId,
          createdById: userId,
          isTemplate: true,
          status: TaskStatus.TODO,
          sortOrder: 0,
        }),
      );
      expect(taskRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      const template = { ...mockTemplate } as Task;
      taskRepository.findOne.mockResolvedValue(template);
      taskRepository.save.mockResolvedValue({ ...template, title: 'Updated' } as Task);

      const result = await service.update(
        'template-uuid-1',
        { title: 'Updated' },
        mockUser,
      );

      expect(result.title).toBe('Updated');
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'X' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDeleteTaskTemplate', () => {
    it('should set isActive to false', async () => {
      const template = { ...mockTemplate, isActive: true } as Task;
      taskRepository.findOne.mockResolvedValue(template);
      taskRepository.save.mockResolvedValue({ ...template, isActive: false } as Task);

      await service.softDeleteTaskTemplate('template-uuid-1', mockUser);

      expect(template.isActive).toBe(false);
      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('createTaskFromTemplate', () => {
    it('should create a task copying template fields with isTemplate=false and templateId set', async () => {
      const template = { ...mockTemplate, id: 'template-uuid-1' } as Task;
      taskRepository.findOne.mockResolvedValue(template);

      const createdTask = {
        ...template,
        id: 'task-uuid-new',
        isTemplate: false,
        templateId: 'template-uuid-1',
      } as Task;
      taskRepository.create.mockReturnValue(createdTask);
      taskRepository.save.mockResolvedValue(createdTask);

      const result = await service.createTaskFromTemplate('template-uuid-1', mockUser);

      expect(result.isTemplate).toBe(false);
      expect(result.templateId).toBe('template-uuid-1');
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: template.title,
          description: template.description,
          priority: template.priority,
          assigneeId: template.assigneeId,
          clientId: template.clientId,
          estimatedMinutes: template.estimatedMinutes,
          companyId,
          createdById: userId,
          isTemplate: false,
          status: TaskStatus.TODO,
          sortOrder: 0,
          templateId: 'template-uuid-1',
        }),
      );
    });
  });
});
