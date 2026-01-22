import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { getModuleFromNotificationType, NotificationType, User } from '@accounting/common';

import { NotificationSettingsService } from './notification-settings.service';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  VALID_MODULE_SLUGS,
  ValidModuleSlug,
} from '../dto/create-notification.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';

export interface DispatchNotificationPayload {
  type: NotificationType;
  recipientIds: string[];
  companyId: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actorId?: string;
  isBatch?: boolean;
  itemCount?: number;
}

export interface NotificationCreatedEvent {
  notification: NotificationResponseDto;
  recipientId: string;
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly settingsService: NotificationSettingsService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Validates that all recipient IDs belong to the specified company.
   * Returns only the valid recipient IDs.
   */
  private async validateRecipients(recipientIds: string[], companyId: string): Promise<string[]> {
    if (recipientIds.length === 0) {
      return [];
    }

    const validUsers = await this.userRepository.find({
      where: {
        id: In(recipientIds),
        companyId,
        isActive: true,
      },
      select: ['id'],
    });

    const validIds = new Set(validUsers.map((u) => u.id));
    const invalidIds = recipientIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      this.logger.warn(
        `Filtered out ${invalidIds.length} invalid recipients not belonging to company ${companyId}`,
        { invalidIds }
      );
    }

    return recipientIds.filter((id) => validIds.has(id));
  }

  async dispatch(payload: DispatchNotificationPayload): Promise<void> {
    const moduleSlug = getModuleFromNotificationType(payload.type);

    // Validate that all recipients belong to the company
    const validRecipientIds = await this.validateRecipients(
      payload.recipientIds,
      payload.companyId
    );

    if (validRecipientIds.length === 0) {
      this.logger.debug('No valid recipients for notification', {
        type: payload.type,
        companyId: payload.companyId,
        originalRecipientCount: payload.recipientIds.length,
      });
      return;
    }

    for (const recipientId of validRecipientIds) {
      try {
        const shouldSendInApp = await this.settingsService.shouldSendInApp(
          recipientId,
          payload.companyId,
          moduleSlug,
          payload.type
        );

        let notificationId: string | undefined;

        if (shouldSendInApp) {
          notificationId = await this.createInAppNotification(recipientId, payload, moduleSlug);
        }

        const shouldSendEmail = await this.settingsService.shouldSendEmail(
          recipientId,
          payload.companyId,
          moduleSlug,
          payload.type
        );

        if (shouldSendEmail) {
          this.eventEmitter.emit('notification.email.send', {
            notificationId,
            recipientId,
            companyId: payload.companyId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            data: payload.data,
            actionUrl: payload.actionUrl,
            actorId: payload.actorId,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to dispatch notification to ${recipientId}`, {
          error: (error as Error).message,
          type: payload.type,
        });
      }
    }
  }

  async dispatchToCompanyUsers(
    companyId: string,
    payload: Omit<DispatchNotificationPayload, 'recipientIds' | 'companyId'>,
    excludeUserId?: string
  ): Promise<void> {
    const moduleSlug = getModuleFromNotificationType(payload.type);

    const recipientIds = await this.settingsService.getRecipientsForNotification(
      companyId,
      moduleSlug,
      payload.type,
      'inApp'
    );

    const filteredRecipients = excludeUserId
      ? recipientIds.filter((id) => id !== excludeUserId)
      : recipientIds;

    await this.dispatch({
      ...payload,
      companyId,
      recipientIds: filteredRecipients,
    });
  }

  /**
   * Runtime validation for moduleSlug to prevent type assertion without validation.
   * Returns true if the slug is valid, false otherwise.
   */
  private isValidModuleSlug(slug: string): slug is ValidModuleSlug {
    return VALID_MODULE_SLUGS.includes(slug as ValidModuleSlug);
  }

  private async createInAppNotification(
    recipientId: string,
    payload: DispatchNotificationPayload,
    moduleSlug: string
  ): Promise<string> {
    // Validate moduleSlug at runtime to ensure type safety
    if (!this.isValidModuleSlug(moduleSlug)) {
      this.logger.warn(`Invalid moduleSlug received: "${moduleSlug}", defaulting to "system"`, {
        type: payload.type,
      });
      moduleSlug = 'system';
    }

    const dto: CreateNotificationDto = {
      recipientId,
      companyId: payload.companyId,
      type: payload.type,
      moduleSlug: moduleSlug as ValidModuleSlug,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      actionUrl: payload.actionUrl,
      actorId: payload.actorId,
      isBatch: payload.isBatch,
      itemCount: payload.itemCount,
    };

    const notification = await this.notificationService.create(dto);

    this.eventEmitter.emit('notification.created', {
      notification: this.notificationService.mapToResponseDto(notification),
      recipientId,
    } as NotificationCreatedEvent);

    this.logger.debug(`In-app notification created for ${recipientId}`, {
      type: payload.type,
      notificationId: notification.id,
    });

    return notification.id;
  }
}
