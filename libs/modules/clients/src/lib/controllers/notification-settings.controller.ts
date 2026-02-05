import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { UpdateNotificationSettingsDto } from '../dto/notification-settings.dto';
import { NotificationSettingsService } from '../services/notification-settings.service';

@ApiTags('Client Notification Settings')
@ApiBearerAuth()
@Controller('modules/clients/notification-settings')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class NotificationSettingsController {
  constructor(private readonly notificationSettingsService: NotificationSettingsService) {}

  // /me endpoints (for frontend compatibility)
  @Get('me')
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings' })
  @RequirePermission('clients', 'read')
  async getMySettings(@CurrentUser() user: User) {
    return this.notificationSettingsService.getSettings(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  @RequirePermission('clients', 'write')
  async updateMySettings(@Body() dto: UpdateNotificationSettingsDto, @CurrentUser() user: User) {
    return this.notificationSettingsService.updateSettings(user, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings deleted' })
  @RequirePermission('clients', 'write')
  async deleteMySettings(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }
    return this.notificationSettingsService.deleteSettings(user.id, user.companyId);
  }

  // Legacy endpoints (kept for backward compatibility)
  @Get()
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings' })
  @RequirePermission('clients', 'read')
  async getSettings(@CurrentUser() user: User) {
    return this.notificationSettingsService.getSettings(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update current user notification settings' })
  @ApiResponse({ status: 201, description: 'Notification settings created/updated' })
  @RequirePermission('clients', 'write')
  async createSettings(@Body() dto: UpdateNotificationSettingsDto, @CurrentUser() user: User) {
    return this.notificationSettingsService.updateSettings(user, dto);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  @RequirePermission('clients', 'write')
  async updateSettings(@Body() dto: UpdateNotificationSettingsDto, @CurrentUser() user: User) {
    return this.notificationSettingsService.updateSettings(user, dto);
  }

  @Put('enable-all')
  @ApiOperation({ summary: 'Enable all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications enabled' })
  @RequirePermission('clients', 'write')
  async enableAll(@CurrentUser() user: User) {
    return this.notificationSettingsService.enableAllNotifications(user);
  }

  @Put('disable-all')
  @ApiOperation({ summary: 'Disable all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications disabled' })
  @RequirePermission('clients', 'write')
  async disableAll(@CurrentUser() user: User) {
    return this.notificationSettingsService.disableAllNotifications(user);
  }
}
