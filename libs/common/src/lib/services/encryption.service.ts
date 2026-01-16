import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const scryptAsync = promisify(scrypt);

// Path for persisting dev encryption key
const DEV_KEY_FILE = path.join(process.cwd(), '.encryption-key.dev');

// Format: salt:iv:authTag:encryptedData (all hex-encoded)
const ENCRYPTION_FORMAT_REGEX = /^[a-f0-9]{32}:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/i;

/**
 * Encryption Service for sensitive data
 * Uses AES-256-GCM authenticated encryption with random salt
 *
 * @example
 * ```typescript
 * constructor(private encryptionService: EncryptionService) {}
 *
 * async savePassword() {
 *   const encrypted = await this.encryptionService.encrypt('myPassword123');
 *   // Save encrypted to database
 * }
 *
 * async getPassword() {
 *   const encrypted = // Get from database
 *   const decrypted = await this.encryptionService.decrypt(encrypted);
 * }
 * ```
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private secretKey: string | null = null;

  constructor() {
    this.initializeKey();
  }

  private initializeKey(): void {
    const envKey = process.env['ENCRYPTION_SECRET'] || process.env['ENCRYPTION_KEY'];

    if (process.env['NODE_ENV'] === 'production') {
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
      // Development: use env var if available, otherwise use/create persistent file
      if (envKey && envKey.length >= 32) {
        this.secretKey = envKey;
      } else {
        this.secretKey = this.getOrCreateDevKey();
      }
    }
  }

  /**
   * Get or create a persistent development encryption key
   * Ensures encrypted data survives application restarts in development
   */
  private getOrCreateDevKey(): string {
    try {
      // Try to read existing key
      if (fs.existsSync(DEV_KEY_FILE)) {
        const existingKey = fs.readFileSync(DEV_KEY_FILE, 'utf-8').trim();
        if (existingKey.length >= 64) {
          this.logger.debug('Loaded existing development encryption key');
          return existingKey;
        }
      }

      // Generate new key and persist it
      const newKey = randomBytes(32).toString('hex');
      fs.writeFileSync(DEV_KEY_FILE, newKey, { mode: 0o600 }); // Read/write only for owner
      this.logger.log(
        `Generated new development encryption key and saved to ${DEV_KEY_FILE}`
      );
      return newKey;
    } catch (error) {
      // Fallback: generate key without persistence (with loud warning)
      const fallbackKey = randomBytes(32).toString('hex');
      this.logger.error(
        `Failed to persist development encryption key to ${DEV_KEY_FILE}. ` +
          'Encrypted data will be LOST on restart! Error: ' +
          (error instanceof Error ? error.message : String(error))
      );
      return fallbackKey;
    }
  }

  private getKey(): string {
    if (!this.secretKey) {
      this.initializeKey();
    }
    if (!this.secretKey) {
      throw new Error('Encryption key not initialized');
    }
    return this.secretKey;
  }

  /**
   * Encrypt a string value using AES-256-GCM with random salt
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: salt:iv:authTag:encryptedData (hex-encoded)
   */
  async encrypt(text: string): Promise<string> {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    // Generate random salt and IV for each encryption
    const salt = randomBytes(16);
    const iv = randomBytes(12); // GCM recommends 12-byte IV

    // Derive key using scrypt with random salt
    const key = (await scryptAsync(this.getKey(), salt, 32)) as Buffer;

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
      const key = (await scryptAsync(this.getKey(), salt, 32)) as Buffer;

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      // Don't expose internal error details
      throw new Error('Decryption failed: data may be corrupted or tampered');
    }
  }

  /**
   * Check if a string appears to be in the encrypted format
   * @param text String to check
   * @returns true if the string matches the encryption format
   */
  isEncryptedFormat(text: string): boolean {
    return ENCRYPTION_FORMAT_REGEX.test(text);
  }

  /**
   * Check if encryption is properly configured
   * @returns true if encryption key is set and valid
   */
  isConfigured(): boolean {
    try {
      this.getKey();
      return true;
    } catch {
      return false;
    }
  }
}
