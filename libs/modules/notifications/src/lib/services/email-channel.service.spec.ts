import { Test, type TestingModule } from '@nestjs/testing';

import { type Repository } from 'typeorm';

import { NotificationType, type User, UserRole } from '@accounting/common';
import { type EmailConfigurationService, type EmailSenderService } from '@accounting/email';

import { EmailChannelService } from './email-channel.service';
import { type NotificationService } from './notification.service';

// Mock fs/promises and handlebars to avoid filesystem access in tests
jest.mock('fs/promises', () => ({
  access: jest.fn().mockRejectedValue(new Error('ENOENT')),
  readFile: jest.fn(),
}));

describe('EmailChannelService', () => {
  let service: EmailChannelService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockEmailConfigService: jest.Mocked<EmailConfigurationService>;
  let mockEmailSenderService: jest.Mocked<EmailSenderService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-123',
      email: 'recipient@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: UserRole.EMPLOYEE,
      companyId: 'company-123',
      isActive: true,
      ...overrides,
    }) as User;

  const createPayload = (overrides: Record<string, unknown> = {}) => ({
    notificationId: 'notif-1',
    recipientId: 'user-123',
    companyId: 'company-123',
    type: NotificationType.TASK_CREATED,
    title: 'Nowe zadanie',
    message: 'Utworzono nowe zadanie',
    actionUrl: '/tasks/1',
    actorId: 'actor-1',
    ...overrides,
  });

  const mockSmtpConfig = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: { user: 'sender@example.com', pass: 'secret' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    mockEmailConfigService = {
      getDecryptedSmtpConfigByCompanyId: jest.fn().mockResolvedValue(mockSmtpConfig),
    } as unknown as jest.Mocked<EmailConfigurationService>;

    mockEmailSenderService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailSenderService>;

    mockNotificationService = {
      markEmailSent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmailChannelService,
          useFactory: () =>
            new EmailChannelService(
              mockUserRepository,
              mockEmailConfigService,
              mockEmailSenderService,
              mockNotificationService
            ),
        },
      ],
    }).compile();

    service = module.get<EmailChannelService>(EmailChannelService);
  });

  describe('handleEmailNotification', () => {
    it('should send email notification with default template', async () => {
      const recipient = createMockUser();
      const actor = createMockUser({ id: 'actor-1', firstName: 'Anna', lastName: 'Nowak' });

      mockUserRepository.findOne
        .mockResolvedValueOnce(recipient) // recipient lookup
        .mockResolvedValueOnce(actor); // actor lookup

      await service.handleEmailNotification(createPayload());

      expect(mockEmailSenderService.sendEmail).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Nowe zadanie',
          html: expect.stringContaining('Nowe zadanie'),
        })
      );
    });

    it('should mark notification as email sent when notificationId is provided', async () => {
      const recipient = createMockUser();
      mockUserRepository.findOne
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(null); // no actor

      await service.handleEmailNotification(createPayload());

      expect(mockNotificationService.markEmailSent).toHaveBeenCalledWith('notif-1');
    });

    it('should not mark email sent when notificationId is missing', async () => {
      const recipient = createMockUser();
      mockUserRepository.findOne
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(null);

      await service.handleEmailNotification(createPayload({ notificationId: undefined }));

      expect(mockNotificationService.markEmailSent).not.toHaveBeenCalled();
    });

    it('should skip sending when recipient is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.handleEmailNotification(createPayload());

      expect(mockEmailSenderService.sendEmail).not.toHaveBeenCalled();
      expect(mockNotificationService.markEmailSent).not.toHaveBeenCalled();
    });

    it('should skip sending when no SMTP config exists for company', async () => {
      const recipient = createMockUser();
      mockUserRepository.findOne.mockResolvedValueOnce(recipient);
      mockEmailConfigService.getDecryptedSmtpConfigByCompanyId.mockResolvedValue(null);

      await service.handleEmailNotification(createPayload());

      expect(mockEmailSenderService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully without throwing', async () => {
      const recipient = createMockUser();
      mockUserRepository.findOne
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(null);
      mockEmailSenderService.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      // Should not throw — the service catches the error internally
      await expect(service.handleEmailNotification(createPayload())).resolves.toBeUndefined();
    });

    it('should include actor name in email when actorId is provided', async () => {
      const recipient = createMockUser();
      const actor = createMockUser({ id: 'actor-1', firstName: 'Anna', lastName: 'Nowak' });
      mockUserRepository.findOne
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(actor);

      await service.handleEmailNotification(createPayload());

      expect(mockEmailSenderService.sendEmail).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.objectContaining({
          html: expect.stringContaining('Anna Nowak'),
        })
      );
    });

    it('should send email without actor info when actorId is not provided', async () => {
      const recipient = createMockUser();
      mockUserRepository.findOne.mockResolvedValueOnce(recipient);

      await service.handleEmailNotification(createPayload({ actorId: undefined }));

      expect(mockEmailSenderService.sendEmail).toHaveBeenCalledWith(
        mockSmtpConfig,
        expect.objectContaining({
          to: 'recipient@example.com',
          html: expect.any(String),
        })
      );

      // actor lookup should not happen
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
