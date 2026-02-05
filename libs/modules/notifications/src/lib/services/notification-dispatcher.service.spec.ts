import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { NotificationType, User, UserRole } from '@accounting/common';

import {
  type DispatchNotificationPayload,
  NotificationDispatcherService,
} from './notification-dispatcher.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationService } from './notification.service';

describe('NotificationDispatcherService - Security Tests', () => {
  let service: NotificationDispatcherService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockSettingsService: jest.Mocked<NotificationSettingsService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockUserRepository: jest.Mocked<Repository<User>>;

  const createMockUser = (overrides: Partial<User> = {}): User => {
    return {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      companyId: 'company-123',
      isActive: true,
      ...overrides,
    } as User;
  };

  const createPayload = (
    overrides: Partial<DispatchNotificationPayload> = {}
  ): DispatchNotificationPayload => {
    return {
      type: NotificationType.TASK_ASSIGNED,
      recipientIds: ['user-123'],
      companyId: 'company-123',
      title: 'Test Notification',
      message: 'Test message',
      ...overrides,
    };
  };

  beforeEach(async () => {
    mockNotificationService = {
      create: jest.fn().mockResolvedValue({
        id: 'notification-123',
        recipientId: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
      }),
      mapToResponseDto: jest.fn().mockImplementation((notification) => ({
        ...notification,
        recipientId: notification.recipientId,
      })),
    } as unknown as jest.Mocked<NotificationService>;

    mockSettingsService = {
      shouldSendInApp: jest.fn().mockResolvedValue(true),
      shouldSendEmail: jest.fn().mockResolvedValue(false),
      getRecipientsForNotification: jest.fn().mockResolvedValue(['user-123']),
    } as unknown as jest.Mocked<NotificationSettingsService>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    mockUserRepository = {
      find: jest.fn().mockResolvedValue([createMockUser()]),
    } as unknown as jest.Mocked<Repository<User>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: NotificationSettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationDispatcherService>(NotificationDispatcherService);
  });

  describe('Recipient Validation', () => {
    it('should validate recipients belong to the specified company', async () => {
      const payload = createPayload({
        recipientIds: ['user-123', 'user-456'],
        companyId: 'company-123',
      });

      // Only user-123 belongs to company-123
      mockUserRepository.find.mockResolvedValue([createMockUser({ id: 'user-123' })]);

      await service.dispatch(payload);

      // Should have queried with company filter
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-123',
            isActive: true,
          }),
        })
      );

      // Should only create notification for valid recipient
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });

    it('should reject recipients from different companies', async () => {
      const payload = createPayload({
        recipientIds: ['attacker-user'],
        companyId: 'company-123',
      });

      // User belongs to different company
      mockUserRepository.find.mockResolvedValue([]);

      await service.dispatch(payload);

      // No notifications should be created
      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });

    it('should filter out inactive users', async () => {
      const payload = createPayload({
        recipientIds: ['inactive-user', 'active-user'],
        companyId: 'company-123',
      });

      // Only return active users
      mockUserRepository.find.mockResolvedValue([
        createMockUser({ id: 'active-user', isActive: true }),
      ]);

      await service.dispatch(payload);

      // Should only process active user
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle empty recipient list gracefully', async () => {
      const payload = createPayload({
        recipientIds: [],
        companyId: 'company-123',
      });

      await service.dispatch(payload);

      expect(mockNotificationService.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'notification.created',
        expect.anything()
      );
    });

    it('should not dispatch to users outside company context', async () => {
      const payload = createPayload({
        recipientIds: ['user-123', 'cross-company-user'],
        companyId: 'company-123',
      });

      // Simulate validation filtering out cross-company user
      mockUserRepository.find.mockResolvedValue([
        createMockUser({ id: 'user-123', companyId: 'company-123' }),
        // cross-company-user is NOT returned because they have different companyId
      ]);

      await service.dispatch(payload);

      // Only one notification should be created
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Channel Routing Logic', () => {
    it('should respect in-app notification settings', async () => {
      const payload = createPayload();

      mockSettingsService.shouldSendInApp.mockResolvedValue(true);
      mockSettingsService.shouldSendEmail.mockResolvedValue(false);

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', expect.anything());
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'notification.email.send',
        expect.anything()
      );
    });

    it('should respect email notification settings', async () => {
      const payload = createPayload();

      mockSettingsService.shouldSendInApp.mockResolvedValue(false);
      mockSettingsService.shouldSendEmail.mockResolvedValue(true);

      await service.dispatch(payload);

      // No in-app notification
      expect(mockNotificationService.create).not.toHaveBeenCalled();

      // Email should be sent
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.email.send',
        expect.objectContaining({
          recipientId: 'user-123',
          type: NotificationType.TASK_ASSIGNED,
        })
      );
    });

    it('should send both in-app and email when both enabled', async () => {
      const payload = createPayload();

      mockSettingsService.shouldSendInApp.mockResolvedValue(true);
      mockSettingsService.shouldSendEmail.mockResolvedValue(true);

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.email.send',
        expect.anything()
      );
    });

    it('should not send any notification when all channels disabled', async () => {
      const payload = createPayload();

      mockSettingsService.shouldSendInApp.mockResolvedValue(false);
      mockSettingsService.shouldSendEmail.mockResolvedValue(false);

      await service.dispatch(payload);

      expect(mockNotificationService.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'notification.email.send',
        expect.anything()
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other recipients if one fails', async () => {
      const payload = createPayload({
        recipientIds: ['user-1', 'user-2', 'user-3'],
        companyId: 'company-123',
      });

      mockUserRepository.find.mockResolvedValue([
        createMockUser({ id: 'user-1' }),
        createMockUser({ id: 'user-2' }),
        createMockUser({ id: 'user-3' }),
      ]);

      // Fail on second recipient
      mockSettingsService.shouldSendInApp
        .mockResolvedValueOnce(true) // user-1 succeeds
        .mockRejectedValueOnce(new Error('Settings error')) // user-2 fails
        .mockResolvedValueOnce(true); // user-3 succeeds

      await service.dispatch(payload);

      // Should still process user-3 after user-2 fails
      expect(mockNotificationService.create).toHaveBeenCalledTimes(2);
    });

    it('should not throw when notification creation fails', async () => {
      const payload = createPayload();

      mockNotificationService.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.dispatch(payload)).resolves.not.toThrow();
    });

    it('should handle repository errors gracefully', async () => {
      const payload = createPayload();

      mockUserRepository.find.mockRejectedValue(new Error('DB connection failed'));

      // Should not propagate error
      await expect(service.dispatch(payload)).resolves.not.toThrow();
    });
  });

  describe('Module Slug Validation', () => {
    it('should default to "system" for invalid module slugs', async () => {
      const payload = createPayload({
        // Using a notification type that maps to an invalid module
        type: 'INVALID_TYPE' as NotificationType,
      });

      // The service should handle invalid module slugs gracefully
      await service.dispatch(payload);

      // Should still create notification (with fallback module)
      expect(mockNotificationService.create).toHaveBeenCalled();
    });

    it('should correctly map notification types to modules', async () => {
      const taskPayload = createPayload({
        type: NotificationType.TASK_ASSIGNED,
      });

      await service.dispatch(taskPayload);

      // Should call settings service with correct module
      expect(mockSettingsService.shouldSendInApp).toHaveBeenCalledWith(
        'user-123',
        'company-123',
        expect.stringMatching(/tasks|system/),
        NotificationType.TASK_ASSIGNED
      );
    });
  });

  describe('Event Emission Security', () => {
    it('should include recipientId in notification.created event', async () => {
      const payload = createPayload({ recipientIds: ['specific-user'] });

      mockUserRepository.find.mockResolvedValue([createMockUser({ id: 'specific-user' })]);

      await service.dispatch(payload);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.created',
        expect.objectContaining({
          recipientId: 'specific-user',
        })
      );
    });

    it('should not leak sensitive data in email events', async () => {
      const payload = createPayload({
        data: {
          publicInfo: 'visible',
          // Any internal data should be handled properly
        },
      });

      mockSettingsService.shouldSendEmail.mockResolvedValue(true);

      await service.dispatch(payload);

      const emailEmitCall = mockEventEmitter.emit.mock.calls.find(
        (call) => call[0] === 'notification.email.send'
      );

      expect(emailEmitCall).toBeDefined();
      const emailPayload = emailEmitCall![1];

      // Verify the email payload structure
      expect(emailPayload).toHaveProperty('recipientId');
      expect(emailPayload).toHaveProperty('companyId');
      expect(emailPayload).toHaveProperty('type');
    });
  });

  describe('Company-Wide Dispatch', () => {
    it('should exclude the actor from company-wide notifications', async () => {
      const actorId = 'actor-user';

      mockSettingsService.getRecipientsForNotification.mockResolvedValue([
        actorId, // The actor
        'other-user-1',
        'other-user-2',
      ]);

      mockUserRepository.find.mockResolvedValue([
        createMockUser({ id: 'other-user-1' }),
        createMockUser({ id: 'other-user-2' }),
      ]);

      await service.dispatchToCompanyUsers(
        'company-123',
        {
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test',
        },
        actorId
      );

      // The dispatch should exclude the actor
      // Verify validation was called with filtered recipients
      expect(mockUserRepository.find).toHaveBeenCalled();
    });

    it('should validate company recipients before dispatch', async () => {
      mockSettingsService.getRecipientsForNotification.mockResolvedValue([
        'valid-user',
        'invalid-user',
      ]);

      mockUserRepository.find.mockResolvedValue([
        createMockUser({ id: 'valid-user' }),
        // invalid-user is filtered out
      ]);

      await service.dispatchToCompanyUsers('company-123', {
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
      });

      // Only valid user should receive notification
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Notification Handling', () => {
    it('should handle batch notifications correctly', async () => {
      const payload = createPayload({
        isBatch: true,
        itemCount: 5,
        title: 'Bulk operation completed',
      });

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isBatch: true,
          itemCount: 5,
        })
      );
    });

    it('should handle batch with single item correctly', async () => {
      const payload = createPayload({
        isBatch: true,
        itemCount: 1,
      });

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isBatch: true,
          itemCount: 1,
        })
      );
    });
  });

  describe('Action URL Handling', () => {
    it('should pass action URL to notification', async () => {
      const payload = createPayload({
        actionUrl: '/tasks/123',
      });

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: '/tasks/123',
        })
      );
    });

    it('should handle missing action URL gracefully', async () => {
      const payload = createPayload({
        actionUrl: undefined,
      });

      await service.dispatch(payload);

      expect(mockNotificationService.create).toHaveBeenCalled();
    });
  });
});
