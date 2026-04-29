import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { KsefAuthMethod, KsefConfiguration, KsefEnvironment, User, UserRole } from '@accounting/common';
import { EncryptionService, SystemCompanyService } from '@accounting/common/backend';

import {
  KsefConfigResponseDto,
  KsefConnectionTestResultDto,
  KsefPublicKeyCertificateInfoDto,
  UpsertKsefConfigDto,
} from '../dto';
import { KSEF_API_PATHS, KSEF_MESSAGES } from '../constants';
import { KsefConfigurationNotFoundException } from '../exceptions';
import { KsefAuthService } from './ksef-auth.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';

@Injectable()
export class KsefConfigService {
  private readonly logger = new Logger(KsefConfigService.name);

  constructor(
    @InjectRepository(KsefConfiguration)
    private readonly configRepo: Repository<KsefConfiguration>,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly encryptionService: EncryptionService,
    private readonly httpClient: KsefHttpClientService,
    @Inject(forwardRef(() => KsefAuthService))
    private readonly authService: KsefAuthService,
    private readonly cryptoService: KsefCryptoService,
  ) {}

  async getConfig(companyId: string): Promise<KsefConfiguration | null> {
    return this.configRepo.findOne({ where: { companyId } });
  }

  async getConfigOrFail(companyId: string): Promise<KsefConfiguration> {
    const config = await this.configRepo.findOne({ where: { companyId } });
    if (!config) {
      throw new KsefConfigurationNotFoundException(companyId);
    }
    return config;
  }

  async createOrUpdate(
    dto: UpsertKsefConfigDto,
    user: User,
  ): Promise<KsefConfigResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    let config = await this.configRepo.findOne({ where: { companyId } });

    if (!config) {
      config = this.configRepo.create({
        companyId,
        createdById: user.id,
      });
    }

    // Only ADMIN can choose the environment; others use KSEF_ENVIRONMENT env var
    if (user.role === UserRole.ADMIN) {
      config.environment = dto.environment;
    } else {
      const envFromFlag = process.env.KSEF_ENVIRONMENT as KsefEnvironment | undefined;
      config.environment = envFromFlag && Object.values(KsefEnvironment).includes(envFromFlag)
        ? envFromFlag
        : KsefEnvironment.DEMO;
    }
    config.authMethod = dto.authMethod;
    config.updatedById = user.id;

    if (dto.nip !== undefined) {
      config.nip = dto.nip ?? null;
    }

    if (dto.autoSendEnabled !== undefined) {
      config.autoSendEnabled = dto.autoSendEnabled;
    }

    // Encrypt sensitive credentials before saving
    if (dto.token !== undefined) {
      config.encryptedToken = dto.token
        ? await this.encryptionService.encrypt(dto.token)
        : null;
    }

    if (dto.certificate !== undefined) {
      config.encryptedCertificate = dto.certificate
        ? await this.encryptionService.encrypt(dto.certificate)
        : null;
    }

    if (dto.certificatePassword !== undefined) {
      config.encryptedCertificatePassword = dto.certificatePassword
        ? await this.encryptionService.encrypt(dto.certificatePassword)
        : null;
    }

    if (dto.privateKey !== undefined) {
      config.encryptedPrivateKey = dto.privateKey
        ? await this.encryptionService.encrypt(dto.privateKey)
        : null;
    }

    // Cross-field guard: the auth method dictates which credentials must be
    // present. Without this, a user can save a XADES config with no cert
    // (or a TOKEN config with no token) and the auth flow only fails much
    // later with a confusing "decryption failed" / 21115 error.
    this.assertCredentialsForAuthMethod(config);

    config = await this.configRepo.save(config);

    // Clear cached mTLS agent so it gets recreated with new credentials
    this.httpClient.clearAgentCache(companyId);

    // Invalidate cached JWT tokens so the next request re-authenticates
    this.authService.clearTokenCache(companyId);

    // Drop any cached MoF public keys for the new environment so the next
    // call hits the live /security/public-key-certificates endpoint. This is
    // important when the env was just changed (DEMO ↔ PROD) — the old cache
    // would otherwise wrap AES keys with the wrong environment's cert.
    this.cryptoService.invalidatePublicKeyCache(config.environment);

    this.logger.log(
      `KSeF config ${config.id ? 'updated' : 'created'} for company ${companyId}`,
    );

    return this.toResponseDto(config);
  }

  async testConnection(user: User): Promise<KsefConnectionTestResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.getConfigOrFail(companyId);

    const startTime = Date.now();

    try {
      await this.httpClient.request({
        environment: config.environment,
        method: 'POST',
        path: KSEF_API_PATHS.AUTH_CHALLENGE,
        data: {},
        companyId,
        userId: user.id,
        auditAction: 'CONNECTION_TEST',
      });

      const responseTimeMs = Date.now() - startTime;

      // Connectivity OK — also pull the MoF public-key certificates so the
      // operator can verify the API is talking to the right environment's
      // cert (a cross-env mismatch is the most common cause of "encryption-
      // looking" failures on demo). Failures here are non-fatal; we just
      // omit the cert info from the response.
      const publicKeyCertificates = await this.fetchCertificateInfoSafely(
        config.environment,
        companyId,
        user.id,
      );

      // Update config with test result
      config.lastConnectionTestAt = new Date();
      config.lastConnectionTestResult = 'SUCCESS';
      config.isActive = true;
      await this.configRepo.save(config);

      return {
        success: true,
        environment: config.environment,
        message: KSEF_MESSAGES.CONNECTION_SUCCESS,
        responseTimeMs,
        testedAt: new Date().toISOString(),
        publicKeyCertificates,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update config with failure result
      config.lastConnectionTestAt = new Date();
      config.lastConnectionTestResult = `FAILURE: ${errorMessage}`;
      config.isActive = false;
      await this.configRepo.save(config);

      return {
        success: false,
        environment: config.environment,
        message: `${KSEF_MESSAGES.CONNECTION_FAILED}: ${errorMessage}`,
        responseTimeMs,
        testedAt: new Date().toISOString(),
      };
    }
  }

  private async fetchCertificateInfoSafely(
    environment: KsefConfiguration['environment'],
    companyId: string,
    userId: string,
  ): Promise<KsefPublicKeyCertificateInfoDto[] | undefined> {
    const usages: Array<'KsefTokenEncryption' | 'SymmetricKeyEncryption'> = [
      'KsefTokenEncryption',
      'SymmetricKeyEncryption',
    ];
    const results: KsefPublicKeyCertificateInfoDto[] = [];

    for (const usage of usages) {
      try {
        const info = await this.cryptoService.describePublicKeyCertificate(
          environment,
          companyId,
          userId,
          usage,
        );
        results.push({
          subject: info.subject,
          issuer: info.issuer,
          validFrom: info.validFrom.toISOString(),
          validTo: info.validTo.toISOString(),
          usage,
        });
      } catch (error) {
        this.logger.warn(
          `Could not describe ${usage} certificate for env ${environment}: ${(error as Error).message}`,
        );
      }
    }

    return results.length > 0 ? results : undefined;
  }

  async uploadCredentialFiles(
    user: User,
    certPem?: string,
    keyPem?: string,
    certificatePassword?: string,
  ): Promise<KsefConfigResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.getConfigOrFail(companyId);

    if (certPem) {
      try {
        new crypto.X509Certificate(certPem);
      } catch {
        throw new BadRequestException('Nieprawidłowy certyfikat X.509');
      }
      config.encryptedCertificate = await this.encryptionService.encrypt(certPem);
    }

    if (keyPem) {
      try {
        crypto.createPrivateKey({
          key: keyPem,
          ...(certificatePassword ? { passphrase: certificatePassword } : {}),
        });
      } catch {
        throw new BadRequestException(
          certificatePassword
            ? 'Nieprawidłowy klucz prywatny lub hasło'
            : 'Nieprawidłowy klucz prywatny',
        );
      }
      config.encryptedPrivateKey = await this.encryptionService.encrypt(keyPem);
    }

    if (certificatePassword !== undefined) {
      config.encryptedCertificatePassword = certificatePassword
        ? await this.encryptionService.encrypt(certificatePassword)
        : null;
    }

    config.updatedById = user.id;
    const saved = await this.configRepo.save(config);

    this.httpClient.clearAgentCache(companyId);
    this.authService.clearTokenCache(companyId);

    this.logger.log(`KSeF credentials uploaded for company ${companyId}`);
    return this.toResponseDto(saved);
  }

  async deleteConfig(user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.getConfigOrFail(companyId);
    await this.configRepo.remove(config);
    this.authService.clearTokenCache(companyId);
    this.logger.log(`KSeF config deleted for company ${companyId}`);
  }

  /**
   * Validate that the credentials matching the chosen auth method are present
   * (after applying any DTO updates).
   *
   * - XADES needs the user's X.509 cert + the encrypted PKCS#8 private key
   *   + the passphrase that decrypts that key. KSeF-issued `.key` files are
   *   always passphrase-protected, so the passphrase is mandatory in
   *   practice — we surface a clear Polish message rather than waiting for
   *   the auth flow to fail with a 21115 the user can't decode.
   * - TOKEN needs the encrypted KSeF API token.
   *
   * If the user provided a DTO that left the configuration in an
   * incomplete state, fail BEFORE persisting so partial states never reach
   * the DB.
   */
  private assertCredentialsForAuthMethod(config: KsefConfiguration): void {
    if (config.authMethod === KsefAuthMethod.XADES) {
      const missing: string[] = [];
      if (!config.encryptedCertificate) missing.push('certyfikat (PEM)');
      if (!config.encryptedPrivateKey) missing.push('klucz prywatny (PEM)');
      if (!config.encryptedCertificatePassword) missing.push('hasło certyfikatu');
      if (missing.length > 0) {
        throw new BadRequestException(
          `Konfiguracja XAdES wymaga uzupełnienia pól: ${missing.join(', ')}.`,
        );
      }
      return;
    }

    if (config.authMethod === KsefAuthMethod.TOKEN) {
      if (!config.encryptedToken) {
        throw new BadRequestException(
          'Konfiguracja uwierzytelniania tokenem wymaga uzupełnienia pola "Token KSeF".',
        );
      }
    }
  }

  toResponseDto(config: KsefConfiguration): KsefConfigResponseDto {
    const dto = new KsefConfigResponseDto();
    dto.id = config.id;
    dto.companyId = config.companyId;
    dto.environment = config.environment;
    dto.authMethod = config.authMethod;
    dto.hasToken = !!config.encryptedToken;
    dto.hasCertificate = !!config.encryptedCertificate;
    dto.hasPrivateKey = !!config.encryptedPrivateKey;
    dto.nip = config.nip ?? undefined;
    dto.autoSendEnabled = config.autoSendEnabled;
    dto.isActive = config.isActive;
    dto.lastConnectionTestAt = config.lastConnectionTestAt?.toISOString() ?? undefined;
    dto.lastConnectionTestResult = config.lastConnectionTestResult ?? undefined;
    dto.createdAt = config.createdAt.toISOString();
    dto.updatedAt = config.updatedAt.toISOString();
    return dto;
  }
}
