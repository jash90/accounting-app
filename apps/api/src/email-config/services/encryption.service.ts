import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Format: salt:iv:authTag:encryptedData (all hex-encoded)
const ENCRYPTION_FORMAT_REGEX = /^[a-f0-9]{32}:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/i;

/**
 * Encryption Service for sensitive data
 * Uses AES-256-GCM authenticated encryption with random salt
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: string;

  constructor() {
    const envKey = process.env.ENCRYPTION_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!envKey) {
        throw new Error(
          'ENCRYPTION_SECRET environment variable is required in production'
        );
      }
      if (envKey.length < 32) {
        throw new Error('ENCRYPTION_SECRET must be at least 32 characters long');
      }
      this.secretKey = envKey;
    } else {
      // Development: use env var if available, otherwise generate random key
      if (envKey && envKey.length >= 32) {
        this.secretKey = envKey;
      } else {
        // Generate a random key for development
        this.secretKey = randomBytes(32).toString('hex');
        this.logger.warn(
          'Using randomly generated encryption key for development. ' +
            'Set ENCRYPTION_SECRET environment variable for persistence.'
        );
      }
    }
  }

  /**
   * Encrypt a string value using AES-256-GCM with random salt
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: salt:iv:authTag:encryptedData (hex-encoded)
   */
  async encrypt(text: string): Promise<string> {
    // Generate random salt and IV for each encryption
    const salt = randomBytes(16);
    const iv = randomBytes(12); // GCM recommends 12-byte IV

    // Derive key using scrypt with random salt
    const key = (await scryptAsync(this.secretKey, salt, 32)) as Buffer;

    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag (GCM provides this)
    const authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encryptedData
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText Encrypted string in format: salt:iv:authTag:encryptedData
   * @returns Decrypted plain text
   * @throws Error if format is invalid or decryption fails
   */
  async decrypt(encryptedText: string): Promise<string> {
    // Validate input format
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('Invalid encrypted text: must be a non-empty string');
    }

    if (!ENCRYPTION_FORMAT_REGEX.test(encryptedText)) {
      throw new Error(
        'Invalid encrypted text format: expected salt:iv:authTag:encryptedData'
      );
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error(
        'Invalid encrypted text format: expected 4 parts separated by colons'
      );
    }

    const [saltHex, ivHex, authTagHex, encryptedDataHex] = parts;

    try {
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encryptedData = Buffer.from(encryptedDataHex, 'hex');

      // Derive key using the same salt that was used for encryption
      const key = (await scryptAsync(this.secretKey, salt, 32)) as Buffer;

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Don't expose internal error details
      throw new Error('Decryption failed: data may be corrupted or tampered');
    }
  }

  /**
   * Check if a string appears to be in the new encrypted format
   * @param text String to check
   * @returns true if the string matches the new encryption format
   */
  isEncryptedFormat(text: string): boolean {
    return ENCRYPTION_FORMAT_REGEX.test(text);
  }
}
