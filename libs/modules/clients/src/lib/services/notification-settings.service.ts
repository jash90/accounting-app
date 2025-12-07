import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings, User } from '@accounting/common';

export interface UpdateNotificationSettingsDto {
  receiveOnCreate?: boolean;
  receiveOnUpdate?: boolean;
  receiveOnDelete?: boolean;
  isAdminCopy?: boolean;
}

@Injectable()
export class NotificationSettingsService {
  private readonly moduleSlug = 'clients';

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
  ) {}

  async getSettings(user: User): Promise<NotificationSettings> {
    let settings = await this.settingsRepository.findOne({
      where: {
        userId: user.id,
        moduleSlug: this.moduleSlug,
      },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = this.settingsRepository.create({
        userId: user.id,
        moduleSlug: this.moduleSlug,
        receiveOnCreate: true,
        receiveOnUpdate: true,
        receiveOnDelete: true,
        isAdminCopy: false,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(
    user: User,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    let settings = await this.getSettings(user);

    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async enableAllNotifications(user: User): Promise<NotificationSettings> {
    return this.updateSettings(user, {
      receiveOnCreate: true,
      receiveOnUpdate: true,
      receiveOnDelete: true,
    });
  }

  async disableAllNotifications(user: User): Promise<NotificationSettings> {
    return this.updateSettings(user, {
      receiveOnCreate: false,
      receiveOnUpdate: false,
      receiveOnDelete: false,
    });
  }

  // Admin methods for managing other users' settings

  async getAllSettingsForModule(companyId: string): Promise<NotificationSettings[]> {
    return this.settingsRepository
      .createQueryBuilder('settings')
      .innerJoin('settings.user', 'user')
      .where('settings.moduleSlug = :moduleSlug', { moduleSlug: this.moduleSlug })
      .andWhere('user.companyId = :companyId', { companyId })
      .getMany();
  }

  async setUserSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    let settings = await this.settingsRepository.findOne({
      where: {
        userId,
        moduleSlug: this.moduleSlug,
      },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        userId,
        moduleSlug: this.moduleSlug,
        receiveOnCreate: true,
        receiveOnUpdate: true,
        receiveOnDelete: true,
        isAdminCopy: false,
      });
    }

    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async deleteSettings(userId: string): Promise<void> {
    await this.settingsRepository.delete({
      userId,
      moduleSlug: this.moduleSlug,
    });
  }
}
