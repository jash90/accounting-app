import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { NotificationSettings, NotificationType, User, UserRole } from '@accounting/common';

import { SystemCompanyService } from './system-company.service';
import {
  UpdateModuleNotificationSettingsDto,
  UpdateNotificationSettingsDto,
} from '../dto/update-notification-settings.dto';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  /**
   * Get the effective companyId for a user.
   * ADMIN users use System Admin Company, others use their assigned companyId.
   */
  private async getEffectiveCompanyId(user: User): Promise<string | null> {
    if (user.role === UserRole.ADMIN) {
      return this.systemCompanyService.getSystemCompanyId();
    }
    return user.companyId;
  }

  async getSettingsForModule(user: User, moduleSlug: string): Promise<NotificationSettings> {
    const companyId = await this.getEffectiveCompanyId(user);
    if (!companyId) {
      throw new InternalServerErrorException('User must belong to a company');
    }

    let settings = await this.settingsRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        moduleSlug,
      },
    });

    if (!settings) {
      settings = await this.createDefaultSettings(user, moduleSlug, companyId);
    }

    return settings;
  }

  async getAllSettingsForUser(user: User): Promise<NotificationSettings[]> {
    const companyId = await this.getEffectiveCompanyId(user);
    if (!companyId) {
      throw new InternalServerErrorException('User must belong to a company');
    }

    return this.settingsRepository.find({
      where: {
        userId: user.id,
        companyId,
      },
      order: { moduleSlug: 'ASC' },
    });
  }

  async updateSettingsForModule(
    user: User,
    moduleSlug: string,
    dto: UpdateNotificationSettingsDto | UpdateModuleNotificationSettingsDto
  ): Promise<NotificationSettings> {
    const settings = await this.getSettingsForModule(user, moduleSlug);

    Object.assign(settings, dto);

    return this.settingsRepository.save(settings);
  }

  /**
   * Batch update all notification settings for a user across all modules.
   * Uses a single UPDATE query instead of iterating through each setting.
   * @returns Number of settings records updated
   */
  async updateAllSettingsForUser(user: User, dto: UpdateNotificationSettingsDto): Promise<number> {
    const companyId = await this.getEffectiveCompanyId(user);
    if (!companyId) {
      throw new InternalServerErrorException('User must belong to a company');
    }

    const result = await this.settingsRepository.update({ userId: user.id, companyId }, dto);

    return result.affected ?? 0;
  }

  async shouldSendInApp(
    recipientId: string,
    companyId: string,
    moduleSlug: string,
    notificationType: NotificationType
  ): Promise<boolean> {
    const settings = await this.settingsRepository.findOne({
      where: { userId: recipientId, companyId, moduleSlug },
    });

    if (!settings) {
      return true;
    }

    if (!settings.inAppEnabled) {
      return false;
    }

    if (settings.typePreferences) {
      const typePref = settings.typePreferences[notificationType];
      if (typePref && typePref.inApp === false) {
        return false;
      }
    }

    return this.checkEventTypeEnabled(settings, notificationType);
  }

  async shouldSendEmail(
    recipientId: string,
    companyId: string,
    moduleSlug: string,
    notificationType: NotificationType
  ): Promise<boolean> {
    const settings = await this.settingsRepository.findOne({
      where: { userId: recipientId, companyId, moduleSlug },
    });

    if (!settings) {
      return true;
    }

    if (!settings.emailEnabled) {
      return false;
    }

    if (settings.typePreferences) {
      const typePref = settings.typePreferences[notificationType];
      if (typePref && typePref.email === false) {
        return false;
      }
    }

    return this.checkEventTypeEnabled(settings, notificationType);
  }

  async getRecipientsForNotification(
    companyId: string,
    moduleSlug: string,
    notificationType: NotificationType,
    channel: 'inApp' | 'email'
  ): Promise<string[]> {
    const users = await this.userRepository.find({
      where: { companyId, isActive: true },
      select: ['id'],
    });

    if (users.length === 0) return [];

    const allSettings = await this.settingsRepository.find({
      where: {
        companyId,
        moduleSlug,
        userId: In(users.map((u) => u.id)),
      },
    });

    const settingsMap = new Map(allSettings.map((s) => [s.userId, s]));

    return users
      .filter((user) => {
        const settings = settingsMap.get(user.id);
        return this.shouldSendForChannel(settings, notificationType, channel);
      })
      .map((u) => u.id);
  }

  private shouldSendForChannel(
    settings: NotificationSettings | undefined,
    notificationType: NotificationType,
    channel: 'inApp' | 'email'
  ): boolean {
    if (!settings) return true;

    const channelEnabled = channel === 'inApp' ? settings.inAppEnabled : settings.emailEnabled;
    if (!channelEnabled) return false;

    if (settings.typePreferences) {
      const typePref = settings.typePreferences[notificationType];
      if (typePref && typePref[channel] === false) return false;
    }

    return this.checkEventTypeEnabled(settings, notificationType);
  }

  private async createDefaultSettings(
    user: User,
    moduleSlug: string,
    companyId: string
  ): Promise<NotificationSettings> {
    const defaultSettings = {
      userId: user.id,
      companyId,
      moduleSlug,
      inAppEnabled: true,
      emailEnabled: true,
      receiveOnCreate: true,
      receiveOnUpdate: true,
      receiveOnDelete: true,
      receiveOnTaskCompleted: true,
      receiveOnTaskOverdue: true,
      isAdminCopy: false,
      typePreferences: null,
    };

    // Use INSERT ... ON CONFLICT DO NOTHING to handle race conditions safely
    // If another concurrent request already created the settings, this is a no-op
    // and we simply fetch the existing record
    await this.settingsRepository
      .createQueryBuilder()
      .insert()
      .into(NotificationSettings)
      .values(defaultSettings)
      .orIgnore() // DO NOTHING on conflict - preserves any existing user preferences
      .execute();

    // Now the record definitely exists, fetch it
    const settings = await this.settingsRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        moduleSlug,
      },
    });

    if (!settings) {
      // This should never happen after successful upsert, but handle it gracefully
      throw new InternalServerErrorException('Failed to create notification settings');
    }

    return settings;
  }

  private checkEventTypeEnabled(
    settings: NotificationSettings,
    notificationType: NotificationType
  ): boolean {
    if (notificationType.includes('.created') && !settings.receiveOnCreate) {
      return false;
    }

    if (notificationType.includes('.updated') && !settings.receiveOnUpdate) {
      return false;
    }

    if (notificationType.includes('.deleted') && !settings.receiveOnDelete) {
      return false;
    }

    if (notificationType === NotificationType.TASK_COMPLETED && !settings.receiveOnTaskCompleted) {
      return false;
    }

    if (notificationType === NotificationType.TASK_OVERDUE && !settings.receiveOnTaskOverdue) {
      return false;
    }

    return true;
  }
}
