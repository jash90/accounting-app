
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { Repository } from 'typeorm';

import {
  AmlGroupLabels,
  Client,
  Company,
  EmploymentTypeLabels,
  NotificationSettings,
  TaxSchemeLabels,
  User,
  VatStatusLabels,
  ZusStatusLabels,
} from '@accounting/common';
import {
  EmailConfigurationService,
  EmailSenderService,
  ImapConfig,
  SmtpConfig,
} from '@accounting/email';
import { ChangeDetail, ChangeLogService } from '@accounting/infrastructure/change-log';

@Injectable()
export class ClientChangelogEmailService {
  private readonly logger = new Logger(ClientChangelogEmailService.name);
  private readonly moduleSlug = 'clients';

  // Use process.cwd() for reliable path resolution in webpack bundles
  private readonly templatesDir = path.resolve(
    process.cwd(),
    'libs',
    'infrastructure',
    'email',
    'src',
    'lib',
    'templates'
  );

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
    private readonly configService: ConfigService
  ) {}

  async notifyClientCreated(client: Client, performedBy: User): Promise<void> {
    if (this.configService.get<string>('ENABLE_EMAIL_DEBUG') === 'true') {
      this.logger.debug('Client created notification triggered', {
        clientId: client.id,
        clientEmail: client.email ? `***@${client.email.split('@')[1]}` : null,
        receiveEmailCopy: client.receiveEmailCopy,
        companyId: client.companyId,
        performedBy: performedBy.id,
      });
    }

    const company = await this.companyRepository.findOne({
      where: { id: client.companyId },
    });

    if (this.configService.get<string>('ENABLE_EMAIL_DEBUG') === 'true') {
      this.logger.debug('Company retrieved for email notification', {
        companyId: client.companyId,
        companyName: company?.name,
      });
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
      client.companyId
    );

    if (!emailConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping create notifications.`,
        { companyId: client.companyId, clientId: client.id, notificationType: 'create' }
      );
      return;
    }

    if (this.configService.get<string>('ENABLE_EMAIL_DEBUG') === 'true') {
      this.logger.debug('Email configuration retrieved', {
        companyId: client.companyId,
        smtpHost: emailConfig.smtp.host,
        smtpUser: emailConfig.smtp.auth.user,
        imapHost: emailConfig.imap.host,
      });
    }

    if (client.email && client.receiveEmailCopy) {
      await this.sendWelcomeEmailToClient(client, company, emailConfig.smtp, emailConfig.imap);
    }

    await this.notifyCompanyUsersWithCompanySmtp(
      client,
      company,
      performedBy,
      emailConfig.smtp,
      emailConfig.imap
    );
  }

  async notifyClientUpdated(
    client: Client,
    oldValues: Record<string, unknown>,
    performedBy: User
  ): Promise<void> {
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      client.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping update notifications.`,
        { companyId: client.companyId, clientId: client.id, notificationType: 'update' }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnUpdate');
    if (recipients.length === 0) return;

    const changes = this.calculateChanges(oldValues, client);
    if (changes.length === 0) return;

    const company = await this.companyRepository.findOne({ where: { id: client.companyId } });
    const formattedChanges = changes.map((change) => this.changeLogService.formatChange(change));

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
      this.logger.log(`Update notifications sent to users for client`, {
        companyId: client.companyId,
        clientId: client.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error(`Failed to send client updated notification`, {
        companyId: client.companyId,
        clientId: client.id,
        error: (error as Error).message,
      });
    }
  }

  async notifyClientDeleted(client: Client, performedBy: User): Promise<void> {
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      client.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping delete notifications.`,
        { companyId: client.companyId, clientId: client.id, notificationType: 'delete' }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnDelete');
    if (recipients.length === 0) return;

    const company = await this.companyRepository.findOne({ where: { id: client.companyId } });

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
      this.logger.log(`Delete notifications sent`, {
        companyId: client.companyId,
        clientId: client.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error(`Failed to send client deleted notification`, {
        companyId: client.companyId,
        clientId: client.id,
        error: (error as Error).message,
      });
    }
  }

  async notifyBulkClientsDeleted(clients: Client[], performedBy: User): Promise<void> {
    if (clients.length === 0) return;

    const companyId = clients[0].companyId;
    const invalidClient = clients.find((c) => c.companyId !== companyId);
    if (invalidClient) {
      throw new ForbiddenException(
        `Multi-tenant violation: Client ${invalidClient.id} belongs to company ${invalidClient.companyId}, expected ${companyId}`
      );
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(companyId);
    if (!smtpConfig) {
      this.logger.warn(`No active email config for company. Skipping bulk delete notifications.`, {
        companyId,
        clientCount: clients.length,
      });
      return;
    }

    const recipients = await this.getNotificationRecipients(companyId, 'receiveOnDelete');
    if (recipients.length === 0) return;

    const company = await this.companyRepository.findOne({ where: { id: companyId } });

    try {
      const html = await this.compileTemplate('clients-bulk-deleted', {
        clients: clients.map((c) => ({ name: c.name, nip: c.nip || 'Nie podano' })),
        clientCount: clients.length,
        companyName: company?.name || 'Nieznana firma',
        deletedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        deletedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((r) => ({
        to: r.email,
        subject: `Usunięto ${clients.length} klientów`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
    } catch (error) {
      this.logger.error(`Failed to send bulk delete notification`, {
        companyId,
        error: (error as Error).message,
      });
    }
  }

  async notifyBulkClientsUpdated(
    updates: Array<{ client: Client; oldValues: Record<string, unknown> }>,
    performedBy: User
  ): Promise<void> {
    if (updates.length === 0) return;

    const companyId = updates[0].client.companyId;
    const invalidUpdate = updates.find((u) => u.client.companyId !== companyId);
    if (invalidUpdate) {
      throw new ForbiddenException(
        `Multi-tenant violation: Client ${invalidUpdate.client.id} belongs to company ${invalidUpdate.client.companyId}, expected ${companyId}`
      );
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(companyId);
    if (!smtpConfig) {
      this.logger.warn(`No active email config for company. Skipping bulk update notifications.`, {
        companyId,
        clientCount: updates.length,
      });
      return;
    }

    const recipients = await this.getNotificationRecipients(companyId, 'receiveOnUpdate');
    if (recipients.length === 0) return;

    const clientsWithChanges = updates
      .map(({ client, oldValues }) => {
        const changes = this.calculateChanges(oldValues, client);
        if (changes.length === 0) return null;
        return {
          name: client.name,
          changes: changes.map((change) => this.changeLogService.formatChange(change)),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (clientsWithChanges.length === 0) return;

    const company = await this.companyRepository.findOne({ where: { id: companyId } });

    try {
      const html = await this.compileTemplate('clients-bulk-updated', {
        clients: clientsWithChanges,
        clientCount: clientsWithChanges.length,
        companyName: company?.name || 'Nieznana firma',
        updatedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        updatedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((r) => ({
        to: r.email,
        subject: `Zaktualizowano ${clientsWithChanges.length} klientów`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
    } catch (error) {
      this.logger.error(`Failed to send bulk update notification`, {
        companyId,
        error: (error as Error).message,
      });
    }
  }

  // ==================== Private Helpers ====================

  async getNotificationRecipients(
    companyId: string,
    notificationType: 'receiveOnCreate' | 'receiveOnUpdate' | 'receiveOnDelete',
    excludeUserId?: string
  ): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoin(
        NotificationSettings,
        'settings',
        'settings.userId = user.id AND settings.companyId = :companyId AND settings.moduleSlug = :moduleSlug',
        { companyId, moduleSlug: this.moduleSlug }
      )
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (excludeUserId) {
      queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    queryBuilder.andWhere(`(settings.id IS NULL OR settings.${notificationType} = :enabled)`, {
      enabled: true,
    });

    return queryBuilder.getMany();
  }

  calculateChanges(oldValues: Record<string, unknown>, newEntity: Client): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    const fieldsToCompare = [
      'name',
      'nip',
      'email',
      'phone',
      'companyStartDate',
      'cooperationStartDate',
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
        changes.push({ field, oldValue, newValue });
      }
    }

    return changes;
  }

  private hasChanged(oldValue: unknown, newValue: unknown): boolean {
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }
    if (oldValue == null && newValue == null) return false;

    const isIsoDateString = (val: string): boolean => {
      if (val.length < 10) return false;
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      return datePattern.test(val) || dateTimePattern.test(val);
    };
    if (
      typeof oldValue === 'string' &&
      typeof newValue === 'string' &&
      isIsoDateString(oldValue) &&
      isIsoDateString(newValue) &&
      !isNaN(Date.parse(oldValue)) &&
      !isNaN(Date.parse(newValue))
    ) {
      return new Date(oldValue).getTime() !== new Date(newValue).getTime();
    }

    return oldValue !== newValue;
  }

  private async sendWelcomeEmailToClient(
    client: Client,
    company: Company | null,
    smtpConfig: SmtpConfig,
    imapConfig: ImapConfig
  ): Promise<void> {
    try {
      const html = await this.compileClientWelcomeTemplate(client, company);
      await this.emailSenderService.sendEmailAndSave(smtpConfig, imapConfig, {
        to: client.email!,
        subject: `Potwierdzenie rejestracji - ${company?.name || 'Biuro rachunkowe'}`,
        html,
      });
      this.logger.log(`Welcome email sent to client`, {
        companyId: client.companyId,
        clientId: client.id,
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to client`, {
        companyId: client.companyId,
        clientId: client.id,
        error: (error as Error).message,
      });
    }
  }

  private async notifyCompanyUsersWithCompanySmtp(
    client: Client,
    company: Company | null,
    performedBy: User,
    smtpConfig: SmtpConfig,
    imapConfig: ImapConfig
  ): Promise<void> {
    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnCreate');
    if (recipients.length === 0) return;

    try {
      const html = await this.compileTemplate('client-created', {
        clientName: client.name,
        clientNip: client.nip || 'Nie podano',
        companyName: company?.name || 'Nieznana firma',
        createdByName: `${performedBy.firstName} ${performedBy.lastName}`,
        createdAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((r) => ({
        to: r.email,
        subject: `Nowy klient dodany: ${client.name}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmailsAndSave(smtpConfig, imapConfig, messages);
    } catch (error) {
      this.logger.error(`Failed to send client created notifications`, {
        companyId: client.companyId,
        error: (error as Error).message,
      });
    }
  }

  private compileClientWelcomeTemplate(client: Client, company: Company | null): Promise<string> {
    return this.compileTemplate('client-welcome', {
      companyName: company?.name || 'Biuro rachunkowe',
      clientName: client.name,
      clientNip: client.nip,
      clientEmail: client.email,
      clientPhone: client.phone,
      companyStartDate: this.formatDatePolish(client.companyStartDate),
      cooperationStartDate: this.formatDatePolish(client.cooperationStartDate),
      vatStatusLabel: client.vatStatus ? VatStatusLabels[client.vatStatus] : null,
      taxSchemeLabel: client.taxScheme ? TaxSchemeLabels[client.taxScheme] : null,
      zusStatusLabel: client.zusStatus ? ZusStatusLabels[client.zusStatus] : null,
      employmentTypeLabel: client.employmentType
        ? EmploymentTypeLabels[client.employmentType]
        : null,
      amlGroupLabel: client.amlGroupEnum ? AmlGroupLabels[client.amlGroupEnum] : null,
      gtuCodes: client.gtuCodes?.join(', '),
      companySpecificity: client.companySpecificity,
      additionalInfo: client.additionalInfo,
      createdAt: new Date().toLocaleString('pl-PL'),
    });
  }

  async compileTemplate(templateName: string, context: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to compile template`, {
        templateName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

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
