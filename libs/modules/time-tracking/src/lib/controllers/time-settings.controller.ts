import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { UpdateTimeSettingsDto } from '../dto/time-settings.dto';
import { TimeSettingsService } from '../services/time-settings.service';

@ApiTags('Time Tracking - Settings')
@ApiBearerAuth()
@Controller('modules/time-tracking/settings')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('time-tracking')
export class TimeSettingsController {
  constructor(private readonly settingsService: TimeSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get time tracking settings',
    description: 'Retrieves the time tracking settings for the current company.',
  })
  @ApiResponse({ status: 200, description: 'Time tracking settings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermission('time-tracking', 'read')
  async getSettings(@CurrentUser() user: User) {
    return this.settingsService.getSettings(user);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update time tracking settings',
    description:
      'Updates the time tracking settings for the current company. Requires manage permission.',
  })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @RequirePermission('time-tracking', 'manage')
  async updateSettings(@Body() dto: UpdateTimeSettingsDto, @CurrentUser() user: User) {
    return this.settingsService.updateSettings(dto, user);
  }
}
