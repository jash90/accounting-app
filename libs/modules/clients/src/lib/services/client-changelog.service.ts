import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Client,
  User,
  NotificationSettings,
  ChangeLog,
  Company,
} from '@accounting/common';
import { EmailService } from '@accounting/infrastructure/email';
import { ChangeLogService, ChangeDetail } from '@accounting/infrastructure/change-log';

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
  ) {}

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
    const recipients = await this.getNotificationRecipients(
      client.companyId,
      'receiveOnCreate',
      performedBy.id,
    );

    if (recipients.length === 0) {
      return;
    }

    const company = await this.companyRepository.findOne({
      where: { id: client.companyId },
    });

    try {
      await this.emailService.sendClientCreatedNotification(
        recipients.map((r) => r.email),
        {
          name: client.name,
          nip: client.nip,
          companyName: company?.name || 'Nieznana firma',
          createdByName: `${performedBy.firstName} ${performedBy.lastName}`,
        },
      );
    } catch (error) {
      this.logger.error('Failed to send client created notification', error);
    }
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
      'amlGroup',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
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
}
