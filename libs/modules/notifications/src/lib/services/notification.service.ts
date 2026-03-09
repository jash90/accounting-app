import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import {
  getModuleFromNotificationType,
  Notification,
  NotificationData,
  NotificationType,
  PaginatedResponseDto,
  User,
} from '@accounting/common';
import { calculatePagination, SystemCompanyService } from '@accounting/common/backend';

import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationFiltersDto } from '../dto/notification-filters.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...dto,
      moduleSlug: dto.moduleSlug || getModuleFromNotificationType(dto.type),
    });

    const saved = await this.notificationRepository.save(notification);

    return this.notificationRepository.findOne({
      where: { id: saved.id },
      relations: ['actor'],
    }) as Promise<Notification>;
  }

  private static readonly MAX_BATCH_SIZE = 100;

  async createBatch(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    if (notifications.length > NotificationService.MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `Batch size cannot exceed ${NotificationService.MAX_BATCH_SIZE} notifications`
      );
    }

    const entities = notifications.map((dto) =>
      this.notificationRepository.create({
        ...dto,
        moduleSlug: dto.moduleSlug || getModuleFromNotificationType(dto.type),
      })
    );

    const saved = await this.notificationRepository.save(entities);

    return this.notificationRepository.find({
      where: { id: In(saved.map((n) => n.id)) },
      relations: ['actor'],
    });
  }

  async findAll(
    user: User,
    filters: NotificationFiltersDto
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const { page, limit, skip } = calculatePagination(filters);
    const { type, moduleSlug, isRead, isArchived = false } = filters;

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (!companyId) {
      return new PaginatedResponseDto<NotificationResponseDto>([], 0, page, limit);
    }

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      .where('notification.recipientId = :recipientId', { recipientId: user.id })
      .andWhere('notification.companyId = :companyId', { companyId })
      .andWhere('notification.isArchived = :isArchived', { isArchived });

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (moduleSlug) {
      queryBuilder.andWhere('notification.moduleSlug = :moduleSlug', { moduleSlug });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return new PaginatedResponseDto(data.map(this.mapToResponseDto), total, page, limit);
  }

  findArchived(
    user: User,
    filters: NotificationFiltersDto
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    return this.findAll(user, { ...filters, isArchived: true });
  }

  async findOne(id: string, user: User): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['actor'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (notification.recipientId !== user.id || notification.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this notification');
    }

    return this.mapToResponseDto(notification);
  }

  async getUnreadCount(user: User): Promise<number> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (!companyId) {
      return 0;
    }
    return this.notificationRepository.count({
      where: {
        recipientId: user.id,
        companyId,
        isRead: false,
        isArchived: false,
      },
    });
  }

  async markAsRead(id: string, user: User): Promise<NotificationResponseDto> {
    const notification = await this.findOneEntity(id, user);

    notification.isRead = true;
    notification.readAt = new Date();

    await this.notificationRepository.save(notification);

    return this.findOne(id, user);
  }

  async markAsUnread(id: string, user: User): Promise<NotificationResponseDto> {
    const notification = await this.findOneEntity(id, user);

    notification.isRead = false;
    notification.readAt = null;

    await this.notificationRepository.save(notification);

    return this.findOne(id, user);
  }

  async markAllAsRead(user: User): Promise<{ count: number }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (!companyId) {
      return { count: 0 };
    }
    const result = await this.notificationRepository.update(
      {
        recipientId: user.id,
        companyId,
        isRead: false,
        isArchived: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return { count: result.affected || 0 };
  }

  async archive(id: string, user: User): Promise<NotificationResponseDto> {
    const notification = await this.findOneEntity(id, user);

    notification.isArchived = true;
    notification.archivedAt = new Date();

    await this.notificationRepository.save(notification);

    return this.findOne(id, user);
  }

  async unarchiveNotification(id: string, user: User): Promise<NotificationResponseDto> {
    const notification = await this.findOneEntity(id, user);

    notification.isArchived = false;
    notification.archivedAt = null;

    await this.notificationRepository.save(notification);

    return this.findOne(id, user);
  }

  async archiveMultiple(ids: string[], user: User): Promise<{ count: number }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (!companyId) {
      return { count: 0 };
    }
    const result = await this.notificationRepository.update(
      {
        id: In(ids),
        recipientId: user.id,
        companyId,
      },
      {
        isArchived: true,
        archivedAt: new Date(),
      }
    );

    return { count: result.affected || 0 };
  }

  async delete(id: string, user: User): Promise<void> {
    const notification = await this.findOneEntity(id, user);
    await this.notificationRepository.remove(notification);
  }

  async markEmailSent(id: string): Promise<void> {
    await this.notificationRepository.update(id, {
      emailSent: true,
      emailSentAt: new Date(),
    });
  }

  private async findOneEntity(id: string, user: User): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    if (notification.recipientId !== user.id || notification.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this notification');
    }

    return notification;
  }

  mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      companyId: notification.companyId,
      type: notification.type as NotificationType,
      moduleSlug: notification.moduleSlug,
      title: notification.title,
      message: notification.message,
      data: notification.data as NotificationData | null,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      readAt: notification.readAt,
      isArchived: notification.isArchived,
      archivedAt: notification.archivedAt,
      emailSent: notification.emailSent,
      emailSentAt: notification.emailSentAt,
      actor: notification.actor
        ? {
            id: notification.actor.id,
            email: notification.actor.email,
            firstName: notification.actor.firstName,
            lastName: notification.actor.lastName,
          }
        : null,
      isBatch: notification.isBatch,
      itemCount: notification.itemCount,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
