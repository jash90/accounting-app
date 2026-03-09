import { TenantService } from '@accounting/common/backend';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { SettlementSettings, UserRole, type User } from '@accounting/common';

import { SettlementSettingsService } from './settlement-settings.service';

describe('SettlementSettingsService', () => {
  let service: SettlementSettingsService;
  let _settingsRepository: jest.Mocked<Repository<SettlementSettings>>;
  let tenantService: jest.Mocked<TenantService>;

  const mockCompanyId = 'company-123';

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSettings: Partial<SettlementSettings> = {
    id: 'settings-123',
    companyId: mockCompanyId,
    defaultPriority: 0,
    defaultDeadlineDay: null,
    autoAssignEnabled: false,
    autoAssignRules: null,
    notifyOnStatusChange: true,
    notifyOnDeadlineApproaching: true,
    deadlineWarningDays: 3,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  let mockSettingsRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    mockSettingsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SettlementSettingsService,
          useFactory: () => {
            return new SettlementSettingsService(
              mockSettingsRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(SettlementSettings),
          useValue: mockSettingsRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<SettlementSettingsService>(SettlementSettingsService);
    _settingsRepository = module.get(getRepositoryToken(SettlementSettings));
    tenantService = module.get(TenantService);
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings(mockUser as User);

      expect(result.id).toBe(mockSettings.id);
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.defaultPriority).toBe(0);
      expect(result.autoAssignEnabled).toBe(false);
      expect(result.notifyOnStatusChange).toBe(true);
      expect(result.deadlineWarningDays).toBe(3);
    });

    it('should create default settings when not found', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(null);
      const createdSettings = { ...mockSettings };
      mockSettingsRepository.create.mockReturnValue(createdSettings);
      mockSettingsRepository.save.mockResolvedValue(createdSettings);

      const result = await service.getSettings(mockUser as User);

      expect(mockSettingsRepository.create).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        defaultPriority: 0,
        defaultDeadlineDay: null,
        autoAssignEnabled: false,
        autoAssignRules: null,
        notifyOnStatusChange: true,
        notifyOnDeadlineApproaching: true,
        deadlineWarningDays: 3,
      });
      expect(mockSettingsRepository.save).toHaveBeenCalledWith(createdSettings);
      expect(result.id).toBe(mockSettings.id);
    });

    it('should use tenant service for companyId', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(mockSettings);

      await service.getSettings(mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
      expect(mockSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
      });
    });
  });

  describe('updateSettings', () => {
    it('should apply partial updates to existing settings', async () => {
      const existingSettings = { ...mockSettings };
      mockSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSettingsRepository.save.mockImplementation(async (s: any) => s);

      const dto = { deadlineWarningDays: 5, autoAssignEnabled: true };

      const result = await service.updateSettings(dto, mockUser as User);

      expect(result.deadlineWarningDays).toBe(5);
      expect(result.autoAssignEnabled).toBe(true);
      // Original values preserved
      expect(result.notifyOnStatusChange).toBe(true);
      expect(result.defaultPriority).toBe(0);
    });

    it('should create new settings if none exist and apply updates', async () => {
      mockSettingsRepository.findOne.mockResolvedValue(null);
      const newSettings: Partial<SettlementSettings> = {
        id: 'new-settings',
        companyId: mockCompanyId,
        defaultPriority: 0,
        defaultDeadlineDay: null,
        autoAssignEnabled: false,
        autoAssignRules: null,
        notifyOnStatusChange: true,
        notifyOnDeadlineApproaching: true,
        deadlineWarningDays: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSettingsRepository.create.mockReturnValue(newSettings);
      mockSettingsRepository.save.mockImplementation(async (s: any) => s);

      const dto = { defaultPriority: 2 };

      const result = await service.updateSettings(dto, mockUser as User);

      expect(mockSettingsRepository.create).toHaveBeenCalledWith({ companyId: mockCompanyId });
      expect(result.defaultPriority).toBe(2);
    });

    it('should preserve existing values when dto fields are undefined', async () => {
      const existingSettings = {
        ...mockSettings,
        deadlineWarningDays: 7,
        autoAssignEnabled: true,
      };
      mockSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSettingsRepository.save.mockImplementation(async (s: any) => s);

      // Empty update — no fields set
      const dto = {};

      const result = await service.updateSettings(dto, mockUser as User);

      expect(result.deadlineWarningDays).toBe(7);
      expect(result.autoAssignEnabled).toBe(true);
    });
  });
});
