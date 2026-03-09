import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AutoAssignRuleDto {
  @ApiProperty({ description: 'Client ID to auto-assign' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ description: 'User ID to assign the client to' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Default rule applied when no specific rule matches' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateSettlementSettingsDto {
  @ApiPropertyOptional({
    description: 'Default priority for new settlements (0-3)',
    minimum: 0,
    maximum: 3,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  defaultPriority?: number;

  @ApiPropertyOptional({
    description: 'Day of month for automatic deadline (1-31), null to disable',
    nullable: true,
  })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  defaultDeadlineDay?: number | null;

  @ApiPropertyOptional({ description: 'Enable automatic assignment of settlements' })
  @IsBoolean()
  @IsOptional()
  autoAssignEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-assign rules per client',
    type: [AutoAssignRuleDto],
    nullable: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoAssignRuleDto)
  @IsOptional()
  autoAssignRules?: AutoAssignRuleDto[] | null;

  @ApiPropertyOptional({ description: 'Send notification when settlement status changes' })
  @IsBoolean()
  @IsOptional()
  notifyOnStatusChange?: boolean;

  @ApiPropertyOptional({ description: 'Send notification when settlement deadline is approaching' })
  @IsBoolean()
  @IsOptional()
  notifyOnDeadlineApproaching?: boolean;

  @ApiPropertyOptional({
    description: 'Number of days before deadline to send warning notification',
    minimum: 1,
    maximum: 14,
  })
  @IsInt()
  @Min(1)
  @Max(14)
  @IsOptional()
  deadlineWarningDays?: number;
}

export class SettlementSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ description: 'Default priority (0-3)' })
  defaultPriority!: number;

  @ApiPropertyOptional({ nullable: true })
  defaultDeadlineDay?: number | null;

  @ApiProperty()
  autoAssignEnabled!: boolean;

  @ApiPropertyOptional({ type: [AutoAssignRuleDto], nullable: true })
  autoAssignRules?: AutoAssignRuleDto[] | null;

  @ApiProperty()
  notifyOnStatusChange!: boolean;

  @ApiProperty()
  notifyOnDeadlineApproaching!: boolean;

  @ApiProperty()
  deadlineWarningDays!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
