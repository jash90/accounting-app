import { Test, type TestingModule } from '@nestjs/testing';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let module: TestingModule;

  // Save the original env vars once at the start
  const savedEncryptionKey = process.env.ENCRYPTION_KEY;
  const savedEncryptionSecret = process.env.ENCRYPTION_SECRET;
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    // Set up a valid encryption key for standard tests
    process.env.ENCRYPTION_KEY = 'test-encryption-key-min-32-chars!!';
    delete process.env.ENCRYPTION_SECRET;

    module = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    // Trigger onModuleInit to initialize dev key fallback if needed
    await module.init();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(async () => {
    await module.close();
    // Restore env vars after each test
    if (savedEncryptionKey !== undefined) {
      process.env.ENCRYPTION_KEY = savedEncryptionKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
    if (savedEncryptionSecret !== undefined) {
      process.env.ENCRYPTION_SECRET = savedEncryptionSecret;
    } else {
      delete process.env.ENCRYPTION_SECRET;
    }
    process.env.NODE_ENV = savedNodeEnv || 'test';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const plainText = 'mySecretPassword123';

      const encrypted = await service.encrypt(plainText);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // Should contain IV separator

      const decrypted = await service.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should produce different encrypted values for same input', async () => {
      const plainText = 'password';

      const encrypted1 = await service.encrypt(plainText);
      const encrypted2 = await service.encrypt(plainText);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(await service.decrypt(encrypted1)).toBe(plainText);
      expect(await service.decrypt(encrypted2)).toBe(plainText);
    });

    it('should handle special characters', async () => {
      const specialText = 'p@ssw0rd!#$%^&*(){}[]|\\<>?/~`';

      const encrypted = await service.encrypt(specialText);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', async () => {
      const unicodeText = '密码密码 🔐🔑 Пароль';

      const encrypted = await service.encrypt(unicodeText);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });

    it('should handle long text', async () => {
      const longText = 'a'.repeat(10000);

      const encrypted = await service.encrypt(longText);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });
  });

  describe('error handling', () => {
    it('should throw error when encrypting empty string', async () => {
      await expect(service.encrypt('')).rejects.toThrow('Text to encrypt cannot be empty');
    });

    it('should throw error when decrypting empty string', async () => {
      await expect(service.decrypt('')).rejects.toThrow('Invalid encrypted text');
    });

    it('should throw error when decrypting invalid format', async () => {
      await expect(service.decrypt('invalid-encrypted-text')).rejects.toThrow(
        'Invalid encrypted text format'
      );
    });

    it('should throw in production when ENCRYPTION_KEY is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SECRET;

      expect(() => new EncryptionService()).toThrow(
        'ENCRYPTION_SECRET environment variable is required'
      );
    });

    it('should throw in production when ENCRYPTION_KEY is too short', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENCRYPTION_KEY = 'short';
      delete process.env.ENCRYPTION_SECRET;

      expect(() => new EncryptionService()).toThrow('at least 32 characters');
    });
  });

  describe('isConfigured', () => {
    it('should return true when ENCRYPTION_KEY is properly set', () => {
      // service was created with a valid key in beforeEach
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false before onModuleInit when no env key in dev mode', () => {
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SECRET;
      process.env.NODE_ENV = 'test';

      // Constructor alone won't set secretKey in dev mode without valid env var
      const testService = new EncryptionService();
      // Before onModuleInit, secretKey is null (no env var, no dev file loaded yet)
      expect(testService.isConfigured()).toBe(false);
    });

    it('should return true after onModuleInit in dev mode even without env key', async () => {
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SECRET;
      process.env.NODE_ENV = 'test';

      const testModule = await Test.createTestingModule({
        providers: [EncryptionService],
      }).compile();
      await testModule.init();

      const testService = testModule.get<EncryptionService>(EncryptionService);
      // After onModuleInit, dev key is auto-generated
      expect(testService.isConfigured()).toBe(true);

      await testModule.close();
    });
  });
});
