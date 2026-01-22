import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { NotificationData, NotificationType } from '@accounting/common';

/**
 * Valid module slugs for notifications.
 * Must match the module slugs defined in the system.
 */
export const VALID_MODULE_SLUGS = [
  'tasks',
  'clients',
  'time-tracking',
  'email-client',
  'ai-agent',
  'company',
  'system',
] as const;

export type ValidModuleSlug = (typeof VALID_MODULE_SLUGS)[number];

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    description: 'Module slug (e.g., tasks, clients)',
    enum: VALID_MODULE_SLUGS,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_MODULE_SLUGS, {
    message: `moduleSlug must be one of: ${VALID_MODULE_SLUGS.join(', ')}`,
  })
  @MaxLength(100)
  moduleSlug!: string;

  @ApiProperty({ description: 'Notification title', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Additional data (JSON)' })
  @IsOptional()
  @IsObject()
  data?: NotificationData;

  @ApiPropertyOptional({ description: 'Action URL when clicked', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Actor user ID (who triggered the notification)' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Is this a batch notification', default: false })
  @IsOptional()
  @IsBoolean()
  isBatch?: boolean;

  @ApiPropertyOptional({ description: 'Number of items in batch', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  itemCount?: number;
}

export class CreateBatchNotificationDto extends CreateNotificationDto {
  @ApiProperty({ description: 'Is this a batch notification', default: true })
  @IsBoolean()
  declare isBatch: boolean;

  @ApiProperty({ description: 'Number of items in batch', minimum: 1 })
  @IsInt()
  @Min(1)
  declare itemCount: number;

  constructor() {
    super();
    this.isBatch = true;
  }
}
