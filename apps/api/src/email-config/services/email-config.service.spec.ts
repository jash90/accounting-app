import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { EmailConfiguration } from '@accounting/common';
import { EncryptionService, SystemCompanyService } from '@accounting/common/backend';

import { EmailConfigService } from './email-config.service';

describe('EmailConfigService', () => {
  let service: EmailConfigService;
  let emailConfigRepository: jest.Mocked<Repository<EmailConfiguration>>;
  let encryptionService: jest.Mocked<Pick<EncryptionService, 'encrypt'>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getSystemCompany'>>;

  const userId = 'user-1';
  const companyId = 'company-1';
  const systemCompanyId = 'system-company-1';

  const mockConfig: EmailConfiguration = {
    id: 'config-1',
    userId,
    companyId: null,
    displayName: 'Test Config',
    smtpHost: 'smtp.test.com',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: 'user@test.com',
    smtpPassword: 'encrypted-smtp',
    imapHost: 'imap.test.com',
    imapPort: 993,
    imapTls: true,
    imapUser: 'user@test.com',
    imapPassword: 'encrypted-imap',
    isActive: true,
  } as EmailConfiguration;

  const mockCreateDto = {
    displayName: 'Test Config',
    smtpHost: 'smtp.test.com',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: 'user@test.com',
    smtpPassword: 'plain-smtp-pass',
    imapHost: 'imap.test.com',
    imapPort: 993,
    imapTls: true,
    imapUser: 'user@test.com',
    imapPassword: 'plain-imap-pass',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    emailConfigRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<EmailConfiguration>>;

    encryptionService = {
      encrypt: jest.fn().mockResolvedValue('encrypted-value'),
    };

    systemCompanyService = {
      getSystemCompany: jest.fn().mockResolvedValue({ id: systemCompanyId, name: 'System Admin' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailConfigService,
          useFactory: () =>
            new EmailConfigService(
              emailConfigRepository as any,
              encryptionService as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(EmailConfiguration), useValue: emailConfigRepository },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(EmailConfigService);
  });

  describe('getUserConfig', () => {
    it('should return user email configuration', async () => {
      emailConfigRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getUserConfig(userId);

      expect(result).toEqual(mockConfig);
      expect(emailConfigRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when config not found', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserConfig(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompanyConfig', () => {
    it('should return company email configuration', async () => {
      const companyConfig = { ...mockConfig, userId: null, companyId } as EmailConfiguration;
      emailConfigRepository.findOne.mockResolvedValue(companyConfig);

      const result = await service.getCompanyConfig(companyId);

      expect(result).toEqual(companyConfig);
      expect(emailConfigRepository.findOne).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['company'],
      });
    });

    it('should throw NotFoundException when company config not found', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getCompanyConfig(companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUserConfig', () => {
    it('should create user config with encrypted passwords', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);
      emailConfigRepository.create.mockReturnValue(mockConfig);
      emailConfigRepository.save.mockResolvedValue(mockConfig);

      const result = await service.createUserConfig(userId, mockCreateDto as any);

      expect(result).toEqual(mockConfig);
      expect(encryptionService.encrypt).toHaveBeenCalledWith('plain-smtp-pass');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('plain-imap-pass');
      expect(emailConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already has config', async () => {
      emailConfigRepository.findOne.mockResolvedValue(mockConfig);

      await expect(service.createUserConfig(userId, mockCreateDto as any)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('createCompanyConfig', () => {
    it('should create company config with encrypted passwords', async () => {
      const companyConfig = { ...mockConfig, userId: null, companyId } as EmailConfiguration;
      emailConfigRepository.findOne.mockResolvedValue(null);
      emailConfigRepository.create.mockReturnValue(companyConfig);
      emailConfigRepository.save.mockResolvedValue(companyConfig);

      const result = await service.createCompanyConfig(companyId, mockCreateDto as any);

      expect(result).toEqual(companyConfig);
      expect(encryptionService.encrypt).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException when company already has config', async () => {
      emailConfigRepository.findOne.mockResolvedValue(mockConfig);

      await expect(service.createCompanyConfig(companyId, mockCreateDto as any)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('updateUserConfig', () => {
    it('should update config and encrypt new passwords', async () => {
      const updateDto = { smtpPassword: 'new-smtp-pass', imapPassword: 'new-imap-pass' };
      emailConfigRepository.findOne.mockResolvedValue({ ...mockConfig });
      emailConfigRepository.save.mockResolvedValue(mockConfig);

      await service.updateUserConfig(userId, updateDto as any);

      expect(encryptionService.encrypt).toHaveBeenCalledWith('new-smtp-pass');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('new-imap-pass');
      expect(emailConfigRepository.save).toHaveBeenCalled();
    });

    it('should update config without re-encrypting when no password change', async () => {
      const updateDto = { displayName: 'Updated Name' };
      emailConfigRepository.findOne.mockResolvedValue({ ...mockConfig });
      emailConfigRepository.save.mockResolvedValue(mockConfig);

      await service.updateUserConfig(userId, updateDto as any);

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserConfig', () => {
    it('should remove user email configuration', async () => {
      emailConfigRepository.findOne.mockResolvedValue(mockConfig);

      await service.deleteUserConfig(userId);

      expect(emailConfigRepository.remove).toHaveBeenCalledWith(mockConfig);
    });

    it('should throw NotFoundException when config not found', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUserConfig(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSystemAdminConfig', () => {
    it('should return system admin email configuration', async () => {
      const systemConfig = { ...mockConfig, companyId: systemCompanyId } as EmailConfiguration;
      emailConfigRepository.findOne.mockResolvedValue(systemConfig);

      const result = await service.getSystemAdminConfig();

      expect(result).toEqual(systemConfig);
      expect(systemCompanyService.getSystemCompany).toHaveBeenCalled();
      expect(emailConfigRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: systemCompanyId },
        relations: ['company'],
      });
    });

    it('should throw NotFoundException when system admin config not found', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getSystemAdminConfig()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSystemAdminCompanyId', () => {
    it('should return the system company ID', async () => {
      const result = await service.getSystemAdminCompanyId();

      expect(result).toBe(systemCompanyId);
      expect(systemCompanyService.getSystemCompany).toHaveBeenCalled();
    });
  });
});
