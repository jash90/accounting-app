import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User, UserRole } from '@accounting/common';

import { RecipientResolver } from '../decorators/notify-on.decorator';
import { NotificationEventPayload } from '../dto/notification-event-payload.dto';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { SystemCompanyService } from '../services/system-company.service';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly dispatcherService: NotificationDispatcherService,
    private readonly systemCompanyService: SystemCompanyService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @OnEvent('notification.dispatch')
  async handleNotificationDispatch(payload: NotificationEventPayload): Promise<void> {
    try {
      const { options, result, actor, isBatch } = payload;

      // Determine effective companyId - use system company for ADMIN users without companyId
      let effectiveCompanyId = actor.companyId;

      if (!actor.companyId) {
        if (actor.role === UserRole.ADMIN) {
          try {
            effectiveCompanyId = await this.systemCompanyService.getSystemCompanyId();
            this.logger.debug('Using system company for ADMIN user notification', {
              actorId: actor.id,
              systemCompanyId: effectiveCompanyId,
              type: options.type,
            });
          } catch (error) {
            this.logger.warn('Failed to get system company for ADMIN user, skipping notification', {
              actorId: actor.id,
              type: options.type,
              error: (error as Error).message,
            });
            return;
          }
        } else {
          this.logger.warn(
            'Actor has no companyId and is not ADMIN, skipping notification dispatch',
            {
              actorId: actor.id,
              role: actor.role,
              type: options.type,
            }
          );
          return;
        }
      }

      const title = this.interpolateTemplate(options.titleTemplate, result, actor);
      const message = options.messageTemplate
        ? this.interpolateTemplate(options.messageTemplate, result, actor)
        : undefined;
      const actionUrl = options.actionUrlTemplate
        ? this.interpolateTemplate(options.actionUrlTemplate, result, actor)
        : undefined;

      const recipientIds = await this.resolveRecipients(
        options.recipientResolver,
        result,
        actor,
        effectiveCompanyId!
      );

      if (recipientIds.length === 0) {
        this.logger.debug('No recipients for notification', { type: options.type });
        return;
      }

      let data: Record<string, unknown> | undefined;
      let itemCount = 1;

      if (isBatch && 'itemsExtractor' in options) {
        const items = options.itemsExtractor(result);
        data = { items };
        itemCount = items.length;
      } else if ('dataExtractor' in options && options.dataExtractor) {
        data = options.dataExtractor(result);
      }

      await this.dispatcherService.dispatch({
        type: options.type,
        recipientIds,
        companyId: effectiveCompanyId!,
        title,
        message,
        data,
        actionUrl,
        actorId: actor.id,
        isBatch,
        itemCount,
      });

      this.logger.debug('Notification dispatched', {
        type: options.type,
        recipientCount: recipientIds.length,
        isBatch,
      });
    } catch (error) {
      this.logger.error('Failed to dispatch notification', {
        error: (error as Error).message,
        type: payload.options.type,
      });
    }
  }

  private async resolveRecipients(
    resolver: RecipientResolver,
    result: unknown,
    actor: User,
    effectiveCompanyId: string
  ): Promise<string[]> {
    if (typeof resolver === 'function') {
      return resolver(result, { id: actor.id, companyId: effectiveCompanyId });
    }

    switch (resolver) {
      case 'actor':
        return [actor.id];

      case 'assignee': {
        const assigneeId = (result as { assigneeId?: string })?.assigneeId;
        return assigneeId ? [assigneeId] : [];
      }

      case 'companyUsers': {
        const users = await this.userRepository.find({
          where: { companyId: effectiveCompanyId, isActive: true },
          select: ['id'],
        });
        return users.map((u) => u.id);
      }

      case 'companyUsersExceptActor': {
        const users = await this.userRepository.find({
          where: { companyId: effectiveCompanyId, isActive: true },
          select: ['id'],
        });
        return users.filter((u) => u.id !== actor.id).map((u) => u.id);
      }

      default:
        return [];
    }
  }

  private interpolateTemplate(template: string, result: unknown, actor: User): string {
    let output = template;

    output = output.replace(/\{\{actor\.(\w+)\}\}/g, (_, key) => {
      return String((actor as unknown as Record<string, unknown>)[key] || '');
    });

    output = output.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (result && typeof result === 'object') {
        return String((result as Record<string, unknown>)[key] || '');
      }
      return '';
    });

    output = output.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, obj, key) => {
      if (result && typeof result === 'object') {
        const nested = (result as Record<string, unknown>)[obj];
        if (nested && typeof nested === 'object') {
          return String((nested as Record<string, unknown>)[key] || '');
        }
      }
      return '';
    });

    return output;
  }
}
