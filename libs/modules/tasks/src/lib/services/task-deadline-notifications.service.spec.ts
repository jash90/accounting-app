import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Task, TaskPriority, TaskStatus } from '@accounting/common';

import { TaskDeadlineNotificationsService } from './task-deadline-notifications.service';
import { TaskNotificationService } from './task-notification.service';

describe('TaskDeadlineNotificationsService', () => {
  let service: TaskDeadlineNotificationsService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let notificationService: jest.Mocked<Pick<TaskNotificationService, 'notifyTaskOverdue'>>;

  const companyId = 'company-1';

  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: 'task-1',
      title: 'Rozliczenie VAT',
      companyId,
      clientId: 'client-1',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      isTemplate: false,
      isActive: true,
      dueDate: new Date('2026-03-01'),
      assignee: { firstName: 'Anna', lastName: 'Nowak' },
      client: { id: 'client-1', name: 'Klient ABC' },
      ...overrides,
    }) as unknown as Task;

  // Helper to set up the query builder mock for processDueSoonTasks
  const createMockQueryBuilder = (tasks: Task[]) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(tasks),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepository = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder([])),
    } as unknown as jest.Mocked<Repository<Task>>;

    notificationService = {
      notifyTaskOverdue: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskDeadlineNotificationsService,
          useFactory: () =>
            new TaskDeadlineNotificationsService(
              taskRepository as any,
              notificationService as any
            ),
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: TaskNotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(TaskDeadlineNotificationsService);
  });

  // ── processOverdueTasks ────────────────────────────────────────────

  describe('processOverdueTasks', () => {
    it('should find overdue tasks and call notifyTaskOverdue for each', async () => {
      const overdueTasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ];
      taskRepository.find.mockResolvedValue(overdueTasks);

      await service.processOverdueTasks();

      expect(taskRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isTemplate: false,
            isActive: true,
          }),
          relations: ['assignee', 'client'],
        })
      );
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledTimes(2);
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledWith(overdueTasks[0]);
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledWith(overdueTasks[1]);
    });

    it('should handle no matching tasks (no-op)', async () => {
      taskRepository.find.mockResolvedValue([]);

      await service.processOverdueTasks();

      expect(notificationService.notifyTaskOverdue).not.toHaveBeenCalled();
    });

    it('should skip templates (isTemplate filter in query)', async () => {
      taskRepository.find.mockResolvedValue([]);

      await service.processOverdueTasks();

      expect(taskRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isTemplate: false,
          }),
        })
      );
    });

    it('should skip inactive tasks (isActive filter in query)', async () => {
      taskRepository.find.mockResolvedValue([]);

      await service.processOverdueTasks();

      expect(taskRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should log failure per task but continue processing others', async () => {
      const tasks = [
        createMockTask({ id: 'task-fail' }),
        createMockTask({ id: 'task-ok' }),
      ];
      taskRepository.find.mockResolvedValue(tasks);

      notificationService.notifyTaskOverdue
        .mockRejectedValueOnce(new Error('SMTP failure'))
        .mockResolvedValueOnce(undefined);

      await expect(service.processOverdueTasks()).resolves.toBeUndefined();

      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledTimes(2);
      // Second task should still be processed despite first failing
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledWith(tasks[1]);
    });
  });

  // ── processDueSoonTasks ────────────────────────────────────────────

  describe('processDueSoonTasks', () => {
    it('should find tasks due within 3 days and call notifyTaskOverdue', async () => {
      const dueSoonTasks = [createMockTask({ id: 'task-soon' })];
      taskRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(dueSoonTasks) as any
      );

      await service.processDueSoonTasks();

      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledTimes(1);
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledWith(dueSoonTasks[0]);
    });

    it('should only process tasks with clientId (filter in query)', async () => {
      taskRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([]) as any
      );

      await service.processDueSoonTasks();

      const qb = taskRepository.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith('task.clientId IS NOT NULL');
    });

    it('should handle no matching tasks (no-op)', async () => {
      taskRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([]) as any
      );

      await service.processDueSoonTasks();

      expect(notificationService.notifyTaskOverdue).not.toHaveBeenCalled();
    });

    it('should log failure per task but continue processing others', async () => {
      const tasks = [
        createMockTask({ id: 'task-fail' }),
        createMockTask({ id: 'task-ok' }),
      ];
      taskRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(tasks) as any
      );

      notificationService.notifyTaskOverdue
        .mockRejectedValueOnce(new Error('Email send failed'))
        .mockResolvedValueOnce(undefined);

      await expect(service.processDueSoonTasks()).resolves.toBeUndefined();

      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledTimes(2);
      expect(notificationService.notifyTaskOverdue).toHaveBeenCalledWith(tasks[1]);
    });
  });
});
