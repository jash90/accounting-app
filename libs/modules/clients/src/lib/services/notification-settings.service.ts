import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getSettings(user: User): Promise<NotificationSettings> {
    if (!user.companyId) {
      throw new InternalServerErrorException(
        'User must belong to a company to have notification settings'
      );
    }

    // Use atomic upsert to prevent race conditions
    // First try to find existing settings with companyId for tenant isolation
    let settings = await this.settingsRepository.findOne({
      where: {
        userId: user.id,
        companyId: user.companyId,
        moduleSlug: this.moduleSlug,
      },
    });

    if (!settings) {
      // Create default settings using upsert to handle concurrent requests
      const defaultSettings = {
        userId: user.id,
        companyId: user.companyId,
        moduleSlug: this.moduleSlug,
        receiveOnCreate: true,
        receiveOnUpdate: true,
        receiveOnDelete: true,
        isAdminCopy: false,
      };

      await this.settingsRepository
        .createQueryBuilder()
        .insert()
        .into(NotificationSettings)
        .values(defaultSettings)
        .orIgnore() // Ignore if unique constraint violated (concurrent insert)
        .execute();

      // Fetch the settings (either newly created or from concurrent insert)
      settings = await this.settingsRepository.findOne({
        where: {
          userId: user.id,
          companyId: user.companyId,
          moduleSlug: this.moduleSlug,
        },
      });

      if (!settings) {
        throw new InternalServerErrorException(
          'Failed to create or retrieve notification settings'
        );
      }
    }

    return settings;
  }

  async updateSettings(
    user: User,
    dto: UpdateNotificationSettingsDto
  ): Promise<NotificationSettings> {
    const settings = await this.getSettings(user);

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
    companyId: string,
    dto: UpdateNotificationSettingsDto
  ): Promise<NotificationSettings> {
    // Validate user belongs to the specified company (multi-tenant isolation)
    const targetUser = await this.userRepository.findOne({
      where: { id: userId, companyId },
      select: ['id'],
    });

    if (!targetUser) {
      throw new ForbiddenException(
        'Cannot modify notification settings: user not found or belongs to a different company'
      );
    }

    // Use atomic upsert to prevent race conditions
    // companyId is required for multi-tenant isolation
    const defaultSettings = {
      userId,
      companyId,
      moduleSlug: this.moduleSlug,
      receiveOnCreate: dto.receiveOnCreate ?? true,
      receiveOnUpdate: dto.receiveOnUpdate ?? true,
      receiveOnDelete: dto.receiveOnDelete ?? true,
      isAdminCopy: dto.isAdminCopy ?? false,
    };

    // Upsert: insert or update on conflict
    await this.settingsRepository
      .createQueryBuilder()
      .insert()
      .into(NotificationSettings)
      .values(defaultSettings)
      .orUpdate(
        ['receiveOnCreate', 'receiveOnUpdate', 'receiveOnDelete', 'isAdminCopy'],
        ['companyId', 'userId', 'moduleSlug']
      )
      .execute();

    // Fetch and return the updated settings with tenant isolation
    const settings = await this.settingsRepository.findOne({
      where: {
        userId,
        companyId,
        moduleSlug: this.moduleSlug,
      },
    });

    if (!settings) {
      throw new InternalServerErrorException('Failed to create or retrieve notification settings');
    }

    return settings;
  }

  async deleteSettings(userId: string, companyId: string): Promise<void> {
    // Validate user belongs to the specified company (multi-tenant isolation)
    const targetUser = await this.userRepository.findOne({
      where: { id: userId, companyId },
      select: ['id'],
    });

    if (!targetUser) {
      throw new ForbiddenException(
        'Cannot delete notification settings: user not found or belongs to a different company'
      );
    }

    await this.settingsRepository.delete({
      userId,
      companyId,
      moduleSlug: this.moduleSlug,
    });
  }
}
