import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
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
} from '@accounting/common';
import { EmailService } from '@accounting/infrastructure/email';
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
    private readonly emailService: EmailService,
    private readonly changeLogService: ChangeLogService,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  private readonly templatesDir = path.join(
    process.cwd(),
    'libs',
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
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    return this.changeLogService.getCompanyChangeLogs('Client', user.companyId);
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
        `No active email configuration for company ${client.companyId}. Skipping notifications.`,
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
      await this.emailService.sendClientUpdatedNotification(
        recipients.map((r) => r.email),
        {
          name: client.name,
          companyName: company?.name || 'Nieznana firma',
          updatedByName: `${performedBy.firstName} ${performedBy.lastName}`,
          changes: formattedChanges,
        },
      );
    } catch (error) {
      this.logger.error('Failed to send client updated notification', error);
    }
  }

  async notifyClientDeleted(client: Client, performedBy: User): Promise<void> {
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
      await this.emailService.sendClientDeletedNotification(
        recipients.map((r) => r.email),
        {
          name: client.name,
          nip: client.nip,
          companyName: company?.name || 'Nieznana firma',
          deletedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        },
      );
    } catch (error) {
      this.logger.error('Failed to send client deleted notification', error);
    }
  }

  private async getNotificationRecipients(
    companyId: string,
    notificationType: 'receiveOnCreate' | 'receiveOnUpdate' | 'receiveOnDelete',
    excludeUserId?: string,
  ): Promise<User[]> {
    // Get all notification settings for this module and notification type
    const settings = await this.notificationSettingsRepository.find({
      where: {
        moduleSlug: this.moduleSlug,
        [notificationType]: true,
      },
    });

    if (settings.length === 0) {
      return [];
    }

    const userIds = settings.map((s) => s.userId);

    // Get users from the same company
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

    // Handle Date strings
    if (
      typeof oldValue === 'string' &&
      typeof newValue === 'string' &&
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

      this.logger.log(`Welcome email sent to client ${client.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to client: ${error.message}`,
        error.stack,
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
        `Notifications sent to ${recipients.length} users for new client`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client created notifications: ${error.message}`,
        error.stack,
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
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to compile template: ${templateName}`, error);
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
