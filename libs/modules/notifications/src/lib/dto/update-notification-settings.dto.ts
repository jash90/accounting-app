import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsBoolean, IsObject, IsOptional } from 'class-validator';

import { NotificationTypePreferences } from '@accounting/common';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Enable in-app notifications' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Receive on create events' })
  @IsOptional()
  @IsBoolean()
  receiveOnCreate?: boolean;

  @ApiPropertyOptional({ description: 'Receive on update events' })
  @IsOptional()
  @IsBoolean()
  receiveOnUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Receive on delete events' })
  @IsOptional()
  @IsBoolean()
  receiveOnDelete?: boolean;

  @ApiPropertyOptional({ description: 'Receive on task completed events' })
  @IsOptional()
  @IsBoolean()
  receiveOnTaskCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Receive on task overdue events' })
  @IsOptional()
  @IsBoolean()
  receiveOnTaskOverdue?: boolean;

  @ApiPropertyOptional({ description: 'Per-type notification preferences' })
  @IsOptional()
  @IsObject()
  typePreferences?: NotificationTypePreferences;
}

export class UpdateModuleNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Enable in-app notifications for this module' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications for this module' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Per-type notification preferences for this module' })
  @IsOptional()
  @IsObject()
  typePreferences?: NotificationTypePreferences;
}
