import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Company, EmailConfiguration } from '@accounting/common';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from '@accounting/email';

import { EncryptionService } from './encryption.service';

@Injectable()
export class EmailConfigService {
  constructor(
    @InjectRepository(EmailConfiguration)
    private emailConfigRepository: Repository<EmailConfiguration>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Get the System Admin company (isSystemCompany: true)
   */
  private async getSystemAdminCompany(): Promise<Company> {
    const systemCompany = await this.companyRepository.findOne({
      where: { isSystemCompany: true },
    });

    if (!systemCompany) {
      throw new NotFoundException('System Admin company not found. Please run migrations.');
    }

    return systemCompany;
  }

  /**
   * Get user's email configuration
   */
  async getUserConfig(userId: string): Promise<EmailConfiguration> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!config) {
      throw new NotFoundException('Email configuration not found');
    }

    return config;
  }

  /**
   * Get company's email configuration
   */
  async getCompanyConfig(companyId: string): Promise<EmailConfiguration> {
    const config = await this.emailConfigRepository.findOne({
      where: { companyId },
      relations: ['company'],
    });

    if (!config) {
      throw new NotFoundException('Company email configuration not found');
    }

    return config;
  }

  /**
   * Create user email configuration
   */
  async createUserConfig(userId: string, dto: CreateEmailConfigDto): Promise<EmailConfiguration> {
    // Check if user already has a configuration
    const existing = await this.emailConfigRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has an email configuration');
    }

    // Encrypt passwords
    const encryptedSmtpPassword = await this.encryptionService.encrypt(dto.smtpPassword);
    const encryptedImapPassword = await this.encryptionService.encrypt(dto.imapPassword);

    const config = this.emailConfigRepository.create({
      userId,
      companyId: null,
      displayName: dto.displayName,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure ?? true,
      smtpUser: dto.smtpUser,
      smtpPassword: encryptedSmtpPassword,
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls ?? true,
      imapUser: dto.imapUser,
      imapPassword: encryptedImapPassword,
      isActive: true,
    });

    return this.emailConfigRepository.save(config);
  }

  /**
   * Create company email configuration
   */
  async createCompanyConfig(
    companyId: string,
    dto: CreateEmailConfigDto
  ): Promise<EmailConfiguration> {
    // Check if company already has a configuration
    const existing = await this.emailConfigRepository.findOne({
      where: { companyId },
    });

    if (existing) {
      throw new ConflictException('Company already has an email configuration');
    }

    // Encrypt passwords
    const encryptedSmtpPassword = await this.encryptionService.encrypt(dto.smtpPassword);
    const encryptedImapPassword = await this.encryptionService.encrypt(dto.imapPassword);

    const config = this.emailConfigRepository.create({
      userId: null,
      companyId,
      displayName: dto.displayName,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure ?? true,
      smtpUser: dto.smtpUser,
      smtpPassword: encryptedSmtpPassword,
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls ?? true,
      imapUser: dto.imapUser,
      imapPassword: encryptedImapPassword,
      isActive: true,
    });

    return this.emailConfigRepository.save(config);
  }

  /**
   * Update user email configuration
   */
  async updateUserConfig(userId: string, dto: UpdateEmailConfigDto): Promise<EmailConfiguration> {
    const config = await this.getUserConfig(userId);

    // Create a copy to avoid mutating the input DTO
    const updateData: Partial<UpdateEmailConfigDto> = { ...dto };

    // Encrypt passwords if provided
    if (updateData.smtpPassword) {
      updateData.smtpPassword = await this.encryptionService.encrypt(updateData.smtpPassword);
    }
    if (updateData.imapPassword) {
      updateData.imapPassword = await this.encryptionService.encrypt(updateData.imapPassword);
    }

    Object.assign(config, updateData);
    return this.emailConfigRepository.save(config);
  }

  /**
   * Update company email configuration
   */
  async updateCompanyConfig(
    companyId: string,
    dto: UpdateEmailConfigDto
  ): Promise<EmailConfiguration> {
    const config = await this.getCompanyConfig(companyId);

    // Create a copy to avoid mutating the input DTO
    const updateData: Partial<UpdateEmailConfigDto> = { ...dto };

    // Encrypt passwords if provided
    if (updateData.smtpPassword) {
      updateData.smtpPassword = await this.encryptionService.encrypt(updateData.smtpPassword);
    }
    if (updateData.imapPassword) {
      updateData.imapPassword = await this.encryptionService.encrypt(updateData.imapPassword);
    }

    Object.assign(config, updateData);
    return this.emailConfigRepository.save(config);
  }

  /**
   * Delete user email configuration
   */
  async deleteUserConfig(userId: string): Promise<void> {
    const config = await this.getUserConfig(userId);
    await this.emailConfigRepository.remove(config);
  }

  /**
   * Delete company email configuration
   */
  async deleteCompanyConfig(companyId: string): Promise<void> {
    const config = await this.getCompanyConfig(companyId);
    await this.emailConfigRepository.remove(config);
  }

  // ========== SYSTEM ADMIN EMAIL CONFIGURATION ==========

  /**
   * Get System Admin email configuration (shared across all admins)
   */
  async getSystemAdminConfig(): Promise<EmailConfiguration> {
    const systemCompany = await this.getSystemAdminCompany();

    const config = await this.emailConfigRepository.findOne({
      where: { companyId: systemCompany.id },
      relations: ['company'],
    });

    if (!config) {
      throw new NotFoundException('System Admin email configuration not found');
    }

    return config;
  }

  /**
   * Create System Admin email configuration
   */
  async createSystemAdminConfig(dto: CreateEmailConfigDto): Promise<EmailConfiguration> {
    const systemCompany = await this.getSystemAdminCompany();

    // Check if System Admin already has a configuration
    const existing = await this.emailConfigRepository.findOne({
      where: { companyId: systemCompany.id },
    });

    if (existing) {
      throw new ConflictException('System Admin already has an email configuration');
    }

    // Encrypt passwords
    const encryptedSmtpPassword = await this.encryptionService.encrypt(dto.smtpPassword);
    const encryptedImapPassword = await this.encryptionService.encrypt(dto.imapPassword);

    const config = this.emailConfigRepository.create({
      userId: null,
      companyId: systemCompany.id,
      displayName: dto.displayName || 'System Admin',
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure ?? true,
      smtpUser: dto.smtpUser,
      smtpPassword: encryptedSmtpPassword,
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls ?? true,
      imapUser: dto.imapUser,
      imapPassword: encryptedImapPassword,
      isActive: true,
    });

    return this.emailConfigRepository.save(config);
  }

  /**
   * Update System Admin email configuration
   */
  async updateSystemAdminConfig(dto: UpdateEmailConfigDto): Promise<EmailConfiguration> {
    const config = await this.getSystemAdminConfig();

    // Create a copy to avoid mutating the input DTO
    const updateData: Partial<UpdateEmailConfigDto> = { ...dto };

    // Encrypt passwords if provided
    if (updateData.smtpPassword) {
      updateData.smtpPassword = await this.encryptionService.encrypt(updateData.smtpPassword);
    }
    if (updateData.imapPassword) {
      updateData.imapPassword = await this.encryptionService.encrypt(updateData.imapPassword);
    }

    Object.assign(config, updateData);
    return this.emailConfigRepository.save(config);
  }

  /**
   * Delete System Admin email configuration
   */
  async deleteSystemAdminConfig(): Promise<void> {
    const config = await this.getSystemAdminConfig();
    await this.emailConfigRepository.remove(config);
  }

  /**
   * Get System Admin company ID (for email service)
   */
  async getSystemAdminCompanyId(): Promise<string> {
    const systemCompany = await this.getSystemAdminCompany();
    return systemCompany.id;
  }
}
