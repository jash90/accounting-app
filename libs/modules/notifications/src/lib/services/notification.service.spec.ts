import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type Repository } from 'typeorm';

import { type Notification, NotificationType, type User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotificationRepository: jest.Mocked<Repository<Notification>>;
  let mockSystemCompanyService: jest.Mocked<SystemCompanyService>;

  const companyId = 'company-123';

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      companyId,
      isActive: true,
      ...overrides,
    }) as User;

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification =>
    ({
      id: 'notif-1',
      recipientId: 'user-123',
      companyId,
      type: NotificationType.TASK_CREATED,
      moduleSlug: 'tasks',
      title: 'Task Created',
      message: 'A new task was created',
      data: null,
      actionUrl: '/tasks/1',
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: null,
      emailSent: false,
      emailSentAt: null,
      actor: null,
      isBatch: false,
      itemCount: 1,
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-03-01'),
      ...overrides,
    }) as Notification;

  const createMockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {};
    qb['leftJoinAndSelect'] = jest.fn().mockReturnValue(qb);
    qb['where'] = jest.fn().mockReturnValue(qb);
    qb['andWhere'] = jest.fn().mockReturnValue(qb);
    qb['orderBy'] = jest.fn().mockReturnValue(qb);
    qb['skip'] = jest.fn().mockReturnValue(qb);
    qb['take'] = jest.fn().mockReturnValue(qb);
    qb['getCount'] = jest.fn().mockResolvedValue(0);
    qb['getMany'] = jest.fn().mockResolvedValue([]);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockQb = createMockQueryBuilder();

    mockNotificationRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'notif-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<Notification>>;

    mockSystemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    } as unknown as jest.Mocked<SystemCompanyService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationService,
          useFactory: () =>
            new NotificationService(mockNotificationRepository, mockSystemCompanyService),
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('should create and return a notification with actor relation', async () => {
      const dto = {
        recipientId: 'user-123',
        companyId,
        type: NotificationType.TASK_CREATED,
        moduleSlug: 'tasks',
        title: 'Task Created',
      };
      const saved = createMockNotification();
      mockNotificationRepository.save.mockResolvedValue(saved);
      mockNotificationRepository.findOne.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result).toEqual(saved);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.TASK_CREATED })
      );
      expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: saved.id },
        relations: ['actor'],
      });
    });

    it('should auto-derive moduleSlug from notification type if not provided', async () => {
      const dto = {
        recipientId: 'user-123',
        companyId,
        type: NotificationType.TASK_CREATED,
        moduleSlug: '',
        title: 'Test',
      };

      mockNotificationRepository.save.mockResolvedValue(createMockNotification());
      mockNotificationRepository.findOne.mockResolvedValue(createMockNotification());

      await service.create(dto);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ moduleSlug: expect.any(String) })
      );
    });
  });

  describe('createBatch', () => {
    it('should create multiple notifications in batch', async () => {
      const dtos = [
        {
          recipientId: 'user-1',
          companyId,
          type: NotificationType.TASK_CREATED,
          moduleSlug: 'tasks',
          title: 'Task 1',
        },
        {
          recipientId: 'user-2',
          companyId,
          type: NotificationType.TASK_CREATED,
          moduleSlug: 'tasks',
          title: 'Task 2',
        },
      ];

      const savedEntities = dtos.map((d, i) =>
        createMockNotification({ id: `notif-${i}`, recipientId: d.recipientId })
      );
      mockNotificationRepository.save.mockResolvedValue(savedEntities as never);
      mockNotificationRepository.find.mockResolvedValue(savedEntities);

      const result = await service.createBatch(dtos);

      expect(result).toHaveLength(2);
      expect(mockNotificationRepository.save).toHaveBeenCalled();
    });

    it('should throw when batch exceeds MAX_BATCH_SIZE', async () => {
      const dtos = Array.from({ length: 101 }, (_, i) => ({
        recipientId: `user-${i}`,
        companyId,
        type: NotificationType.TASK_CREATED,
        moduleSlug: 'tasks',
        title: `Task ${i}`,
      }));

      await expect(service.createBatch(dtos)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications for a user', async () => {
      const user = createMockUser();
      const notifications = [createMockNotification()];
      const qb = createMockQueryBuilder();
      qb['getCount'].mockResolvedValue(1);
      qb['getMany'].mockResolvedValue(notifications);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findAll(user, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty result when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      const result = await service.findAll(user, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should apply type and moduleSlug filters', async () => {
      const user = createMockUser();
      const qb = createMockQueryBuilder();
      qb['getCount'].mockResolvedValue(0);
      qb['getMany'].mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(qb as never);

      await service.findAll(user, {
        page: 1,
        limit: 20,
        type: NotificationType.TASK_CREATED,
        moduleSlug: 'tasks',
      });

      // andWhere should be called for type and moduleSlug filters
      // base calls: recipientId, companyId, isArchived + type + moduleSlug = 5
      expect(qb['andWhere']).toHaveBeenCalledWith('notification.type = :type', {
        type: NotificationType.TASK_CREATED,
      });
      expect(qb['andWhere']).toHaveBeenCalledWith('notification.moduleSlug = :moduleSlug', {
        moduleSlug: 'tasks',
      });
    });

    it('should filter by isRead when specified', async () => {
      const user = createMockUser();
      const qb = createMockQueryBuilder();
      qb['getCount'].mockResolvedValue(0);
      qb['getMany'].mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(qb as never);

      await service.findAll(user, { page: 1, limit: 20, isRead: false });

      expect(qb['andWhere']).toHaveBeenCalledWith('notification.isRead = :isRead', {
        isRead: false,
      });
    });
  });

  describe('findOne', () => {
    it('should return a notification response DTO', async () => {
      const user = createMockUser();
      const notification = createMockNotification();
      mockNotificationRepository.findOne.mockResolvedValue(notification);

      const result = await service.findOne('notif-1', user);

      expect(result.id).toBe('notif-1');
      expect(result.title).toBe('Task Created');
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      const user = createMockUser();
      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when notification belongs to another user', async () => {
      const user = createMockUser({ id: 'other-user' });
      const notification = createMockNotification({ recipientId: 'user-123' });
      mockNotificationRepository.findOne.mockResolvedValue(notification);

      await expect(service.findOne('notif-1', user)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when notification belongs to another company', async () => {
      const user = createMockUser();
      const notification = createMockNotification({ companyId: 'other-company' });
      mockNotificationRepository.findOne.mockResolvedValue(notification);

      await expect(service.findOne('notif-1', user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const user = createMockUser();
      mockNotificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(user);

      expect(result).toBe(5);
      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: {
          recipientId: user.id,
          companyId,
          isRead: false,
          isArchived: false,
        },
      });
    });

    it('should return 0 when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      const result = await service.getUnreadCount(user);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read with timestamp', async () => {
      const user = createMockUser();
      const notification = createMockNotification();
      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockResolvedValue({
        ...notification,
        isRead: true,
        readAt: new Date(),
      } as Notification);

      await service.markAsRead('notif-1', user);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true })
      );
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread and clear readAt', async () => {
      const user = createMockUser();
      const notification = createMockNotification({ isRead: true, readAt: new Date() });
      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockResolvedValue({
        ...notification,
        isRead: false,
        readAt: null,
      } as Notification);

      await service.markAsUnread('notif-1', user);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: false, readAt: null })
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should batch update all unread notifications for user', async () => {
      const user = createMockUser();
      mockNotificationRepository.update.mockResolvedValue({ affected: 10 } as never);

      const result = await service.markAllAsRead(user);

      expect(result).toEqual({ count: 10 });
      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { recipientId: user.id, companyId, isRead: false, isArchived: false },
        expect.objectContaining({ isRead: true })
      );
    });

    it('should return 0 when user has no company', async () => {
      const user = createMockUser();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(null as unknown as string);

      const result = await service.markAllAsRead(user);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('delete', () => {
    it('should remove the notification entity', async () => {
      const user = createMockUser();
      const notification = createMockNotification();
      mockNotificationRepository.findOne.mockResolvedValue(notification);

      await service.delete('notif-1', user);

      expect(mockNotificationRepository.remove).toHaveBeenCalledWith(notification);
    });

    it('should throw ForbiddenException for another user notification', async () => {
      const user = createMockUser({ id: 'other-user' });
      const notification = createMockNotification({ recipientId: 'user-123' });
      mockNotificationRepository.findOne.mockResolvedValue(notification);

      await expect(service.delete('notif-1', user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markEmailSent', () => {
    it('should update emailSent flag and timestamp', async () => {
      await service.markEmailSent('notif-1');

      expect(mockNotificationRepository.update).toHaveBeenCalledWith('notif-1', {
        emailSent: true,
        emailSentAt: expect.any(Date),
      });
    });
  });

  describe('archive / unarchive', () => {
    it('should archive a notification', async () => {
      const user = createMockUser();
      const notification = createMockNotification();
      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockResolvedValue({
        ...notification,
        isArchived: true,
      } as Notification);

      await service.archive('notif-1', user);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true })
      );
    });

    it('should unarchive a notification', async () => {
      const user = createMockUser();
      const notification = createMockNotification({ isArchived: true, archivedAt: new Date() });
      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockResolvedValue({
        ...notification,
        isArchived: false,
        archivedAt: null,
      } as Notification);

      await service.unarchiveNotification('notif-1', user);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: false, archivedAt: null })
      );
    });
  });
});
