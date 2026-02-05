import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { NotificationSettings, User } from '@accounting/common';

import { VALID_MODULE_SLUGS, ValidModuleSlug } from '../dto/create-notification.dto';
import {
  UpdateModuleNotificationSettingsDto,
  UpdateNotificationSettingsDto,
} from '../dto/update-notification-settings.dto';
import { NotificationSettingsService } from '../services/notification-settings.service';

/**
 * Validates that moduleSlug is one of the allowed values.
 * Throws BadRequestException if invalid.
 */
function validateModuleSlug(moduleSlug: string): asserts moduleSlug is ValidModuleSlug {
  if (!VALID_MODULE_SLUGS.includes(moduleSlug as ValidModuleSlug)) {
    throw new BadRequestException(
      `Invalid moduleSlug: "${moduleSlug}". Must be one of: ${VALID_MODULE_SLUGS.join(', ')}`
    );
  }
}

@ApiTags('Notification Settings')
@ApiBearerAuth()
@Controller('notifications/settings')
@UseGuards(JwtAuthGuard)
export class NotificationSettingsController {
  constructor(private readonly settingsService: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notification settings for current user' })
  @ApiResponse({ status: 200, description: 'List of notification settings by module' })
  async getAllSettings(@CurrentUser() user: User): Promise<NotificationSettings[]> {
    return this.settingsService.getAllSettingsForUser(user);
  }

  @Get('modules/:moduleSlug')
  @ApiOperation({ summary: 'Get notification settings for specific module' })
  @ApiParam({
    name: 'moduleSlug',
    description: 'Module slug',
    enum: VALID_MODULE_SLUGS,
  })
  @ApiResponse({ status: 200, description: 'Notification settings for module' })
  @ApiResponse({ status: 400, description: 'Invalid moduleSlug' })
  async getModuleSettings(
    @Param('moduleSlug') moduleSlug: string,
    @CurrentUser() user: User
  ): Promise<NotificationSettings> {
    validateModuleSlug(moduleSlug);
    return this.settingsService.getSettingsForModule(user, moduleSlug);
  }

  @Patch('modules/:moduleSlug')
  @ApiOperation({ summary: 'Update notification settings for specific module' })
  @ApiParam({
    name: 'moduleSlug',
    description: 'Module slug',
    enum: VALID_MODULE_SLUGS,
  })
  @ApiResponse({ status: 200, description: 'Updated notification settings' })
  @ApiResponse({ status: 400, description: 'Invalid moduleSlug' })
  async updateModuleSettings(
    @Param('moduleSlug') moduleSlug: string,
    @Body() dto: UpdateModuleNotificationSettingsDto,
    @CurrentUser() user: User
  ): Promise<NotificationSettings> {
    validateModuleSlug(moduleSlug);
    return this.settingsService.updateSettingsForModule(user, moduleSlug, dto);
  }

  @Patch('global')
  @ApiOperation({ summary: 'Update global notification settings (applies to all modules)' })
  @ApiResponse({ status: 200, description: 'Updated global settings' })
  async updateGlobalSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: User
  ): Promise<{ updated: number }> {
    const updated = await this.settingsService.updateAllSettingsForUser(user, dto);
    return { updated };
  }
}
