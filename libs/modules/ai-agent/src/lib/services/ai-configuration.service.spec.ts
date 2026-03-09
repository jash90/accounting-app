import { type ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { AIConfiguration, AIProvider, type User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { AIConfigurationService } from './ai-configuration.service';

describe('AIConfigurationService', () => {
  let service: AIConfigurationService;
  let configRepo: jest.Mocked<Repository<AIConfiguration>>;
  let systemCompanyService: jest.Mocked<
    Pick<SystemCompanyService, 'getCompanyIdForUser' | 'getSystemCompanyId'>
  >;
  let nestConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const systemCompanyId = 'system-company-1';
  const encryptionKey = '01234567890123456789012345678901'; // 32 bytes

  const mockAdmin = { id: 'admin-1', companyId: null, role: UserRole.ADMIN } as unknown as User;
  const mockUser = { id: 'user-1', companyId: 'company-1', role: UserRole.EMPLOYEE } as User;

  const mockConfig: AIConfiguration = {
    id: 'config-1',
    companyId: systemCompanyId,
    provider: AIProvider.OPENAI,
    model: 'gpt-4',
    apiKey: null,
    embeddingApiKey: null,
    systemPrompt: 'You are helpful.',
    temperature: 0.7,
    maxTokens: 1000,
    enableStreaming: true,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-ada-002',
    createdById: mockAdmin.id,
    updatedById: mockAdmin.id,
  } as unknown as AIConfiguration;

  beforeEach(async () => {
    jest.clearAllMocks();

    configRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<AIConfiguration>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(systemCompanyId),
      getSystemCompanyId: jest.fn().mockResolvedValue(systemCompanyId),
    };

    nestConfigService = {
      get: jest.fn().mockReturnValue(encryptionKey),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AIConfigurationService,
          useFactory: () =>
            new AIConfigurationService(
              configRepo as any,
              systemCompanyService as any,
              nestConfigService as any
            ),
        },
        { provide: getRepositoryToken(AIConfiguration), useValue: configRepo },
      ],
    }).compile();

    service = module.get(AIConfigurationService);
  });

  describe('constructor', () => {
    it('should throw if encryption key is missing', () => {
      const missingKeyConfig = { get: jest.fn().mockReturnValue(undefined) };

      expect(
        () =>
          new AIConfigurationService(
            configRepo as any,
            systemCompanyService as any,
            missingKeyConfig as any
          )
      ).toThrow('AI_API_KEY_ENCRYPTION_KEY environment variable is required');
    });

    it('should throw if encryption key is not 32 bytes', () => {
      const shortKeyConfig = { get: jest.fn().mockReturnValue('too-short') };

      expect(
        () =>
          new AIConfigurationService(
            configRepo as any,
            systemCompanyService as any,
            shortKeyConfig as any
          )
      ).toThrow('must be exactly 32 bytes');
    });
  });

  describe('getConfiguration', () => {
    it('should return global config from system company', async () => {
      configRepo.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfiguration(mockUser);

      expect(result).toEqual(mockConfig);
      expect(systemCompanyService.getSystemCompanyId).toHaveBeenCalled();
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: { companyId: systemCompanyId },
        relations: ['createdBy', 'updatedBy', 'company'],
      });
    });

    it('should return null if no config exists', async () => {
      configRepo.findOne.mockResolvedValue(null);

      const result = await service.getConfiguration(mockUser);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create config with encrypted API key (ADMIN only)', async () => {
      configRepo.findOne.mockResolvedValueOnce(null); // no existing
      configRepo.create.mockReturnValue(mockConfig);
      configRepo.save.mockResolvedValue(mockConfig);
      configRepo.findOne.mockResolvedValueOnce(mockConfig); // return after save

      const result = await service.create(
        {
          provider: AIProvider.OPENAI,
          model: 'gpt-4',
          apiKey: 'sk-test-key-123',
        } as any,
        mockAdmin
      );

      expect(result).toEqual(mockConfig);
      expect(configRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: expect.stringContaining(':'), // encrypted format iv:authTag:data
          companyId: systemCompanyId,
        })
      );
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.create({ apiKey: 'key' } as any, mockUser)).rejects.toThrow(
        'Only admins can create AI configuration'
      );
    });

    it('should throw ConflictException if config already exists', async () => {
      configRepo.findOne.mockResolvedValueOnce(mockConfig); // existing found

      await expect(service.create({ apiKey: 'key' } as any, mockAdmin)).rejects.toThrow(
        'Configuration already exists'
      );
    });
  });

  describe('update', () => {
    it('should update config fields and encrypt new API key', async () => {
      configRepo.findOne.mockResolvedValue({ ...mockConfig, apiKey: 'old-encrypted' } as any);
      configRepo.save.mockImplementation((entity) => Promise.resolve(entity as any));

      await service.update(
        {
          model: 'gpt-4-turbo',
          apiKey: 'sk-new-key',
          temperature: 0.5,
        } as any,
        mockAdmin
      );

      expect(configRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          temperature: 0.5,
          apiKey: expect.stringContaining(':'),
          updatedById: mockAdmin.id,
        })
      );
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.update({} as any, mockUser)).rejects.toThrow(
        'Only admins can update AI configuration'
      );
    });

    it('should throw NotFoundException if config does not exist', async () => {
      configRepo.findOne.mockResolvedValue(null);

      await expect(service.update({} as any, mockAdmin)).rejects.toThrow('Configuration not found');
    });

    it('should clear embedding API key when empty string provided', async () => {
      configRepo.findOne.mockResolvedValue({ ...mockConfig, embeddingApiKey: 'old' } as any);
      configRepo.save.mockImplementation((entity) => Promise.resolve(entity as any));

      await service.update({ embeddingApiKey: '' } as any, mockAdmin);

      expect(configRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ embeddingApiKey: null })
      );
    });
  });

  describe('encryption / decryption', () => {
    it('should encrypt and decrypt API key using AES-256-GCM (round-trip)', async () => {
      const testApiKey = 'sk-test-secret-api-key-12345';

      // Create config with encrypted key
      configRepo.findOne.mockResolvedValueOnce(null);
      let savedApiKey = '';
      configRepo.create.mockImplementation((data: any) => {
        savedApiKey = data.apiKey;
        return data;
      });
      configRepo.save.mockImplementation((entity) => Promise.resolve(entity as any));
      configRepo.findOne.mockResolvedValueOnce(null); // return after save

      await service.create(
        { provider: AIProvider.OPENAI, model: 'gpt-4', apiKey: testApiKey } as any,
        mockAdmin
      );

      // Verify encrypted format is iv:authTag:data (3 parts)
      const parts = savedApiKey.split(':');
      expect(parts).toHaveLength(3);

      // Now decrypt
      configRepo.findOne.mockResolvedValue({
        apiKey: savedApiKey,
        companyId: systemCompanyId,
      } as any);
      const decrypted = await service.getDecryptedApiKey(mockUser);
      expect(decrypted).toBe(testApiKey);
    });

    it('should throw BadRequestException on corrupted encrypted key', async () => {
      configRepo.findOne.mockResolvedValue({
        apiKey: 'corrupted-data',
        companyId: systemCompanyId,
      } as any);

      await expect(service.getDecryptedApiKey(mockUser)).rejects.toThrow(
        'Failed to decrypt API key'
      );
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should throw NotFoundException if no config exists', async () => {
      configRepo.findOne.mockResolvedValue(null);

      await expect(service.getDecryptedApiKey(mockUser)).rejects.toThrow(
        'AI configuration not found'
      );
    });

    it('should throw NotFoundException if API key is not set', async () => {
      configRepo.findOne.mockResolvedValue({ ...mockConfig, apiKey: null } as any);

      await expect(service.getDecryptedApiKey(mockUser)).rejects.toThrow('API key not configured');
    });
  });

  describe('clearApiKey', () => {
    it('should clear the API key for admin', async () => {
      configRepo.findOne.mockResolvedValue({ ...mockConfig, apiKey: 'encrypted' } as any);
      configRepo.save.mockImplementation((entity) => Promise.resolve(entity as any));

      await service.clearApiKey(mockAdmin);

      expect(configRepo.save).toHaveBeenCalledWith(expect.objectContaining({ apiKey: null }));
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.clearApiKey(mockUser)).rejects.toThrow('Only admins can reset API key');
    });

    it('should throw BadRequestException if API key is already null', async () => {
      configRepo.findOne.mockResolvedValue({ ...mockConfig, apiKey: null } as any);

      await expect(service.clearApiKey(mockAdmin)).rejects.toThrow('API key is not configured');
    });
  });

  describe('getEmbeddingConfig', () => {
    it('should return embedding config with defaults', async () => {
      // Encrypt an API key for the mock config
      configRepo.findOne.mockResolvedValueOnce(null);
      let savedApiKey = '';
      configRepo.create.mockImplementation((data: any) => {
        savedApiKey = data.apiKey;
        return data;
      });
      configRepo.save.mockImplementation((e) => Promise.resolve(e as any));
      configRepo.findOne.mockResolvedValueOnce(null);

      await service.create(
        { provider: AIProvider.OPENAI, model: 'gpt-4', apiKey: 'sk-key' } as any,
        mockAdmin
      );

      configRepo.findOne.mockResolvedValue({
        ...mockConfig,
        apiKey: savedApiKey,
        embeddingApiKey: null,
        embeddingModel: null,
        embeddingProvider: null,
      } as any);

      const result = await service.getEmbeddingConfig(mockUser);

      expect(result.apiKey).toBe('sk-key');
      expect(result.model).toBe('text-embedding-ada-002');
      expect(result.provider).toBe('openai');
    });
  });
});
