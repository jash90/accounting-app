import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Client,
  User,
  NotificationSettings,
  ChangeLog,
  Company,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  EmploymentTypeLabels,
  AmlGroupLabels,
  PaginationQueryDto,
  PaginatedResponseDto,
} from '@accounting/common';
import { ChangeLogService, ChangeDetail } from '@accounting/infrastructure/change-log';
import {
  EmailConfigurationService,
  EmailSenderService,
  SmtpConfig,
} from '@accounting/email';

@Injectable()
export class ClientChangelogService {
  private readonly logger = new Logger(ClientChangelogService.name);
  private readonly moduleSlug = 'clients';

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly notificationSettingsRepository: Repository<NotificationSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly changeLogService: ChangeLogService,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  // Use __dirname for reliable path resolution in containers and monorepos
  private readonly templatesDir = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'infrastructure',
    'email',
    'src',
    'lib',
    'templates',
  );

  async getClientChangelog(
    clientId: string,
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    return this.changeLogService.getChangeLogs('Client', clientId);
  }

  async getCompanyChangelog(
    user: User,
    pagination?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ChangeLog>> {
    const { page = 1, limit = 50 } = pagination || {};
    const skip = (page - 1) * limit;

    const { logs, total } = await this.changeLogService.getCompanyChangeLogs(
      'Client',
      user.companyId!,
      { limit, offset: skip },
    );

    return new PaginatedResponseDto(logs, total, page, limit);
  }

  async notifyClientCreated(client: Client, performedBy: User): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id: client.companyId },
    });

    // Get company's SMTP configuration
    const smtpConfig =
      await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
        client.companyId,
      );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping create notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'create',
        },
      );
      return;
    }

    // 1. Send welcome email to client (if receiveEmailCopy is true and has email)
    if (client.email && client.receiveEmailCopy) {
      await this.sendWelcomeEmailToClient(client, company, smtpConfig);
    }

    // 2. Send notifications to company users using company SMTP
    await this.notifyCompanyUsersWithCompanySmtp(
      client,
      company,
      performedBy,
      smtpConfig,
    );
  }

  async notifyClientUpdated(
    client: Client,
    oldValues: Record<string, unknown>,
    performedBy: User,
  ): Promise<void> {
    // Check for SMTP configuration first
    const smtpConfig =
      await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
        client.companyId,
      );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping update notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'update',
        },
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(
      client.companyId,
      'receiveOnUpdate',
      performedBy.id,
    );

    if (recipients.length === 0) {
      return;
    }

    // Calculate changes
    const changes = this.calculateChanges(oldValues, client);

    if (changes.length === 0) {
      return;
    }

    const company = await this.companyRepository.findOne({
      where: { id: client.companyId },
    });

    const formattedChanges = changes.map((change) =>
      this.changeLogService.formatChange(change),
    );

    try {
      const html = await this.compileTemplate('client-updated', {
        clientName: client.name,
        companyName: company?.name || 'Nieznana firma',
        updatedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        changes: formattedChanges,
        updatedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Klient zaktualizowany: ${client.name}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log(
        `Update notifications sent to users for client`,
        {
          companyId: client.companyId,
          clientId: client.id,
          recipientCount: recipients.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client updated notification`,
        {
          companyId: client.companyId,
          clientId: client.id,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );
    }
  }

  async notifyClientDeleted(client: Client, performedBy: User): Promise<void> {
    // Check for SMTP configuration first
    const smtpConfig =
      await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
        client.companyId,
      );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping delete notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'delete',
        },
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(
      client.companyId,
      'receiveOnDelete',
      performedBy.id,
    );

    if (recipients.length === 0) {
      return;
    }

    const company = await this.companyRepository.findOne({
      where: { id: client.companyId },
    });

    try {
      const html = await this.compileTemplate('client-deleted', {
        clientName: client.name,
        clientNip: client.nip || 'Nie podano',
        companyName: company?.name || 'Nieznana firma',
        deletedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        deletedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Klient usunięty: ${client.name}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log(
        `Delete notifications sent to users for client`,
        {
          companyId: client.companyId,
          clientId: client.id,
          recipientCount: recipients.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client deleted notification`,
        {
          companyId: client.companyId,
          clientId: client.id,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );
    }
  }

  private async getNotificationRecipients(
    companyId: string,
    notificationType: 'receiveOnCreate' | 'receiveOnUpdate' | 'receiveOnDelete',
    excludeUserId?: string,
  ): Promise<User[]> {
    // Get notification settings for this module, company, and notification type
    // companyId filter ensures multi-tenant isolation
    const settings = await this.notificationSettingsRepository.find({
      where: {
        companyId,
        moduleSlug: this.moduleSlug,
        [notificationType]: true,
      },
    });

    if (settings.length === 0) {
      return [];
    }

    const userIds = settings.map((s) => s.userId);

    // Get users from the same company with active status
    const users = await this.userRepository.find({
      where: {
        id: In(userIds),
        companyId,
        isActive: true,
      },
    });

    // Exclude the user who performed the action (they don't need notification)
    return users.filter((u) => u.id !== excludeUserId);
  }

  private calculateChanges(
    oldValues: Record<string, unknown>,
    newEntity: Client,
  ): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    const fieldsToCompare = [
      'name',
      'nip',
      'email',
      'phone',
      'companyStartDate',
      'cooperationStartDate',
      'suspensionDate',
      'companySpecificity',
      'additionalInfo',
      'gtuCode',
      'gtuCodes',
      'amlGroup',
      'amlGroupEnum',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
      'receiveEmailCopy',
      'isActive',
    ];

    for (const field of fieldsToCompare) {
      const oldValue = oldValues[field];
      const newValue = (newEntity as unknown as Record<string, unknown>)[field];

      if (this.hasChanged(oldValue, newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }

  private hasChanged(oldValue: unknown, newValue: unknown): boolean {
    // Handle Date comparison
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }

    // Handle null/undefined
    if (oldValue == null && newValue == null) {
      return false;
    }

    // Handle Date strings - only accept ISO-8601 format to avoid false positives
    // Pattern matches: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS (with optional timezone/ms)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    if (
      typeof oldValue === 'string' &&
      typeof newValue === 'string' &&
      isoDatePattern.test(oldValue) &&
      isoDatePattern.test(newValue) &&
      !isNaN(Date.parse(oldValue)) &&
      !isNaN(Date.parse(newValue))
    ) {
      return new Date(oldValue).getTime() !== new Date(newValue).getTime();
    }

    return oldValue !== newValue;
  }

  /**
   * Send welcome email to client with all their data
   */
  private async sendWelcomeEmailToClient(
    client: Client,
    company: Company | null,
    smtpConfig: SmtpConfig,
  ): Promise<void> {
    try {
      const html = await this.compileClientWelcomeTemplate(client, company);

      await this.emailSenderService.sendEmail(smtpConfig, {
        to: client.email!,
        subject: `Potwierdzenie rejestracji - ${company?.name || 'Biuro rachunkowe'}`,
        html,
      });

      this.logger.log(
        `Welcome email sent to client`,
        {
          companyId: client.companyId,
          clientId: client.id,
          clientEmail: client.email,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to client`,
        {
          companyId: client.companyId,
          clientId: client.id,
          clientEmail: client.email,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );
    }
  }

  /**
   * Send notifications to company users using company SMTP
   */
  private async notifyCompanyUsersWithCompanySmtp(
    client: Client,
    company: Company | null,
    performedBy: User,
    smtpConfig: SmtpConfig,
  ): Promise<void> {
    const recipients = await this.getNotificationRecipients(
      client.companyId,
      'receiveOnCreate',
      performedBy.id,
    );

    if (recipients.length === 0) {
      return;
    }

    try {
      const html = await this.compileTemplate('client-created', {
        clientName: client.name,
        clientNip: client.nip || 'Nie podano',
        companyName: company?.name || 'Nieznana firma',
        createdByName: `${performedBy.firstName} ${performedBy.lastName}`,
        createdAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Nowy klient dodany: ${client.name}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log(
        `Create notifications sent to users for new client`,
        {
          companyId: client.companyId,
          clientId: client.id,
          recipientCount: recipients.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client created notifications`,
        {
          companyId: client.companyId,
          clientId: client.id,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );
    }
  }

  /**
   * Compile client welcome template with all data
   */
  private async compileClientWelcomeTemplate(
    client: Client,
    company: Company | null,
  ): Promise<string> {
    const context = {
      companyName: company?.name || 'Biuro rachunkowe',
      clientName: client.name,
      clientNip: client.nip,
      clientEmail: client.email,
      clientPhone: client.phone,
      companyStartDate: this.formatDatePolish(client.companyStartDate),
      cooperationStartDate: this.formatDatePolish(client.cooperationStartDate),
      suspensionDate: this.formatDatePolish(client.suspensionDate),
      vatStatusLabel: client.vatStatus
        ? VatStatusLabels[client.vatStatus]
        : null,
      taxSchemeLabel: client.taxScheme
        ? TaxSchemeLabels[client.taxScheme]
        : null,
      zusStatusLabel: client.zusStatus
        ? ZusStatusLabels[client.zusStatus]
        : null,
      employmentTypeLabel: client.employmentType
        ? EmploymentTypeLabels[client.employmentType]
        : null,
      amlGroupLabel: client.amlGroupEnum ? AmlGroupLabels[client.amlGroupEnum] : null,
      gtuCodes: client.gtuCodes?.join(', '),
      companySpecificity: client.companySpecificity,
      additionalInfo: client.additionalInfo,
      createdAt: new Date().toLocaleString('pl-PL'),
    };

    return this.compileTemplate('client-welcome', context);
  }

  /**
   * Compile a Handlebars template with context
   */
  private async compileTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(
        `Failed to compile template`,
        {
          templateName,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );
      throw error;
    }
  }

  /**
   * Format date to Polish locale string
   */
  private formatDatePolish(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
