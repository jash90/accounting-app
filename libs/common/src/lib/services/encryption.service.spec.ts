import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up test encryption key
    process.env = {
      ...originalEnv,
      ENCRYPTION_KEY: 'test-encryption-key-min-16-chars',
    };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plainText = 'mySecretPassword123';

      const encrypted = service.encrypt(plainText);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // Should contain IV separator

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should produce different encrypted values for same input', () => {
      const plainText = 'password';

      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(plainText);
      expect(service.decrypt(encrypted2)).toBe(plainText);
    });

    it('should handle special characters', () => {
      const specialText = 'p@ssw0rd!#$%^&*(){}[]|\\<>?/~`';

      const encrypted = service.encrypt(specialText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '密码密码 🔐🔑 Пароль';

      const encrypted = service.encrypt(unicodeText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(10000);

      const encrypted = service.encrypt(longText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });
  });

  describe('error handling', () => {
    it('should throw error when encrypting empty string', () => {
      expect(() => service.encrypt('')).toThrow('Text to encrypt cannot be empty');
    });

    it('should throw error when decrypting empty string', () => {
      expect(() => service.decrypt('')).toThrow('Text to decrypt cannot be empty');
    });

    it('should throw error when decrypting invalid format', () => {
      expect(() => service.decrypt('invalid-encrypted-text')).toThrow(
        'Invalid encrypted text format'
      );
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const testService = new EncryptionService();
      expect(() => testService.encrypt('test')).toThrow(
        'ENCRYPTION_KEY environment variable is not set'
      );

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY is too short', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      const testService = new EncryptionService();
      expect(() => testService.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be at least 16 characters long'
      );

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('isConfigured', () => {
    it('should return true when ENCRYPTION_KEY is properly set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const testService = new EncryptionService();
      expect(testService.isConfigured()).toBe(false);

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should return false when ENCRYPTION_KEY is too short', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      const testService = new EncryptionService();
      expect(testService.isConfigured()).toBe(false);

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
