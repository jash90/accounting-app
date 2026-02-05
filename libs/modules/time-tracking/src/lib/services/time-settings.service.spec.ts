import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { TimeRoundingMethod, TimeSettings, UserRole, type User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { TimeSettingsService } from './time-settings.service';
import { type UpdateTimeSettingsDto } from '../dto/time-settings.dto';

describe('TimeSettingsService', () => {
  let service: TimeSettingsService;
  let settingsRepository: jest.Mocked<Repository<TimeSettings>>;
  let tenantService: jest.Mocked<TenantService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  // Create mocks at module level for proper instantiation
  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'user@example.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
  };

  const mockOwner: Partial<User> = {
    id: 'owner-123',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSettings: Partial<TimeSettings> = {
    id: 'settings-123',
    companyId: mockCompanyId,
    roundingMethod: TimeRoundingMethod.NONE,
    roundingIntervalMinutes: 15,
    defaultCurrency: 'PLN',
    requireApproval: false,
    allowOverlappingEntries: true,
    workingHoursPerDay: 8,
    workingHoursPerWeek: 40,
    weekStartDay: 1,
    allowTimerMode: true,
    allowManualEntry: true,
    autoStopTimerAfterMinutes: 0,
    minimumEntryMinutes: 0,
    maximumEntryMinutes: 0,
    enableDailyReminder: false,
    lockEntriesAfterDays: 0,
  };

  beforeEach(async () => {
    // Reset mocks before each test
    mockTenantService.getEffectiveCompanyId.mockReset();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    // Create mock QueryBuilder for insert operations
    const mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1, generatedMaps: [] }),
    };

    const mockSettingsRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // Use useFactory to manually wire dependencies (needed for Bun which doesn't emit decorator metadata)
        {
          provide: TimeSettingsService,
          useFactory: () => {
            return new TimeSettingsService(mockSettingsRepository as any, mockTenantService as any);
          },
        },
        {
          provide: getRepositoryToken(TimeSettings),
          useValue: mockSettingsRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<TimeSettingsService>(TimeSettingsService);
    settingsRepository = module.get(getRepositoryToken(TimeSettings));
    tenantService = module.get(TenantService);
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue(mockSettings);

      const result = await service.getSettings(mockUser as User);

      expect(result).toEqual(mockSettings);
      expect(settingsRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
      });
    });

    it('should create default settings when not exists', async () => {
      // First findOne returns null (no settings exist), second returns the created settings
      settingsRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSettings);

      const result = await service.getSettings(mockUser as User);

      // Should have called createQueryBuilder for insert
      expect(settingsRepository.createQueryBuilder).toHaveBeenCalled();
      // Should have called findOne twice (initial check + fetch after insert)
      expect(settingsRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSettings);
    });

    it('should use correct default values when creating', async () => {
      // Track the values passed to the insert
      let insertedValues: any = null;
      const mockQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockImplementation((vals) => {
          insertedValues = vals;
          return mockQb;
        }),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      settingsRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      // First findOne returns null, second returns the default settings
      settingsRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSettings);

      await service.getSettings(mockUser as User);

      // Verify the default values used in insert
      expect(insertedValues).toEqual(
        expect.objectContaining({
          companyId: mockCompanyId,
          roundingMethod: TimeRoundingMethod.NONE,
          roundingIntervalMinutes: 15,
          defaultCurrency: 'PLN',
          requireApproval: false,
          allowOverlappingEntries: true,
          workingHoursPerDay: 8,
          workingHoursPerWeek: 40,
          weekStartDay: 1,
          allowTimerMode: true,
          allowManualEntry: true,
          autoStopTimerAfterMinutes: 0,
          minimumEntryMinutes: 0,
          maximumEntryMinutes: 0,
          enableDailyReminder: false,
          lockEntriesAfterDays: 0,
        })
      );
    });

    it('should filter by companyId', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue(mockSettings);

      await service.getSettings(mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
      expect(settingsRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
      });
    });
  });

  describe('updateSettings', () => {
    const updateDto: UpdateTimeSettingsDto = {
      roundingMethod: TimeRoundingMethod.UP,
      roundingIntervalMinutes: 30,
      requireApproval: true,
    };

    it('should update settings successfully', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({ ...mockSettings });
      settingsRepository.save = jest.fn().mockImplementation((data) => data);

      const result = await service.updateSettings(updateDto, mockOwner as User);

      expect(result.roundingMethod).toBe(TimeRoundingMethod.UP);
      expect(result.roundingIntervalMinutes).toBe(30);
      expect(result.requireApproval).toBe(true);
    });

    it('should set updatedById to current user', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({ ...mockSettings });
      settingsRepository.save = jest.fn().mockImplementation((data) => data);

      await service.updateSettings(updateDto, mockOwner as User);

      expect(settingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedById: mockOwner.id,
        })
      );
    });

    it('should merge with existing settings', async () => {
      const existingSettings = {
        ...mockSettings,
        defaultCurrency: 'EUR',
        workingHoursPerDay: 6,
      };
      settingsRepository.findOne = jest.fn().mockResolvedValue({ ...existingSettings });
      settingsRepository.save = jest.fn().mockImplementation((data) => data);

      const result = await service.updateSettings(
        { roundingMethod: TimeRoundingMethod.DOWN },
        mockOwner as User
      );

      // Should keep existing values not in update DTO
      expect(result.defaultCurrency).toBe('EUR');
      expect(result.workingHoursPerDay).toBe(6);
      // Should update specified values
      expect(result.roundingMethod).toBe(TimeRoundingMethod.DOWN);
    });

    it('should create settings if they do not exist', async () => {
      // First findOne returns null, second returns the created settings, third for updateSettings
      settingsRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSettings);
      settingsRepository.save = jest.fn().mockImplementation((data) => data);

      await service.updateSettings(updateDto, mockOwner as User);

      // getSettings will create default settings first via createQueryBuilder
      expect(settingsRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('requiresApproval', () => {
    it('should return true when requireApproval is true', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        requireApproval: true,
      });

      const result = await service.requiresApproval(mockUser as User);

      expect(result).toBe(true);
    });

    it('should return false when requireApproval is false', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        requireApproval: false,
      });

      const result = await service.requiresApproval(mockUser as User);

      expect(result).toBe(false);
    });
  });

  describe('allowsOverlapping', () => {
    it('should return true when overlapping allowed', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: true,
      });

      const result = await service.allowsOverlapping(mockUser as User);

      expect(result).toBe(true);
    });

    it('should return false when overlapping not allowed', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        allowOverlappingEntries: false,
      });

      const result = await service.allowsOverlapping(mockUser as User);

      expect(result).toBe(false);
    });
  });

  describe('getRoundingConfig', () => {
    it('should return rounding method and interval', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        roundingMethod: TimeRoundingMethod.UP,
        roundingIntervalMinutes: 30,
      });

      const result = await service.getRoundingConfig(mockUser as User);

      expect(result).toEqual({
        method: TimeRoundingMethod.UP,
        interval: 30,
      });
    });

    it('should return NONE method when not configured', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        roundingMethod: TimeRoundingMethod.NONE,
        roundingIntervalMinutes: 15,
      });

      const result = await service.getRoundingConfig(mockUser as User);

      expect(result.method).toBe(TimeRoundingMethod.NONE);
    });

    it('should return correct interval for different configurations', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue({
        ...mockSettings,
        roundingMethod: TimeRoundingMethod.NEAREST,
        roundingIntervalMinutes: 5,
      });

      const result = await service.getRoundingConfig(mockUser as User);

      expect(result).toEqual({
        method: TimeRoundingMethod.NEAREST,
        interval: 5,
      });
    });
  });

  describe('Tenant isolation', () => {
    it('should always use tenant service for company context', async () => {
      settingsRepository.findOne = jest.fn().mockResolvedValue(mockSettings);

      await service.getSettings(mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should use company ID from tenant service', async () => {
      const differentCompanyId = 'different-company-456';
      mockTenantService.getEffectiveCompanyId.mockResolvedValue(differentCompanyId);

      // Track the values passed to the insert
      let insertedValues: any = null;
      const mockQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockImplementation((vals) => {
          insertedValues = vals;
          return mockQb;
        }),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      settingsRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      // First findOne returns null, second returns settings with differentCompanyId
      const createdSettings = { ...mockSettings, companyId: differentCompanyId };
      settingsRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdSettings);

      await service.getSettings(mockUser as User);

      expect(insertedValues).toEqual(
        expect.objectContaining({
          companyId: differentCompanyId,
        })
      );
    });
  });
});
