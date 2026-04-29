import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { KsefConfiguration, KsefEnvironment } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { KsefCryptoService } from '../ksef-crypto.service';
import { KsefHttpClientService } from '../ksef-http-client.service';
import { KsefAuditLogService } from '../ksef-audit-log.service';
import { KsefEncryptionException } from '../../exceptions';

describe('KsefCryptoService', () => {
  let service: KsefCryptoService;

  beforeEach(async () => {
    const mockAuditLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefCryptoService,
        KsefHttpClientService,
        { provide: KsefAuditLogService, useValue: mockAuditLogService },
        { provide: getRepositoryToken(KsefConfiguration), useValue: { findOne: jest.fn() } },
        { provide: EncryptionService, useValue: { decrypt: jest.fn() } },
      ],
    }).compile();

    service = module.get(KsefCryptoService);
  });

  describe('generateAesKey', () => {
    it('should generate a 256-bit key and 128-bit IV', () => {
      const { key, iv } = service.generateAesKey();

      expect(key).toHaveLength(32); // 256 bits = 32 bytes
      expect(iv).toHaveLength(16); // 128 bits = 16 bytes
      expect(key).toBeInstanceOf(Buffer);
      expect(iv).toBeInstanceOf(Buffer);
    });

    it('should generate different keys each time', () => {
      const key1 = service.generateAesKey();
      const key2 = service.generateAesKey();

      expect(key1.key.equals(key2.key)).toBe(false);
      expect(key1.iv.equals(key2.iv)).toBe(false);
    });
  });

  describe('encryptWithAes', () => {
    it('should encrypt and decrypt data correctly', () => {
      const { key, iv } = service.generateAesKey();
      const plaintext = Buffer.from('<Faktura>Test invoice XML</Faktura>', 'utf-8');

      const encrypted = service.encryptWithAes(plaintext, key, iv);

      expect(encrypted).toBeInstanceOf(Buffer);
      expect(encrypted.equals(plaintext)).toBe(false);

      // Verify decryption works
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      expect(decrypted.toString('utf-8')).toBe(plaintext.toString('utf-8'));
    });

    it('should handle empty data', () => {
      const { key, iv } = service.generateAesKey();
      const plaintext = Buffer.from('', 'utf-8');

      const encrypted = service.encryptWithAes(plaintext, key, iv);
      expect(encrypted).toBeInstanceOf(Buffer);
      expect(encrypted.length).toBeGreaterThan(0); // PKCS#7 padding adds at least 16 bytes
    });

    it('should handle large data', () => {
      const { key, iv } = service.generateAesKey();
      const plaintext = Buffer.from('A'.repeat(1_000_000), 'utf-8');

      const encrypted = service.encryptWithAes(plaintext, key, iv);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      expect(decrypted.length).toBe(plaintext.length);
    });
  });

  describe('computeSha256', () => {
    it('should compute SHA-256 hash as hex', () => {
      const data = 'test data';
      const hash = service.computeSha256(data);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const data = 'consistent data';
      const hash1 = service.computeSha256(data);
      const hash2 = service.computeSha256(data);

      expect(hash1).toBe(hash2);
    });

    it('should accept Buffer input', () => {
      const data = Buffer.from('buffer data', 'utf-8');
      const hash = service.computeSha256(data);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.computeSha256('data1');
      const hash2 = service.computeSha256('data2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeSha256Base64', () => {
    it('should compute SHA-256 hash as base64', () => {
      const data = 'test data';
      const hash = service.computeSha256Base64(data);

      // Base64 encoded SHA-256 = 32 bytes → ~44 chars in base64
      expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(hash.length).toBe(44);
    });

    it('should be consistent with hex hash', () => {
      const data = 'test data';
      const hexHash = service.computeSha256(data);
      const b64Hash = service.computeSha256Base64(data);

      // Both should decode to the same bytes
      const hexBuffer = Buffer.from(hexHash, 'hex');
      const b64Buffer = Buffer.from(b64Hash, 'base64');
      expect(hexBuffer.equals(b64Buffer)).toBe(true);
    });
  });

  describe('encryptTokenForAuth', () => {
    it('should encrypt token|timestamp format', () => {
      // Generate a test RSA key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString('utf-8');

      const token = 'test-token-12345';
      const timestamp = '2026-04-10T12:00:00.000Z';

      const encrypted = service.encryptTokenForAuth(token, timestamp, pem);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      // Verify we can decrypt it
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encrypted, 'base64'),
      );

      expect(decrypted.toString('utf-8')).toBe(`${token}|${timestamp}`);
    });
  });
});
