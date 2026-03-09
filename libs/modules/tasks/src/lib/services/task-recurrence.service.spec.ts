import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Task, TaskPriority, TaskStatus } from '@accounting/common';

import { TaskRecurrenceService } from './task-recurrence.service';

describe('TaskRecurrenceService', () => {
  let service: TaskRecurrenceService;
  let taskRepository: jest.Mocked<
    Pick<Repository<Task>, 'find' | 'findOne' | 'create' | 'save'>
  >;

  const companyId = 'company-uuid-1';
  const userId = 'user-uuid-1';

  function makeTemplate(overrides: Partial<Task> = {}): Task {
    return {
      id: 'template-uuid-1',
      title: 'Daily standup notes',
      description: 'Prepare daily standup notes',
      priority: TaskPriority.MEDIUM,
      companyId,
      createdById: userId,
      isTemplate: true,
      isActive: true,
      status: TaskStatus.TODO,
      assigneeId: 'assignee-uuid-1',
      clientId: 'client-uuid-1',
      estimatedMinutes: 15,
      sortOrder: 0,
      recurrencePattern: { frequency: 'daily', interval: 1 },
      lastRecurrenceDate: null,
      recurrenceEndDate: null,
      ...overrides,
    } as unknown as Task;
  }

  function todayMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data as Task),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskRecurrenceService,
          useFactory: () =>
            new TaskRecurrenceService(
              taskRepository as unknown as Repository<Task>,
            ),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
      ],
    }).compile();

    service = module.get(TaskRecurrenceService);
  });

  describe('processRecurringTasks', () => {
    it('should create a task from a daily template', async () => {
      const template = makeTemplate();
      taskRepository.find.mockResolvedValue([template]);
      // No existing task today
      taskRepository.findOne.mockResolvedValue(null);

      await service.processRecurringTasks();

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: template.title,
          description: template.description,
          priority: template.priority,
          assigneeId: template.assigneeId,
          clientId: template.clientId,
          companyId,
          isTemplate: false,
          status: TaskStatus.TODO,
          templateId: template.id,
        }),
      );
      // save called twice: once for new task, once for updating lastRecurrenceDate
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a task from a weekly template on the correct day', async () => {
      const today = todayMidnight();
      const dayOfWeek = today.getDay();

      const template = makeTemplate({
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [dayOfWeek],
        },
        lastRecurrenceDate: null,
      });
      taskRepository.find.mockResolvedValue([template]);
      taskRepository.findOne.mockResolvedValue(null);

      await service.processRecurringTasks();

      // Should create because today's day-of-week is in daysOfWeek and daysDiff is Infinity (no last date)
      expect(taskRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should create a task from a monthly template on the correct day', async () => {
      const today = todayMidnight();
      const dayOfMonth = today.getDate();

      const template = makeTemplate({
        recurrencePattern: {
          frequency: 'monthly',
          interval: 1,
          dayOfMonth,
        },
        lastRecurrenceDate: null,
      });
      taskRepository.find.mockResolvedValue([template]);
      taskRepository.findOne.mockResolvedValue(null);

      await service.processRecurringTasks();

      expect(taskRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should skip template when a task was already created today (deduplication)', async () => {
      const _today = todayMidnight();
      const template = makeTemplate();
      taskRepository.find.mockResolvedValue([template]);

      // Existing task created today
      const existingTask = {
        id: 'existing-task',
        templateId: template.id,
        isTemplate: false,
        createdAt: new Date(), // today
      } as Task;
      taskRepository.findOne.mockResolvedValue(existingTask);

      await service.processRecurringTasks();

      // create should NOT be called — deduplication kicks in
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('should skip template with expired recurrenceEndDate', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const template = makeTemplate({
        recurrenceEndDate: yesterday,
      });
      taskRepository.find.mockResolvedValue([template]);

      await service.processRecurringTasks();

      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('should handle interval > 1 correctly for daily', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const template = makeTemplate({
        recurrencePattern: { frequency: 'daily', interval: 3 },
        lastRecurrenceDate: twoDaysAgo,
      });
      taskRepository.find.mockResolvedValue([template]);

      await service.processRecurringTasks();

      // 2 days since last, interval is 3 — should NOT create
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('should update lastRecurrenceDate on template after creating a task', async () => {
      const template = makeTemplate();
      taskRepository.find.mockResolvedValue([template]);
      taskRepository.findOne.mockResolvedValue(null);

      await service.processRecurringTasks();

      // Second save call updates the template's lastRecurrenceDate
      const saveCalls = taskRepository.save.mock.calls;
      expect(saveCalls.length).toBe(2);
      // The second call should be the template with lastRecurrenceDate set to today
      const savedTemplate = saveCalls[1][0] as Task;
      expect(savedTemplate.id).toBe(template.id);
      expect(savedTemplate.lastRecurrenceDate).toBeTruthy();
      const savedDate = new Date(savedTemplate.lastRecurrenceDate as unknown as string);
      savedDate.setHours(0, 0, 0, 0);
      expect(savedDate.getTime()).toBe(todayMidnight().getTime());
    });

    it('should be a no-op when no templates are found', async () => {
      taskRepository.find.mockResolvedValue([]);

      await service.processRecurringTasks();

      expect(taskRepository.create).not.toHaveBeenCalled();
      expect(taskRepository.save).not.toHaveBeenCalled();
    });
  });
});
