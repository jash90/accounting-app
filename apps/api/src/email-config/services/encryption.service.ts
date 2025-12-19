import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption Service for sensitive data
 * Uses AES-256-CTR encryption with a secret key from environment variables
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey: string;

  constructor() {
    // Use encryption key from environment or generate one for development
    this.secretKey = process.env.ENCRYPTION_SECRET || 'default-encryption-key-change-in-production-32chars';

    if (this.secretKey.length < 32) {
      throw new Error('ENCRYPTION_SECRET must be at least 32 characters long');
    }
  }

  /**
   * Encrypt a string value
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: iv:encryptedData
   */
  async encrypt(text: string): Promise<string> {
    const iv = randomBytes(16);
    const key = (await scryptAsync(this.secretKey, 'salt', 32)) as Buffer;
    const cipher = createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText Encrypted string in format: iv:encryptedData
   * @returns Decrypted plain text
   */
  async decrypt(encryptedText: string): Promise<string> {
    const [ivHex, encryptedDataHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');

    const key = (await scryptAsync(this.secretKey, 'salt', 32)) as Buffer;
    const decipher = createDecipheriv(this.algorithm, key, iv);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
