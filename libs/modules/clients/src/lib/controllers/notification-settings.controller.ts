import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { NotificationSettingsService } from '../services/notification-settings.service';
import { UpdateNotificationSettingsDto } from '../dto/notification-settings.dto';

@ApiTags('Client Notification Settings')
@ApiBearerAuth()
@Controller('modules/clients/notification-settings')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

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
  async createSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationSettingsService.updateSettings(user, dto);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  @RequirePermission('clients', 'write')
  async updateSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: User,
  ) {
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
