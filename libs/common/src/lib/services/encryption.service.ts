import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Service for encrypting and decrypting sensitive data
 * Uses AES-256-CBC encryption algorithm
 *
 * @example
 * ```typescript
 * constructor(private encryptionService: EncryptionService) {}
 *
 * async savePassword() {
 *   const encrypted = this.encryptionService.encrypt('myPassword123');
 *   // Save encrypted to database
 * }
 *
 * async getPassword() {
 *   const encrypted = // Get from database
 *   const decrypted = this.encryptionService.decrypt(encrypted);
 * }
 * ```
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly encoding: BufferEncoding = 'hex';

  /**
   * Get encryption key from environment variable
   * Creates a 32-byte key using scrypt
   */
  private getKey(): Buffer {
    const secret = process.env['ENCRYPTION_KEY'];

    if (!secret) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. ' +
        'Please add ENCRYPTION_KEY to your .env file with a secure random string.'
      );
    }

    if (secret.length < 16) {
      throw new Error(
        'ENCRYPTION_KEY must be at least 16 characters long for security.'
      );
    }

    // Derive a key using scrypt for better security
    return scryptSync(secret, 'salt', this.keyLength);
  }

  /**
   * Encrypt a string
   * Returns encrypted string in format: iv:encryptedData
   *
   * @param text - Plain text to encrypt
   * @returns Encrypted string (format: iv:encryptedData)
   */
  encrypt(text: string): string {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const key = this.getKey();
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', this.encoding);
    encrypted += cipher.final(this.encoding);

    // Return IV and encrypted data separated by colon
    return `${iv.toString(this.encoding)}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * Expects format: iv:encryptedData
   *
   * @param encryptedText - Encrypted string (format: iv:encryptedData)
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new Error('Text to decrypt cannot be empty');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error(
        'Invalid encrypted text format. Expected format: iv:encryptedData'
      );
    }

    const [ivHex, encrypted] = parts;
    const key = this.getKey();
    const iv = Buffer.from(ivHex, this.encoding);
    const decipher = createDecipheriv(this.algorithm, key, iv);

    let decrypted = decipher.update(encrypted, this.encoding, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if encryption is properly configured
   * @returns true if ENCRYPTION_KEY is set and valid
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
