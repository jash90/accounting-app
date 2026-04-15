import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificationSettings, User, UserRole } from '@accounting/common';

import { NotificationSettingsService } from './notification-settings.service';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSettings: Partial<NotificationSettings> = {
    id: 'settings-123',
    userId: mockUserId,
    companyId: mockCompanyId,
    moduleSlug: 'clients',
    receiveOnCreate: true,
    receiveOnUpdate: true,
    receiveOnDelete: true,
    isAdminCopy: false,
  };

  const mockInsertQb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    orUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };

  const _mockSettingsQb = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockSettingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn().mockImplementation((user: User) => {
      if (!user.companyId) {
        throw new InternalServerErrorException(
          'Użytkownik nie jest przypisany do żadnej firmy. Skontaktuj się z administratorem.'
        );
      }
      return Promise.resolve(user.companyId);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: createQueryBuilder returns insert builder
    mockSettingsRepository.createQueryBuilder.mockReturnValue(mockInsertQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationSettingsService,
          useFactory: () =>
            new NotificationSettingsService(
              mockSettingsRepository as any,
              mockUserRepository as any,
              mockSystemCompanyService as any
            ),
        },
        {
          provide: getRepositoryToken(NotificationSettings),
          useValue: mockSettingsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationSettingsService>(NotificationSettingsService);
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings(mockUser as User);

      expect(result).toEqual(mockSettings);
      expect(mockSettingsRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          companyId: mockCompanyId,
          moduleSlug: 'clients',
        },
      });
    });

    it('should create default settings when none exist', async () => {
      mockSettingsRepository.findOne
        .mockResolvedValueOnce(null) // first check: not found
        .mockResolvedValueOnce(mockSettings); // after insert: found

      const result = await service.getSettings(mockUser as User);

      expect(result).toEqual(mockSettings);
      expect(mockInsertQb.insert).toHaveBeenCalled();
      expect(mockInsertQb.orIgnore).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when user has no companyId', async () => {
      const userWithoutCompany = { ...mockUser, companyId: undefined };

      await expect(service.getSettings(userWithoutCompany as User)).rejects.toThrow(
        InternalServerErrorException
      );
      expect(mockSystemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(userWithoutCompany);
    });

    it('should throw InternalServerErrorException when settings creation fails', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(null);

      await expect(service.getSettings(mockUser as User)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('updateSettings', () => {
    it('should update and save settings', async () => {
      mockSettingsRepository.findOne.mockResolvedValue({ ...mockSettings });
      mockSettingsRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateSettings(mockUser as User, {
        receiveOnCreate: false,
      });

      expect(result.receiveOnCreate).toBe(false);
      expect(mockSettingsRepository.save).toHaveBeenCalled();
    });
  });

  describe('enableAllNotifications', () => {
    it('should enable all three notification toggles', async () => {
      mockSettingsRepository.findOne.mockResolvedValue({ ...mockSettings });
      mockSettingsRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.enableAllNotifications(mockUser as User);

      expect(result.receiveOnCreate).toBe(true);
      expect(result.receiveOnUpdate).toBe(true);
      expect(result.receiveOnDelete).toBe(true);
    });
  });

  describe('disableAllNotifications', () => {
    it('should disable all three notification toggles', async () => {
      const settings = { ...mockSettings };
      mockSettingsRepository.findOne.mockResolvedValue(settings);
      mockSettingsRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.disableAllNotifications(mockUser as User);

      expect(result.receiveOnCreate).toBe(false);
      expect(result.receiveOnUpdate).toBe(false);
      expect(result.receiveOnDelete).toBe(false);
    });
  });

  describe('setUserSettings', () => {
    it('should upsert settings for a target user in the same company', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'target-user' });
      mockSettingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.setUserSettings('target-user', mockCompanyId, {
        receiveOnCreate: false,
      });

      expect(result).toEqual(mockSettings);
      expect(mockInsertQb.orUpdate).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when target user not in company', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setUserSettings('unknown-user', mockCompanyId, { receiveOnCreate: false })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteSettings', () => {
    it('should delete settings for a target user', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'target-user' });
      mockSettingsRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteSettings('target-user', mockCompanyId);

      expect(mockSettingsRepository.delete).toHaveBeenCalledWith({
        userId: 'target-user',
        companyId: mockCompanyId,
        moduleSlug: 'clients',
      });
    });

    it('should throw ForbiddenException when target user not in company', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteSettings('unknown-user', mockCompanyId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
