import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KsefEnvironment } from '@accounting/common';
import { KsefEncryptionException } from '../exceptions';
import type { KsefPublicKeyCertificate } from '../generated';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KSEF_API_PATHS, KSEF_DEFAULTS } from '../constants';

export interface EncryptedInvoiceData {
  encryptedContent: Buffer;
  encryptedContentBase64: string;
  encryptedSymmetricKey: string; // base64
  initializationVector: string;  // base64
  originalHash: string;          // SHA-256 base64 (KSeF format)
  originalSize: number;
  encryptedHash: string;         // SHA-256 base64 (KSeF format)
  encryptedSize: number;
}

export interface AesKeyPair {
  key: Buffer;  // 256-bit AES key
  iv: Buffer;   // 128-bit IV
}

@Injectable()
export class KsefCryptoService {
  private readonly logger = new Logger(KsefCryptoService.name);
  private readonly rsaPublicKeyCache = new Map<string, { key: crypto.KeyObject; fetchedAt: number }>();

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

  async wrapAesKey(
    aesKey: Buffer,
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    forceRefresh = false,
  ): Promise<Buffer> {
    try {
      const rsaPublicKey = await this.getRsaPublicKey(
        environment,
        companyId,
        userId,
        'SymmetricKeyEncryption',
        forceRefresh,
      );
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

  /**
   * Compute SHA-256 hash and return as Base64-encoded string.
   * KSeF API uses Base64-encoded SHA-256 hashes for invoice integrity checks.
   */
  computeSha256Base64(data: Buffer | string): string {
    return crypto.createHash('sha256').update(data).digest('base64');
  }

  async encryptInvoiceXml(
    xml: string,
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    forceRefresh = false,
  ): Promise<EncryptedInvoiceData> {
    const xmlBuffer = Buffer.from(xml, 'utf-8');
    const { key, iv } = this.generateAesKey();

    const encrypted = this.encryptWithAes(xmlBuffer, key, iv);
    const wrappedKey = await this.wrapAesKey(key, environment, companyId, userId, forceRefresh);

    return {
      encryptedContent: encrypted,
      encryptedContentBase64: encrypted.toString('base64'),
      encryptedSymmetricKey: wrappedKey.toString('base64'),
      initializationVector: iv.toString('base64'),
      originalHash: this.computeSha256Base64(xmlBuffer),
      originalSize: xmlBuffer.length,
      encryptedHash: this.computeSha256Base64(encrypted),
      encryptedSize: encrypted.length,
    };
  }

  /**
   * Fetch and cache the RSA public key for a specific usage.
   * KSeF 2.0 returns two certificates with different usages:
   * - "KsefTokenEncryption" — for encrypting KSeF tokens during auth
   * - "SymmetricKeyEncryption" — for encrypting AES keys (invoice encryption)
   *
   * Pass `forceRefresh: true` from the catch-path of an auth/session call to
   * recover from MoF emergency key rotation without waiting for the cache TTL.
   */
  async getRsaPublicKey(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    usage: 'KsefTokenEncryption' | 'SymmetricKeyEncryption' = 'SymmetricKeyEncryption',
    forceRefresh = false,
  ): Promise<crypto.KeyObject> {
    const cacheKey = `${environment}:${usage}`;
    if (forceRefresh) {
      this.rsaPublicKeyCache.delete(cacheKey);
    }
    const cached = this.rsaPublicKeyCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < KSEF_DEFAULTS.PUBLIC_KEY_CACHE_TTL_MS) {
      return cached.key;
    }

    this.logger.log(
      `Fetching RSA public key for ${environment} (usage: ${usage}${forceRefresh ? ', forced refresh' : ''})`,
    );

    const response = await this.httpClient.request<KsefPublicKeyCertificate[]>({
      environment,
      method: 'GET',
      path: KSEF_API_PATHS.PUBLIC_KEY,
      companyId,
      userId,
      auditAction: 'FETCH_PUBLIC_KEY',
    });

    const certs = response.data;
    if (!certs || certs.length === 0) {
      throw new KsefEncryptionException();
    }

    // Find the certificate matching the requested usage
    const matchingCert = certs.find(c => c.usage?.includes(usage));
    const cert = matchingCert ?? certs[certs.length - 1]!;

    if (matchingCert) {
      this.logger.log(`Using certificate with usage: ${usage}`);
    } else {
      this.logger.warn(`No certificate found with usage ${usage}, falling back to last certificate`);
    }

    const certB64 = cert.certificate;
    const certPem = `-----BEGIN CERTIFICATE-----\n${certB64.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`;

    const key = crypto.createPublicKey(certPem);

    this.rsaPublicKeyCache.set(cacheKey, { key, fetchedAt: Date.now() });
    return key;
  }

  /**
   * Get the RSA public key PEM for token encryption (uses KsefTokenEncryption cert).
   */
  async getRsaPublicKeyPemForTokenAuth(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    forceRefresh = false,
  ): Promise<string> {
    const key = await this.getRsaPublicKey(
      environment,
      companyId,
      userId,
      'KsefTokenEncryption',
      forceRefresh,
    );
    return key.export({ type: 'spki', format: 'pem' }).toString('utf-8');
  }

  /**
   * Get the RSA public key PEM string (default: SymmetricKeyEncryption for invoices).
   */
  async getRsaPublicKeyPem(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    forceRefresh = false,
  ): Promise<string> {
    const key = await this.getRsaPublicKey(
      environment,
      companyId,
      userId,
      'SymmetricKeyEncryption',
      forceRefresh,
    );
    return key.export({ type: 'spki', format: 'pem' }).toString('utf-8');
  }

  /**
   * Drop all cached public keys for an environment. Use after a config change
   * (token re-saved, env switched) to ensure the next call re-fetches certs.
   */
  invalidatePublicKeyCache(environment?: KsefEnvironment): void {
    if (!environment) {
      this.rsaPublicKeyCache.clear();
      return;
    }
    for (const key of this.rsaPublicKeyCache.keys()) {
      if (key.startsWith(`${environment}:`)) {
        this.rsaPublicKeyCache.delete(key);
      }
    }
  }

  /**
   * Validate that a public-key certificate fetched from KSeF is currently valid
   * and return its X.509 metadata for diagnostics. Useful in connection-test
   * UIs so the operator sees which MoF cert their environment is talking to.
   */
  async describePublicKeyCertificate(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    usage: 'KsefTokenEncryption' | 'SymmetricKeyEncryption' = 'SymmetricKeyEncryption',
  ): Promise<{ subject: string; issuer: string; validFrom: Date; validTo: Date }> {
    const response = await this.httpClient.request<KsefPublicKeyCertificate[]>({
      environment,
      method: 'GET',
      path: KSEF_API_PATHS.PUBLIC_KEY,
      companyId,
      userId,
      auditAction: 'FETCH_PUBLIC_KEY',
    });

    const certs = response.data;
    if (!certs || certs.length === 0) {
      throw new KsefEncryptionException();
    }

    const matchingCert = certs.find(c => c.usage?.includes(usage)) ?? certs[certs.length - 1]!;
    const certPem = `-----BEGIN CERTIFICATE-----\n${matchingCert.certificate.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`;
    const x509 = new crypto.X509Certificate(certPem);

    return {
      subject: x509.subject,
      issuer: x509.issuer,
      validFrom: new Date(x509.validFrom),
      validTo: new Date(x509.validTo),
    };
  }

  extractCertBase64(certPem: string): string {
    return certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');
  }

  validatePrivateKey(privateKeyPem: string, passphrase?: string): void {
    try {
      crypto.createPrivateKey({
        key: privateKeyPem,
        ...(passphrase ? { passphrase } : {}),
      });
    } catch {
      throw new KsefEncryptionException(
        passphrase
          ? 'Nieprawidłowy klucz prywatny lub hasło'
          : 'Nieprawidłowy klucz prywatny'
      );
    }
  }

  validateCertificate(certPem: string): { subject: string; issuer: string; validTo: Date } {
    try {
      const cert = new crypto.X509Certificate(certPem);
      return {
        subject: cert.subject,
        issuer: cert.issuer,
        validTo: new Date(cert.validTo),
      };
    } catch {
      throw new KsefEncryptionException('Nieprawidłowy certyfikat X.509');
    }
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
