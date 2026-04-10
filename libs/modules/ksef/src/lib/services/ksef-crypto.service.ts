import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KsefEnvironment } from '@accounting/common';
import { KsefEncryptionException } from '../exceptions';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KSEF_API_PATHS, KSEF_DEFAULTS } from '../constants';

export interface EncryptedInvoiceData {
  encryptedContent: Buffer;
  encryptedContentBase64: string;
  encryptedSymmetricKey: string; // base64
  initializationVector: string;  // base64
  originalHash: string;          // SHA-256 hex
  originalSize: number;
  encryptedHash: string;         // SHA-256 hex
  encryptedSize: number;
}

export interface AesKeyPair {
  key: Buffer;  // 256-bit AES key
  iv: Buffer;   // 128-bit IV
}

@Injectable()
export class KsefCryptoService {
  private readonly logger = new Logger(KsefCryptoService.name);
  private readonly rsaPublicKeyCache = new Map<KsefEnvironment, { key: crypto.KeyObject; fetchedAt: number }>();

  constructor(
    private readonly httpClient: KsefHttpClientService,
  ) {}

  generateAesKey(): AesKeyPair {
    return {
      key: crypto.randomBytes(32), // 256 bits
      iv: crypto.randomBytes(16),  // 128 bits
    };
  }

  encryptWithAes(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    try {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      cipher.setAutoPadding(true); // PKCS#7 padding
      return Buffer.concat([cipher.update(data), cipher.final()]);
    } catch (error) {
      throw new KsefEncryptionException();
    }
  }

  async wrapAesKey(aesKey: Buffer, environment: KsefEnvironment, companyId: string, userId: string): Promise<Buffer> {
    try {
      const rsaPublicKey = await this.getRsaPublicKey(environment, companyId, userId);
      return crypto.publicEncrypt(
        {
          key: rsaPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        aesKey,
      );
    } catch (error) {
      if (error instanceof KsefEncryptionException) throw error;
      throw new KsefEncryptionException();
    }
  }

  computeSha256(data: Buffer | string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async encryptInvoiceXml(
    xml: string,
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
  ): Promise<EncryptedInvoiceData> {
    const xmlBuffer = Buffer.from(xml, 'utf-8');
    const { key, iv } = this.generateAesKey();

    const encrypted = this.encryptWithAes(xmlBuffer, key, iv);
    const wrappedKey = await this.wrapAesKey(key, environment, companyId, userId);

    return {
      encryptedContent: encrypted,
      encryptedContentBase64: encrypted.toString('base64'),
      encryptedSymmetricKey: wrappedKey.toString('base64'),
      initializationVector: iv.toString('base64'),
      originalHash: this.computeSha256(xmlBuffer),
      originalSize: xmlBuffer.length,
      encryptedHash: this.computeSha256(encrypted),
      encryptedSize: encrypted.length,
    };
  }

  async getRsaPublicKey(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
  ): Promise<crypto.KeyObject> {
    const cached = this.rsaPublicKeyCache.get(environment);
    if (cached && Date.now() - cached.fetchedAt < KSEF_DEFAULTS.PUBLIC_KEY_CACHE_TTL_MS) {
      return cached.key;
    }

    this.logger.log(`Fetching RSA public key for ${environment}`);

    const response = await this.httpClient.request<{ publicKey: string }>({
      environment,
      method: 'GET',
      path: KSEF_API_PATHS.PUBLIC_KEY,
      companyId,
      userId,
      auditAction: 'FETCH_PUBLIC_KEY',
    });

    const keyData = response.data.publicKey;
    const key = crypto.createPublicKey({
      key: Buffer.from(keyData, 'base64'),
      format: 'der',
      type: 'spki',
    });

    this.rsaPublicKeyCache.set(environment, { key, fetchedAt: Date.now() });
    return key;
  }

  encryptTokenForAuth(token: string, timestamp: string, rsaPublicKeyPem: string): string {
    // For KSeF token auth: encrypt "token|timestamp" with RSA-OAEP
    const plaintext = `${token}|${timestamp}`;
    const key = crypto.createPublicKey(rsaPublicKeyPem);
    const encrypted = crypto.publicEncrypt(
      {
        key,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(plaintext, 'utf-8'),
    );
    return encrypted.toString('base64');
  }
}
