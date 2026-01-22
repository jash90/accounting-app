import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';

import { MarkMultipleDto, NotificationFiltersDto } from '../dto/notification-filters.dto';
import { NotificationResponseDto, UnreadCountResponseDto } from '../dto/notification-response.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationService, PaginatedNotifications } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
/**
 * NotificationsController intentionally uses only JwtAuthGuard without ModuleAccessGuard/PermissionGuard.
 * Notifications are a cross-module feature - all authenticated users should access their notifications
 * regardless of which modules they have access to.
 */
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(
    @CurrentUser() user: User,
    @Query() filters: NotificationFiltersDto
  ): Promise<PaginatedNotifications> {
    return this.notificationService.findAll(user, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(@CurrentUser() user: User): Promise<UnreadCountResponseDto> {
    const count = await this.notificationService.getUnreadCount(user);
    return { count };
  }

  @Get('archived')
  @ApiOperation({ summary: 'Get archived notifications' })
  @ApiResponse({ status: 200, description: 'List of archived notifications' })
  async findArchived(
    @CurrentUser() user: User,
    @Query() filters: NotificationFiltersDto
  ): Promise<PaginatedNotifications> {
    return this.notificationService.findArchived(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single notification by ID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<NotificationResponseDto> {
    return this.notificationService.findOne(id, user);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.markAsRead(id, user);
    const unreadCount = await this.notificationService.getUnreadCount(user);
    this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    this.notificationGateway.sendNotificationRead(user.id, id);
    return notification;
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsUnread(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.markAsUnread(id, user);
    const unreadCount = await this.notificationService.getUnreadCount(user);
    this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    return notification;
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of marked notifications' })
  async markAllAsRead(@CurrentUser() user: User): Promise<{ count: number }> {
    const result = await this.notificationService.markAllAsRead(user);
    this.notificationGateway.sendUnreadCountUpdate(user.id, 0);
    return result;
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.archive(id, user);
    this.notificationGateway.sendNotificationArchived(user.id, id);
    if (!notification.isRead) {
      const unreadCount = await this.notificationService.getUnreadCount(user);
      this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    }
    return notification;
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore archived notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.restore(id, user);
    if (!notification.isRead) {
      const unreadCount = await this.notificationService.getUnreadCount(user);
      this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    }
    return notification;
  }

  @Patch('archive-multiple')
  @ApiOperation({ summary: 'Archive multiple notifications' })
  @ApiResponse({ status: 200, description: 'Count of archived notifications' })
  async archiveMultiple(
    @Body() dto: MarkMultipleDto,
    @CurrentUser() user: User
  ): Promise<{ count: number }> {
    const result = await this.notificationService.archiveMultiple(dto.ids || [], user);
    const unreadCount = await this.notificationService.getUnreadCount(user);
    this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<{ success: boolean }> {
    await this.notificationService.delete(id, user);
    const unreadCount = await this.notificationService.getUnreadCount(user);
    this.notificationGateway.sendUnreadCountUpdate(user.id, unreadCount);
    return { success: true };
  }
}
