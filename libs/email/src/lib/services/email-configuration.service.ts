import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfiguration, EncryptionService } from '@accounting/common';
import { CreateEmailConfigDto } from '../dto/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dto/update-email-config.dto';
import { EmailConfigResponseDto } from '../dto/email-config-response.dto';
import { EmailSenderService } from './email-sender.service';
import { EmailReaderService } from './email-reader.service';
import { SmtpConfig, ImapConfig } from '../interfaces/email-config.interface';

/**
 * Service for managing email configurations for users and companies
 * Handles encryption/decryption of passwords and configuration persistence
 */
@Injectable()
export class EmailConfigurationService {
  private readonly logger = new Logger(EmailConfigurationService.name);

  constructor(
    @InjectRepository(EmailConfiguration)
    private readonly emailConfigRepo: Repository<EmailConfiguration>,
    private readonly encryptionService: EncryptionService,
    private readonly emailSenderService: EmailSenderService,
    private readonly emailReaderService: EmailReaderService,
  ) {}

  /**
   * Create email configuration for a user
   */
  async createUserConfig(
    userId: string,
    dto: CreateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    // Check if user already has a configuration
    const existing = await this.emailConfigRepo.findOne({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException(
        'User already has an email configuration. Use update instead.',
      );
    }

    // Verify connection before saving
    await this.verifyConfiguration(dto);

    // Create configuration with encrypted passwords
    const config = this.emailConfigRepo.create({
      userId,
      companyId: null,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      smtpUser: dto.smtpUser,
      smtpPassword: this.encryptionService.encrypt(dto.smtpPassword),
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls,
      imapUser: dto.imapUser,
      imapPassword: this.encryptionService.encrypt(dto.imapPassword),
      displayName: dto.displayName,
      isActive: true,
    });

    const saved = await this.emailConfigRepo.save(config);
    this.logger.log(`Created email configuration for user ${userId}`);

    return EmailConfigResponseDto.fromEntity(saved);
  }

  /**
   * Create email configuration for a company
   */
  async createCompanyConfig(
    companyId: string,
    dto: CreateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    // Check if company already has a configuration
    const existing = await this.emailConfigRepo.findOne({
      where: { companyId },
    });

    if (existing) {
      throw new ConflictException(
        'Company already has an email configuration. Use update instead.',
      );
    }

    // Verify connection before saving
    await this.verifyConfiguration(dto);

    // Create configuration with encrypted passwords
    const config = this.emailConfigRepo.create({
      userId: null,
      companyId,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      smtpUser: dto.smtpUser,
      smtpPassword: this.encryptionService.encrypt(dto.smtpPassword),
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls,
      imapUser: dto.imapUser,
      imapPassword: this.encryptionService.encrypt(dto.imapPassword),
      displayName: dto.displayName,
      isActive: true,
    });

    const saved = await this.emailConfigRepo.save(config);
    this.logger.log(`Created email configuration for company ${companyId}`);

    return EmailConfigResponseDto.fromEntity(saved);
  }

  /**
   * Get user's email configuration
   */
  async getUserConfig(userId: string): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepo.findOne({
      where: { userId },
    });

    if (!config) {
      throw new NotFoundException(
        'User does not have an email configuration',
      );
    }

    return EmailConfigResponseDto.fromEntity(config);
  }

  /**
   * Get company's email configuration
   */
  async getCompanyConfig(companyId: string): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepo.findOne({
      where: { companyId },
    });

    if (!config) {
      throw new NotFoundException(
        'Company does not have an email configuration',
      );
    }

    return EmailConfigResponseDto.fromEntity(config);
  }

  /**
   * Get decrypted SMTP config for sending emails
   * For internal use only - does not expose via API
   */
  async getDecryptedSmtpConfig(configId: string): Promise<SmtpConfig> {
    const config = await this.emailConfigRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException('Email configuration not found');
    }

    return {
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: this.encryptionService.decrypt(config.smtpPassword),
      },
    };
  }

  /**
   * Get decrypted IMAP config for reading emails
   * For internal use only - does not expose via API
   */
  async getDecryptedImapConfig(configId: string): Promise<ImapConfig> {
    const config = await this.emailConfigRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException('Email configuration not found');
    }

    return {
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      user: config.imapUser,
      password: this.encryptionService.decrypt(config.imapPassword),
      tlsOptions: {
        rejectUnauthorized: false,
      },
    };
  }

  /**
   * Update user's email configuration
   */
  async updateUserConfig(
    userId: string,
    dto: UpdateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepo.findOne({
      where: { userId },
    });

    if (!config) {
      throw new NotFoundException(
        'User does not have an email configuration',
      );
    }

    // Verify connection if credentials changed
    if (this.hasCredentialChanges(dto)) {
      const mergedDto = this.mergeWithExisting(config, dto);
      await this.verifyConfiguration(mergedDto);
    }

    // Update fields
    if (dto.smtpHost !== undefined) config.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) config.smtpPort = dto.smtpPort;
    if (dto.smtpSecure !== undefined) config.smtpSecure = dto.smtpSecure;
    if (dto.smtpUser !== undefined) config.smtpUser = dto.smtpUser;
    if (dto.smtpPassword !== undefined) {
      config.smtpPassword = this.encryptionService.encrypt(dto.smtpPassword);
    }
    if (dto.imapHost !== undefined) config.imapHost = dto.imapHost;
    if (dto.imapPort !== undefined) config.imapPort = dto.imapPort;
    if (dto.imapTls !== undefined) config.imapTls = dto.imapTls;
    if (dto.imapUser !== undefined) config.imapUser = dto.imapUser;
    if (dto.imapPassword !== undefined) {
      config.imapPassword = this.encryptionService.encrypt(dto.imapPassword);
    }
    if (dto.displayName !== undefined) config.displayName = dto.displayName;

    const updated = await this.emailConfigRepo.save(config);
    this.logger.log(`Updated email configuration for user ${userId}`);

    return EmailConfigResponseDto.fromEntity(updated);
  }

  /**
   * Update company's email configuration
   */
  async updateCompanyConfig(
    companyId: string,
    dto: UpdateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepo.findOne({
      where: { companyId },
    });

    if (!config) {
      throw new NotFoundException(
        'Company does not have an email configuration',
      );
    }

    // Verify connection if credentials changed
    if (this.hasCredentialChanges(dto)) {
      const mergedDto = this.mergeWithExisting(config, dto);
      await this.verifyConfiguration(mergedDto);
    }

    // Update fields
    if (dto.smtpHost !== undefined) config.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) config.smtpPort = dto.smtpPort;
    if (dto.smtpSecure !== undefined) config.smtpSecure = dto.smtpSecure;
    if (dto.smtpUser !== undefined) config.smtpUser = dto.smtpUser;
    if (dto.smtpPassword !== undefined) {
      config.smtpPassword = this.encryptionService.encrypt(dto.smtpPassword);
    }
    if (dto.imapHost !== undefined) config.imapHost = dto.imapHost;
    if (dto.imapPort !== undefined) config.imapPort = dto.imapPort;
    if (dto.imapTls !== undefined) config.imapTls = dto.imapTls;
    if (dto.imapUser !== undefined) config.imapUser = dto.imapUser;
    if (dto.imapPassword !== undefined) {
      config.imapPassword = this.encryptionService.encrypt(dto.imapPassword);
    }
    if (dto.displayName !== undefined) config.displayName = dto.displayName;

    const updated = await this.emailConfigRepo.save(config);
    this.logger.log(`Updated email configuration for company ${companyId}`);

    return EmailConfigResponseDto.fromEntity(updated);
  }

  /**
   * Delete user's email configuration
   */
  async deleteUserConfig(userId: string): Promise<void> {
    const config = await this.emailConfigRepo.findOne({
      where: { userId },
    });

    if (!config) {
      throw new NotFoundException(
        'User does not have an email configuration',
      );
    }

    await this.emailConfigRepo.remove(config);
    this.logger.log(`Deleted email configuration for user ${userId}`);
  }

  /**
   * Delete company's email configuration
   */
  async deleteCompanyConfig(companyId: string): Promise<void> {
    const config = await this.emailConfigRepo.findOne({
      where: { companyId },
    });

    if (!config) {
      throw new NotFoundException(
        'Company does not have an email configuration',
      );
    }

    await this.emailConfigRepo.remove(config);
    this.logger.log(`Deleted email configuration for company ${companyId}`);
  }

  /**
   * Verify SMTP connection
   * Throws error if connection fails
   */
  private async verifyConfiguration(dto: CreateEmailConfigDto | UpdateEmailConfigDto): Promise<void> {
    const smtpConfig: SmtpConfig = {
      host: dto.smtpHost!,
      port: dto.smtpPort!,
      secure: dto.smtpSecure!,
      auth: {
        user: dto.smtpUser!,
        pass: dto.smtpPassword!,
      },
    };

    const isValid = await this.emailSenderService.verifyConnection(smtpConfig);

    if (!isValid) {
      throw new BadRequestException(
        'Failed to verify SMTP connection. Please check your credentials.',
      );
    }

    this.logger.debug('SMTP connection verified successfully');
  }

  /**
   * Check if DTO contains credential changes
   */
  private hasCredentialChanges(dto: UpdateEmailConfigDto): boolean {
    return !!(
      dto.smtpHost ||
      dto.smtpPort ||
      dto.smtpUser ||
      dto.smtpPassword ||
      dto.imapHost ||
      dto.imapPort ||
      dto.imapUser ||
      dto.imapPassword
    );
  }

  /**
   * Merge update DTO with existing configuration for validation
   */
  private mergeWithExisting(
    config: EmailConfiguration,
    dto: UpdateEmailConfigDto,
  ): CreateEmailConfigDto {
    return {
      smtpHost: dto.smtpHost ?? config.smtpHost,
      smtpPort: dto.smtpPort ?? config.smtpPort,
      smtpSecure: dto.smtpSecure ?? config.smtpSecure,
      smtpUser: dto.smtpUser ?? config.smtpUser,
      smtpPassword: dto.smtpPassword ?? this.encryptionService.decrypt(config.smtpPassword),
      imapHost: dto.imapHost ?? config.imapHost,
      imapPort: dto.imapPort ?? config.imapPort,
      imapTls: dto.imapTls ?? config.imapTls,
      imapUser: dto.imapUser ?? config.imapUser,
      imapPassword: dto.imapPassword ?? this.encryptionService.decrypt(config.imapPassword),
      displayName: dto.displayName ?? config.displayName,
    };
  }
}
