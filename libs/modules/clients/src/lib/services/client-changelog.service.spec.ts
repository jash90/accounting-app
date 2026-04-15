import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { Repository } from 'typeorm';

import {
  Client,
  Company,
  EmploymentType,
  NotificationSettings,
  PaginatedResponseDto,
  TaxScheme,
  User,
  UserRole,
  VatStatus,
  ZusStatus,
  type ChangeLog,
} from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { ClientChangelogService } from './client-changelog.service';

// Mock fs/promises and handlebars globally
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('<html>{{clientName}}</html>'),
}));

jest.mock('handlebars', () => ({
  compile: jest
    .fn()
    .mockReturnValue((ctx: Record<string, unknown>) => `<html>${ctx['clientName'] || ''}</html>`),
}));

describe('ClientChangelogService', () => {
  let service: ClientChangelogService;
  let _notificationSettingsRepository: jest.Mocked<Repository<NotificationSettings>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let changeLogService: jest.Mocked<ChangeLogService>;
  let _configService: jest.Mocked<ConfigService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockUserId = 'user-789';

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: mockUserId,
      email: 'test@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: UserRole.EMPLOYEE,
      companyId: mockCompanyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  const createMockClient = (overrides: Partial<Client> = {}): Client =>
    ({
      id: mockClientId,
      companyId: mockCompanyId,
      name: 'Test Client Sp. z o.o.',
      nip: '1234567890',
      email: 'client@example.com',
      phone: '123456789',
      employmentType: EmploymentType.DG,
      vatStatus: VatStatus.VAT_MONTHLY,
      taxScheme: TaxScheme.GENERAL,
      zusStatus: ZusStatus.FULL,
      isActive: true,
      receiveEmailCopy: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Client;

  beforeEach(async () => {
    const mockNotificationSettingsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockCompanyRepo = {
      findOne: jest.fn(),
    };

    const mockClientRepo = {
      findOne: jest.fn(),
    };

    const mockChangeLogService = {
      getChangeLogs: jest.fn(),
      getCompanyChangeLogs: jest.fn(),
      formatChange: jest.fn(),
    };

    const mockEmailConfigService = {
      getDecryptedEmailConfigByCompanyId: jest.fn(),
      getDecryptedSmtpConfigByCompanyId: jest.fn(),
    };

    const mockEmailSenderService = {
      sendEmailAndSave: jest.fn(),
      sendBatchEmails: jest.fn(),
      sendBatchEmailsAndSave: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const mockSystemCompanyService = {
      getCompanyIdForUser: jest.fn().mockImplementation((user: User) => {
        if (!user.companyId) {
          const { InternalServerErrorException } = require('@nestjs/common');
          throw new InternalServerErrorException(
            'Użytkownik nie jest przypisany do żadnej firmy. Skontaktuj się z administratorem.'
          );
        }
        return Promise.resolve(user.companyId);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientChangelogService,
          useFactory: () =>
            new ClientChangelogService(
              mockClientRepo as any,
              mockChangeLogService as any,
              {
                notifyClientCreated: jest.fn().mockResolvedValue(undefined),
                notifyClientUpdated: jest.fn().mockResolvedValue(undefined),
                notifyClientFieldChange: jest.fn().mockResolvedValue(undefined),
              } as any,
              mockSystemCompanyService as any
            ),
        },
        {
          provide: getRepositoryToken(NotificationSettings),
          useValue: mockNotificationSettingsRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Client), useValue: mockClientRepo },
        { provide: ChangeLogService, useValue: mockChangeLogService },
        { provide: EmailConfigurationService, useValue: mockEmailConfigService },
        { provide: EmailSenderService, useValue: mockEmailSenderService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ClientChangelogService);
    _notificationSettingsRepository = module.get(getRepositoryToken(NotificationSettings));
    clientRepository = module.get(getRepositoryToken(Client));
    changeLogService = module.get(ChangeLogService);
    _configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================
  // getClientChangelog
  // ============================

  describe('getClientChangelog', () => {
    it('should return changelog for a valid client', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const mockLogs = [{ id: 'log-1' } as ChangeLog];

      clientRepository.findOne.mockResolvedValue(client);
      changeLogService.getChangeLogs.mockResolvedValue({ logs: mockLogs, total: 1 });

      const result = await service.getClientChangelog(mockClientId, user);

      expect(result).toEqual({ logs: mockLogs, total: 1 });
      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockClientId, companyId: mockCompanyId },
      });
      expect(changeLogService.getChangeLogs).toHaveBeenCalledWith('Client', mockClientId);
    });

    it('should throw when user has no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(service.getClientChangelog(mockClientId, user)).rejects.toThrow();
    });

    it('should throw ForbiddenException when client belongs to different company', async () => {
      const user = createMockUser();
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.getClientChangelog(mockClientId, user)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================
  // getCompanyChangelog
  // ============================

  describe('getCompanyChangelog', () => {
    it('should return paginated changelog', async () => {
      const user = createMockUser();
      const mockLogs = [{ id: 'log-1' } as ChangeLog, { id: 'log-2' } as ChangeLog];

      changeLogService.getCompanyChangeLogs.mockResolvedValue({ logs: mockLogs, total: 2 });

      const result = await service.getCompanyChangelog(user, { page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(2);
      expect(changeLogService.getCompanyChangeLogs).toHaveBeenCalledWith('Client', mockCompanyId, {
        limit: 10,
        offset: 0,
      });
    });

    it('should use default pagination when none provided', async () => {
      const user = createMockUser();
      changeLogService.getCompanyChangeLogs.mockResolvedValue({ logs: [], total: 0 });

      await service.getCompanyChangelog(user);

      expect(changeLogService.getCompanyChangeLogs).toHaveBeenCalledWith('Client', mockCompanyId, {
        limit: 50,
        offset: 0,
      });
    });

    it('should calculate offset from page and limit', async () => {
      const user = createMockUser();
      changeLogService.getCompanyChangeLogs.mockResolvedValue({ logs: [], total: 0 });

      await service.getCompanyChangelog(user, { page: 3, limit: 20 });

      expect(changeLogService.getCompanyChangeLogs).toHaveBeenCalledWith('Client', mockCompanyId, {
        limit: 20,
        offset: 40,
      });
    });

    it('should throw when user has no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(service.getCompanyChangelog(user)).rejects.toThrow();
    });
  });

  // ============================
  // Notification delegation tests
  // ============================
  // Note: notify* methods delegate to ClientChangelogEmailService.
  // These tests verify delegation; internal email logic is tested in
  // ClientChangelogEmailService tests.

  describe('notifyClientCreated', () => {
    it('should delegate to emailService.notifyClientCreated', async () => {
      const user = createMockUser();
      const client = createMockClient();

      await service.notifyClientCreated(client, user);

      const emailSvc = (service as any).emailService;
      expect(emailSvc.notifyClientCreated).toHaveBeenCalledWith(client, user);
    });
  });

  describe('notifyClientUpdated', () => {
    it('should delegate to emailService.notifyClientUpdated', async () => {
      const user = createMockUser();
      const client = createMockClient({ name: 'Updated' });
      const oldValues = { name: 'Old' };

      await service.notifyClientUpdated(client, oldValues, user);

      const emailSvc = (service as any).emailService;
      expect(emailSvc.notifyClientUpdated).toHaveBeenCalledWith(client, oldValues, user);
    });
  });

  describe('notifyClientDeleted', () => {
    it('should delegate to emailService.notifyClientDeleted', async () => {
      const user = createMockUser();
      const client = createMockClient();

      // emailService mock doesn't have notifyClientDeleted, add it
      const emailSvc = (service as any).emailService;
      emailSvc.notifyClientDeleted = jest.fn().mockResolvedValue(undefined);

      await service.notifyClientDeleted(client, user);

      expect(emailSvc.notifyClientDeleted).toHaveBeenCalledWith(client, user);
    });
  });

  describe('notifyBulkClientsDeleted', () => {
    it('should delegate to emailService.notifyBulkClientsDeleted', async () => {
      const user = createMockUser();
      const clients = [createMockClient()];

      const emailSvc = (service as any).emailService;
      emailSvc.notifyBulkClientsDeleted = jest.fn().mockResolvedValue(undefined);

      await service.notifyBulkClientsDeleted(clients, user);

      expect(emailSvc.notifyBulkClientsDeleted).toHaveBeenCalledWith(clients, user);
    });
  });

  describe('notifyBulkClientsUpdated', () => {
    it('should delegate to emailService.notifyBulkClientsUpdated', async () => {
      const user = createMockUser();
      const updates = [{ client: createMockClient(), oldValues: { name: 'Old' } }];

      const emailSvc = (service as any).emailService;
      emailSvc.notifyBulkClientsUpdated = jest.fn().mockResolvedValue(undefined);

      await service.notifyBulkClientsUpdated(updates, user);

      expect(emailSvc.notifyBulkClientsUpdated).toHaveBeenCalledWith(updates, user);
    });
  });
});
// END OF FILE - remaining notify/change-tracking tests moved to ClientChangelogEmailService tests
