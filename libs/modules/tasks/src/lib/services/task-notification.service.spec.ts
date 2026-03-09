import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  Client,
  Company,
  NotificationSettings,
  type Task,
  TaskPriority,
  TaskStatus,
  User,
} from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';

import { TaskNotificationService } from './task-notification.service';

// Mock fs/promises and handlebars to avoid real filesystem access
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('<html>{{taskTitle}}</html>'),
}));

jest.mock('handlebars', () => ({
  compile: jest.fn().mockReturnValue(() => '<html>Compiled</html>'),
}));

describe('TaskNotificationService', () => {
  let service: TaskNotificationService;
  let notificationSettingsRepository: jest.Mocked<Repository<NotificationSettings>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let emailConfigService: jest.Mocked<Pick<EmailConfigurationService, 'getDecryptedSmtpConfigByCompanyId'>>;
  let emailSenderService: jest.Mocked<Pick<EmailSenderService, 'sendBatchEmails'>>;

  const companyId = 'company-1';
  const clientId = 'client-1';
  const mockSmtpConfig = { host: 'smtp.test.com', port: 587, user: 'test', pass: 'pass' };

  const mockUser = {
    id: 'user-1',
    companyId,
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan@test.com',
    isActive: true,
  } as User;

  const mockRecipient = {
    id: 'user-2',
    companyId,
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'anna@test.com',
    isActive: true,
  } as User;

  const mockCompany = { id: companyId, name: 'Firma Testowa' } as Company;
  const mockClient = { id: clientId, name: 'Klient ABC' } as Client;

  const mockTask = {
    id: 'task-1',
    title: 'Rozliczenie VAT',
    companyId,
    clientId,
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: new Date('2026-03-15'),
    assignee: { firstName: 'Anna', lastName: 'Nowak' },
  } as Task;

  // Helper to create a mock QueryBuilder that returns the given users
  const createMockQueryBuilder = (users: User[]) => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(users),
    };
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    notificationSettingsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationSettings>>;

    const defaultQb = createMockQueryBuilder([mockRecipient]);
    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(defaultQb),
    } as unknown as jest.Mocked<Repository<User>>;

    companyRepository = {
      findOne: jest.fn().mockResolvedValue(mockCompany),
    } as unknown as jest.Mocked<Repository<Company>>;

    clientRepository = {
      findOne: jest.fn().mockResolvedValue(mockClient),
    } as unknown as jest.Mocked<Repository<Client>>;

    emailConfigService = {
      getDecryptedSmtpConfigByCompanyId: jest.fn().mockResolvedValue(mockSmtpConfig),
    };

    emailSenderService = {
      sendBatchEmails: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskNotificationService,
          useFactory: () =>
            new TaskNotificationService(
              notificationSettingsRepository as any,
              userRepository as any,
              companyRepository as any,
              clientRepository as any,
              emailConfigService as any,
              emailSenderService as any
            ),
        },
        { provide: getRepositoryToken(NotificationSettings), useValue: notificationSettingsRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: getRepositoryToken(Client), useValue: clientRepository },
        { provide: EmailConfigurationService, useValue: emailConfigService },
        { provide: EmailSenderService, useValue: emailSenderService },
      ],
    }).compile();

    service = module.get(TaskNotificationService);
  });

  // ── notifyTaskCreated ──────────────────────────────────────────────

  describe('notifyTaskCreated', () => {
    it('should send email to recipients', async () => {
      await service.notifyTaskCreated(mockTask, mockUser);

      expect(emailConfigService.getDecryptedSmtpConfigByCompanyId).toHaveBeenCalledWith(companyId);
      expect(emailSenderService.sendBatchEmails).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.arrayContaining([
          expect.objectContaining({
            to: mockRecipient.email,
            subject: expect.stringContaining('Rozliczenie VAT'),
          }),
        ])
      );
    });

    it('should skip when task has no clientId', async () => {
      const taskWithoutClient = { ...mockTask, clientId: null } as unknown as Task;

      await service.notifyTaskCreated(taskWithoutClient, mockUser);

      expect(emailConfigService.getDecryptedSmtpConfigByCompanyId).not.toHaveBeenCalled();
      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should skip when no SMTP config exists', async () => {
      emailConfigService.getDecryptedSmtpConfigByCompanyId.mockResolvedValue(null);

      await service.notifyTaskCreated(mockTask, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should skip when no recipients have notifications enabled', async () => {
      userRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([]) as any
      );

      await service.notifyTaskCreated(mockTask, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should not throw on email send error', async () => {
      emailSenderService.sendBatchEmails.mockRejectedValue(new Error('SMTP down'));

      await expect(service.notifyTaskCreated(mockTask, mockUser)).resolves.toBeUndefined();
    });
  });

  // ── notifyTaskUpdated ──────────────────────────────────────────────

  describe('notifyTaskUpdated', () => {
    it('should send email with change details', async () => {
      const oldValues = { status: TaskStatus.TODO };
      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS } as Task;

      await service.notifyTaskUpdated(updatedTask, oldValues, mockUser);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.arrayContaining([
          expect.objectContaining({
            subject: expect.stringContaining('Zadanie zaktualizowane'),
          }),
        ])
      );
    });

    it('should skip when neither current nor old clientId exists', async () => {
      const taskNoClient = { ...mockTask, clientId: null } as unknown as Task;

      await service.notifyTaskUpdated(taskNoClient, {}, mockUser, undefined);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should still notify when old clientId existed but current is null', async () => {
      const taskNoClient = { ...mockTask, clientId: null } as unknown as Task;
      const oldValues = { title: 'Old Title' };

      await service.notifyTaskUpdated(taskNoClient, oldValues, mockUser, clientId);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalled();
    });

    it('should skip when no changes detected', async () => {
      // oldValues must include ALL fields checked by calculateChanges so none appear changed
      const oldValues = {
        title: mockTask.title,
        description: (mockTask as any).description,
        status: mockTask.status,
        priority: mockTask.priority,
        dueDate: mockTask.dueDate,
        startDate: (mockTask as any).startDate,
        estimatedMinutes: (mockTask as any).estimatedMinutes,
        storyPoints: (mockTask as any).storyPoints,
        assigneeId: (mockTask as any).assigneeId,
        clientId: mockTask.clientId,
      };

      await service.notifyTaskUpdated(mockTask, oldValues, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should skip when no SMTP config exists', async () => {
      emailConfigService.getDecryptedSmtpConfigByCompanyId.mockResolvedValue(null);
      const oldValues = { status: TaskStatus.TODO };
      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS } as Task;

      await service.notifyTaskUpdated(updatedTask, oldValues, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should handle assignee change in oldValues', async () => {
      const oldValues = { assigneeId: 'old-assignee-id' };
      const updatedTask = { ...mockTask, assigneeId: 'new-assignee-id' } as unknown as Task;

      await service.notifyTaskUpdated(updatedTask, oldValues, mockUser);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalled();
    });

    it('should not throw on email send error', async () => {
      emailSenderService.sendBatchEmails.mockRejectedValue(new Error('SMTP down'));
      const oldValues = { status: TaskStatus.TODO };
      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS } as Task;

      await expect(
        service.notifyTaskUpdated(updatedTask, oldValues, mockUser)
      ).resolves.toBeUndefined();
    });
  });

  // ── notifyTaskDeleted ──────────────────────────────────────────────

  describe('notifyTaskDeleted', () => {
    it('should send deletion notification', async () => {
      await service.notifyTaskDeleted(mockTask, mockUser);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.arrayContaining([
          expect.objectContaining({
            subject: expect.stringContaining('Zadanie usunięte'),
          }),
        ])
      );
    });

    it('should skip when task has no clientId', async () => {
      const taskNoClient = { ...mockTask, clientId: null } as unknown as Task;

      await service.notifyTaskDeleted(taskNoClient, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should not throw on email send error', async () => {
      emailSenderService.sendBatchEmails.mockRejectedValue(new Error('SMTP down'));

      await expect(service.notifyTaskDeleted(mockTask, mockUser)).resolves.toBeUndefined();
    });
  });

  // ── notifyTaskCompleted ────────────────────────────────────────────

  describe('notifyTaskCompleted', () => {
    it('should send completion notification', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.DONE } as Task;

      await service.notifyTaskCompleted(completedTask, mockUser);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.arrayContaining([
          expect.objectContaining({
            subject: expect.stringContaining('Zadanie zakończone'),
          }),
        ])
      );
    });

    it('should skip when task has no clientId', async () => {
      const taskNoClient = { ...mockTask, clientId: null } as unknown as Task;

      await service.notifyTaskCompleted(taskNoClient, mockUser);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should not throw on email send error', async () => {
      emailSenderService.sendBatchEmails.mockRejectedValue(new Error('SMTP down'));

      await expect(service.notifyTaskCompleted(mockTask, mockUser)).resolves.toBeUndefined();
    });
  });

  // ── notifyTaskOverdue ──────────────────────────────────────────────

  describe('notifyTaskOverdue', () => {
    it('should send overdue notification', async () => {
      await service.notifyTaskOverdue(mockTask);

      expect(emailSenderService.sendBatchEmails).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.arrayContaining([
          expect.objectContaining({
            subject: expect.stringContaining('Zadanie przeterminowane'),
          }),
        ])
      );
    });

    it('should skip when task has no clientId', async () => {
      const taskNoClient = { ...mockTask, clientId: null } as unknown as Task;

      await service.notifyTaskOverdue(taskNoClient);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should skip when no SMTP config exists', async () => {
      emailConfigService.getDecryptedSmtpConfigByCompanyId.mockResolvedValue(null);

      await service.notifyTaskOverdue(mockTask);

      expect(emailSenderService.sendBatchEmails).not.toHaveBeenCalled();
    });

    it('should not throw on email send error', async () => {
      emailSenderService.sendBatchEmails.mockRejectedValue(new Error('SMTP down'));

      await expect(service.notifyTaskOverdue(mockTask)).resolves.toBeUndefined();
    });
  });

  // ── Recipient filtering ────────────────────────────────────────────

  describe('recipient filtering', () => {
    it('should query users with receiveOnCreate for task creation', async () => {
      await service.notifyTaskCreated(mockTask, mockUser);

      const qbCall = userRepository.createQueryBuilder.mock.results[0].value;
      // The andWhere calls should include the notification type filter
      expect(qbCall.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('receiveOnCreate'),
        expect.objectContaining({ enabled: true })
      );
    });

    it('should query users with receiveOnTaskCompleted for task completion', async () => {
      await service.notifyTaskCompleted(mockTask, mockUser);

      const qbCall = userRepository.createQueryBuilder.mock.results[0].value;
      expect(qbCall.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('receiveOnTaskCompleted'),
        expect.objectContaining({ enabled: true })
      );
    });

    it('should query users with receiveOnTaskOverdue for overdue notifications', async () => {
      await service.notifyTaskOverdue(mockTask);

      const qbCall = userRepository.createQueryBuilder.mock.results[0].value;
      expect(qbCall.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('receiveOnTaskOverdue'),
        expect.objectContaining({ enabled: true })
      );
    });
  });
});
