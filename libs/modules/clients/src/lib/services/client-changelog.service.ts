import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { Repository } from 'typeorm';

import {
  AmlGroupLabels,
  ChangeLog,
  Client,
  Company,
  EmploymentTypeLabels,
  NotificationSettings,
  PaginatedResponseDto,
  PaginationQueryDto,
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
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly changeLogService: ChangeLogService,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSenderService: EmailSenderService
  ) {}

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

  async getClientChangelog(
    clientId: string,
    user: User
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    // Validate user has a company for multi-tenant isolation
    if (!user.companyId) {
      throw new ForbiddenException(
        'Access denied: user must belong to a company to view changelog'
      );
    }

    // Verify client belongs to user's company for multi-tenant isolation
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId: user.companyId },
    });

    if (!client) {
      throw new ForbiddenException(
        'Access denied: Client not found or belongs to a different company'
      );
    }

    return this.changeLogService.getChangeLogs('Client', clientId);
  }

  async getCompanyChangelog(
    user: User,
    pagination?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ChangeLog>> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company to view changelog');
    }

    const { page = 1, limit = 50 } = pagination || {};
    const skip = (page - 1) * limit;

    const { logs, total } = await this.changeLogService.getCompanyChangeLogs(
      'Client',
      user.companyId,
      { limit, offset: skip }
    );

    return new PaginatedResponseDto(logs, total, page, limit);
  }

  async notifyClientCreated(client: Client, performedBy: User): Promise<void> {
    // Debug logging for notification trigger
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
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

    // Debug logging for company retrieval
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Company retrieved for email notification', {
        companyId: client.companyId,
        companyName: company?.name,
      });
    }

    // Get company's email configuration (SMTP + IMAP for save to Sent)
    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
      client.companyId
    );

    if (!emailConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping create notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'create',
        }
      );
      return;
    }

    // Debug logging for email config retrieval
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Email configuration retrieved', {
        companyId: client.companyId,
        smtpHost: emailConfig.smtp.host,
        smtpUser: emailConfig.smtp.auth.user,
        imapHost: emailConfig.imap.host,
      });
    }

    // 1. Send welcome email to client (if receiveEmailCopy is true and has email)
    if (client.email && client.receiveEmailCopy) {
      await this.sendWelcomeEmailToClient(client, company, emailConfig.smtp, emailConfig.imap);
    }

    // 2. Send notifications to company users using company SMTP
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
    // Check for SMTP configuration first
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      client.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping update notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'update',
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnUpdate');

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
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  }

  async notifyClientDeleted(client: Client, performedBy: User): Promise<void> {
    // Check for SMTP configuration first
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      client.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping delete notifications.`,
        {
          companyId: client.companyId,
          clientId: client.id,
          notificationType: 'delete',
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnDelete');

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
      this.logger.log(`Delete notifications sent to users for client`, {
        companyId: client.companyId,
        clientId: client.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error(`Failed to send client deleted notification`, {
        companyId: client.companyId,
        clientId: client.id,
        error: (error as Error).message,
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  }

  /**
   * Batch notify about multiple deleted clients in a single operation.
   * Groups all clients into one email per recipient.
   */
  async notifyBulkClientsDeleted(clients: Client[], performedBy: User): Promise<void> {
    if (clients.length === 0) {
      return;
    }

    // All clients should belong to same company (bulk operation constraint)
    const companyId = clients[0].companyId;

    // Validate multi-tenant constraint: all clients must belong to the same company
    const invalidClient = clients.find((c) => c.companyId !== companyId);
    if (invalidClient) {
      throw new ForbiddenException(
        `Multi-tenant violation: Client ${invalidClient.id} belongs to company ${invalidClient.companyId}, expected ${companyId}`
      );
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(companyId);

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping bulk delete notifications.`,
        {
          companyId,
          clientCount: clients.length,
          notificationType: 'bulk_delete',
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(companyId, 'receiveOnDelete');

    if (recipients.length === 0) {
      return;
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    try {
      const html = await this.compileTemplate('clients-bulk-deleted', {
        clients: clients.map((c) => ({ name: c.name, nip: c.nip || 'Nie podano' })),
        clientCount: clients.length,
        companyName: company?.name || 'Nieznana firma',
        deletedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        deletedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Usunięto ${clients.length} klientów`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log(`Bulk delete notifications sent to users`, {
        companyId,
        clientCount: clients.length,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error(`Failed to send bulk client deleted notification`, {
        companyId,
        clientCount: clients.length,
        error: (error as Error).message,
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  }

  /**
   * Batch notify about multiple updated clients in a single operation.
   * Groups all clients into one email per recipient.
   */
  async notifyBulkClientsUpdated(
    updates: Array<{ client: Client; oldValues: Record<string, unknown> }>,
    performedBy: User
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    // All clients should belong to same company (bulk operation constraint)
    const companyId = updates[0].client.companyId;

    // Validate multi-tenant constraint: all clients must belong to the same company
    const invalidUpdate = updates.find((u) => u.client.companyId !== companyId);
    if (invalidUpdate) {
      throw new ForbiddenException(
        `Multi-tenant violation: Client ${invalidUpdate.client.id} belongs to company ${invalidUpdate.client.companyId}, expected ${companyId}`
      );
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(companyId);

    if (!smtpConfig) {
      this.logger.warn(
        `No active email configuration for company. Skipping bulk update notifications.`,
        {
          companyId,
          clientCount: updates.length,
          notificationType: 'bulk_update',
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(companyId, 'receiveOnUpdate');

    if (recipients.length === 0) {
      return;
    }

    // Calculate changes for each client
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

    if (clientsWithChanges.length === 0) {
      return;
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    try {
      const html = await this.compileTemplate('clients-bulk-updated', {
        clients: clientsWithChanges,
        clientCount: clientsWithChanges.length,
        companyName: company?.name || 'Nieznana firma',
        updatedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        updatedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Zaktualizowano ${clientsWithChanges.length} klientów`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log(`Bulk update notifications sent to users`, {
        companyId,
        clientCount: clientsWithChanges.length,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error(`Failed to send bulk client updated notification`, {
        companyId,
        clientCount: updates.length,
        error: (error as Error).message,
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  }

  /**
   * Returns users who should receive notifications.
   *
   * Logic:
   * - Users WITHOUT settings → receive notifications (default enabled)
   * - Users with [notificationType] = true → receive notifications
   * - Users with [notificationType] = false → DO NOT receive notifications
   * - User performing the action → excluded
   */
  private async getNotificationRecipients(
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

    // No settings (NULL) = default enabled, OR explicitly enabled
    queryBuilder.andWhere(`(settings.id IS NULL OR settings.${notificationType} = :enabled)`, {
      enabled: true,
    });

    const users = await queryBuilder.getMany();

    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Notification recipients resolved with default-enabled logic', {
        companyId,
        notificationType,
        excludeUserId,
        recipientCount: users.length,
        recipientIds: users.map((u) => u.id),
      });
    }

    return users;
  }

  private calculateChanges(oldValues: Record<string, unknown>, newEntity: Client): ChangeDetail[] {
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
    // Use separate patterns to avoid regex backtracking concerns
    const isIsoDateString = (val: string): boolean => {
      // Check for YYYY-MM-DD format (exactly 10 chars) or YYYY-MM-DDTHH:MM:SS format (19+ chars)
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

  /**
   * Send welcome email to client with all their data
   * Saves copy to IMAP Sent folder
   */
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

      this.logger.log(`Welcome email sent to client and saved to Sent folder`, {
        companyId: client.companyId,
        clientId: client.id,
        // PII: Email masked for privacy
        clientEmailDomain: client.email ? `***@${client.email.split('@')[1] || 'unknown'}` : null,
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to client`, {
        companyId: client.companyId,
        clientId: client.id,
        // PII: Email masked for privacy
        clientEmailDomain: client.email ? `***@${client.email.split('@')[1] || 'unknown'}` : null,
        error: (error as Error).message,
        errorName: (error as Error).name,
      });
    }
  }

  /**
   * Send notifications to company users using company SMTP
   * Saves all emails to IMAP Sent folder
   */
  private async notifyCompanyUsersWithCompanySmtp(
    client: Client,
    company: Company | null,
    performedBy: User,
    smtpConfig: SmtpConfig,
    imapConfig: ImapConfig
  ): Promise<void> {
    const recipients = await this.getNotificationRecipients(client.companyId, 'receiveOnCreate');

    // Debug logging for recipient resolution
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Notification recipients resolved', {
        clientId: client.id,
        recipientCount: recipients.length,
        moduleSlug: 'clients',
      });
    }

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

      await this.emailSenderService.sendBatchEmailsAndSave(smtpConfig, imapConfig, messages);
      this.logger.log(
        `Create notifications sent to users for new client and saved to Sent folder`,
        {
          companyId: client.companyId,
          clientId: client.id,
          recipientCount: recipients.length,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send client created notifications`, {
        companyId: client.companyId,
        clientId: client.id,
        error: (error as Error).message,
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  }

  /**
   * Compile client welcome template with all data
   */
  private async compileClientWelcomeTemplate(
    client: Client,
    company: Company | null
  ): Promise<string> {
    const context = {
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
    };

    return this.compileTemplate('client-welcome', context);
  }

  /**
   * Compile a Handlebars template with context
   */
  private async compileTemplate(
    templateName: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    // Debug logging for template compilation start
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Template compilation starting', {
        templateName,
        templatePath,
        contextKeys: Object.keys(context),
      });
    }

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      const html = template(context);

      // Debug logging for successful compilation
      if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
        this.logger.debug('Template compiled successfully', {
          templateName,
          htmlLength: html.length,
        });
      }

      return html;
    } catch (error) {
      this.logger.error(`Failed to compile template`, {
        templateName,
        error: (error as Error).message,
        errorName: (error as Error).name,
        stack: (error as Error).stack,
      });
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
