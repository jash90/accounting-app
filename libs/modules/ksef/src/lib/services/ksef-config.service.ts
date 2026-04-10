import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KsefConfiguration, User } from '@accounting/common';
import { EncryptionService, SystemCompanyService } from '@accounting/common/backend';

import { KsefConfigResponseDto, KsefConnectionTestResultDto, UpsertKsefConfigDto } from '../dto';
import { KSEF_API_PATHS, KSEF_MESSAGES } from '../constants';
import { KsefConfigurationNotFoundException } from '../exceptions';
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

    config.environment = dto.environment;
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

    config = await this.configRepo.save(config);

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
        method: 'GET',
        path: KSEF_API_PATHS.AUTH_CHALLENGE,
        companyId,
        userId: user.id,
        auditAction: 'CONNECTION_TEST',
      });

      const responseTimeMs = Date.now() - startTime;

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

  async deleteConfig(user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.getConfigOrFail(companyId);
    await this.configRepo.remove(config);
    this.logger.log(`KSeF config deleted for company ${companyId}`);
  }

  toResponseDto(config: KsefConfiguration): KsefConfigResponseDto {
    const dto = new KsefConfigResponseDto();
    dto.id = config.id;
    dto.companyId = config.companyId;
    dto.environment = config.environment;
    dto.authMethod = config.authMethod;
    dto.hasToken = !!config.encryptedToken;
    dto.hasCertificate = !!config.encryptedCertificate;
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
