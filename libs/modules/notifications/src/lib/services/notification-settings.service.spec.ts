import { InternalServerErrorException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type Repository } from 'typeorm';

import { type NotificationSettings, NotificationType, type User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { NotificationSettingsService } from './notification-settings.service';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  let mockSettingsRepository: jest.Mocked<Repository<NotificationSettings>>;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockSystemCompanyService: jest.Mocked<SystemCompanyService>;

  const companyId = 'company-123';
  const moduleSlug = 'tasks';

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      companyId,
      isActive: true,
      ...overrides,
    }) as User;

  const createMockSettings = (
    overrides: Partial<NotificationSettings> = {}
  ): NotificationSettings =>
    ({
      id: 'settings-1',
      userId: 'user-123',
      companyId,
      moduleSlug,
      inAppEnabled: true,
      emailEnabled: true,
      receiveOnCreate: true,
      receiveOnUpdate: true,
      receiveOnDelete: true,
      receiveOnTaskCompleted: true,
      receiveOnTaskOverdue: true,
      isAdminCopy: false,
      typePreferences: null,
      ...overrides,
    }) as NotificationSettings;

  const createMockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {};
    qb['insert'] = jest.fn().mockReturnValue(qb);
    qb['into'] = jest.fn().mockReturnValue(qb);
    qb['values'] = jest.fn().mockReturnValue(qb);
    qb['orIgnore'] = jest.fn().mockReturnValue(qb);
    qb['execute'] = jest.fn().mockResolvedValue({});
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockQb = createMockQueryBuilder();

    mockSettingsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<NotificationSettings>>;

    mockUserRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    mockSystemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    } as unknown as jest.Mocked<SystemCompanyService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationSettingsService,
          useFactory: () =>
            new NotificationSettingsService(
              mockSettingsRepository,
              mockUserRepository,
              mockSystemCompanyService
            ),
        },
      ],
    }).compile();

    service = module.get<NotificationSettingsService>(NotificationSettingsService);
  });

  describe('getSettingsForModule', () => {
    it('should return existing settings for a module', async () => {
      const user = createMockUser();
      const settings = createMockSettings();
      mockSettingsRepository.findOne.mockResolvedValue(settings);

      const result = await service.getSettingsForModule(user, moduleSlug);

      expect(result).toEqual(settings);
      expect(mockSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, companyId, moduleSlug },
      });
    });

    it('should create default settings when none exist', async () => {
      const user = createMockUser();
      const defaultSettings = createMockSettings();

      mockSettingsRepository.findOne
        .mockResolvedValueOnce(null) // first lookup returns nothing
        .mockResolvedValueOnce(defaultSettings); // after insert, returns created

      const result = await service.getSettingsForModule(user, moduleSlug);

      expect(result).toEqual(defaultSettings);
      expect(mockSettingsRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should throw when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      await expect(service.getSettingsForModule(user, moduleSlug)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('getAllSettingsForUser', () => {
    it('should return all settings for a user ordered by moduleSlug', async () => {
      const user = createMockUser();
      const settingsList = [
        createMockSettings({ moduleSlug: 'clients' }),
        createMockSettings({ moduleSlug: 'tasks' }),
      ];
      mockSettingsRepository.find.mockResolvedValue(settingsList);

      const result = await service.getAllSettingsForUser(user);

      expect(result).toEqual(settingsList);
      expect(mockSettingsRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id, companyId },
        order: { moduleSlug: 'ASC' },
      });
    });

    it('should throw when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      await expect(service.getAllSettingsForUser(user)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('updateSettingsForModule', () => {
    it('should update settings for a module', async () => {
      const user = createMockUser();
      const existing = createMockSettings();
      const updated = createMockSettings({ emailEnabled: false });

      mockSettingsRepository.findOne.mockResolvedValue(existing);
      mockSettingsRepository.save.mockResolvedValue(updated);

      const result = await service.updateSettingsForModule(user, moduleSlug, {
        emailEnabled: false,
      });

      expect(result).toEqual(updated);
      expect(mockSettingsRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateAllSettingsForUser', () => {
    it('should batch update all settings for a user', async () => {
      const user = createMockUser();
      mockSettingsRepository.update.mockResolvedValue({ affected: 3 } as never);

      const count = await service.updateAllSettingsForUser(user, { inAppEnabled: false });

      expect(count).toBe(3);
      expect(mockSettingsRepository.update).toHaveBeenCalledWith(
        { userId: user.id, companyId },
        { inAppEnabled: false }
      );
    });

    it('should return 0 when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      await expect(service.updateAllSettingsForUser(user, { inAppEnabled: false })).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('shouldSendInApp', () => {
    it('should return true when no settings exist (default)', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(null);

      const result = await service.shouldSendInApp(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result).toBe(true);
    });

    it('should return false when inApp is globally disabled', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(
        createMockSettings({ inAppEnabled: false })
      );

      const result = await service.shouldSendInApp(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result).toBe(false);
    });

    it('should return false when type preference disables inApp', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(
        createMockSettings({
          inAppEnabled: true,
          typePreferences: {
            [NotificationType.TASK_CREATED]: { inApp: false, email: true },
          },
        })
      );

      const result = await service.shouldSendInApp(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result).toBe(false);
    });

    it('should respect receiveOnCreate setting for create events', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(
        createMockSettings({ receiveOnCreate: false })
      );

      const result = await service.shouldSendInApp(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result).toBe(false);
    });
  });

  describe('shouldSendEmail', () => {
    it('should return true when no settings exist (default)', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(null);

      const result = await service.shouldSendEmail(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_UPDATED
      );

      expect(result).toBe(true);
    });

    it('should return false when email is globally disabled', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(
        createMockSettings({ emailEnabled: false })
      );

      const result = await service.shouldSendEmail(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_UPDATED
      );

      expect(result).toBe(false);
    });

    it('should respect receiveOnTaskCompleted for TASK_COMPLETED type', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(
        createMockSettings({ receiveOnTaskCompleted: false })
      );

      const result = await service.shouldSendEmail(
        'user-123',
        companyId,
        moduleSlug,
        NotificationType.TASK_COMPLETED
      );

      expect(result).toBe(false);
    });
  });

  describe('getRecipientsForNotification', () => {
    it('should return user IDs who should receive the notification', async () => {
      mockUserRepository.find.mockResolvedValue([
        { id: 'user-1' } as User,
        { id: 'user-2' } as User,
      ]);

      // user-1 has inApp enabled, user-2 has it disabled
      mockSettingsRepository.find.mockResolvedValue([
        createMockSettings({ userId: 'user-2', inAppEnabled: false }),
      ]);

      const result = await service.getRecipientsForNotification(
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED,
        'inApp'
      );

      // user-1 has no settings (default = send), user-2 has inApp disabled
      expect(result).toEqual(['user-1']);
    });

    it('should return empty array when no active users exist', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await service.getRecipientsForNotification(
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED,
        'inApp'
      );

      expect(result).toEqual([]);
    });
  });

  describe('batchCheckChannels', () => {
    it('should return channel status for each recipient', async () => {
      mockSettingsRepository.find.mockResolvedValue([
        createMockSettings({ userId: 'user-1', inAppEnabled: true, emailEnabled: false }),
      ]);

      const result = await service.batchCheckChannels(
        ['user-1', 'user-2'],
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result.get('user-1')).toEqual({ inApp: true, email: false });
      // user-2 has no settings -> defaults to true
      expect(result.get('user-2')).toEqual({ inApp: true, email: true });
    });

    it('should return empty map for empty recipient list', async () => {
      const result = await service.batchCheckChannels(
        [],
        companyId,
        moduleSlug,
        NotificationType.TASK_CREATED
      );

      expect(result.size).toBe(0);
    });
  });
});
