import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { TaskPriority } from '@accounting/common';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export class RecurrencePatternDto {
  @ApiProperty({ enum: ['daily', 'weekly', 'monthly'] })
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency!: RecurrenceFrequency;

  @ApiProperty({ description: 'Every N periods', minimum: 1 })
  @IsInt()
  @Min(1)
  interval!: number;

  @ApiPropertyOptional({
    description: 'Days of week for weekly recurrence (0=Sun, 6=Sat)',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of month for monthly recurrence (1-31)',
    minimum: 1,
    maximum: 31,
  })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'End date for recurrence (ISO date string)' })
  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum number of occurrences', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxOccurrences?: number;
}

export class CreateTaskTemplateDto {
  @ApiProperty({ description: 'Template title' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Default assignee ID' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Default client ID' })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Recurrence pattern', type: RecurrencePatternDto })
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  @IsOptional()
  recurrencePattern?: RecurrencePatternDto;

  @ApiPropertyOptional({ description: 'Recurrence end date (ISO date)' })
  @IsISO8601()
  @IsOptional()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedMinutes?: number;
}

export class UpdateTaskTemplateDto {
  @ApiPropertyOptional({ description: 'Template title' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Default assignee ID' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Default client ID' })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Recurrence pattern', type: RecurrencePatternDto })
  @IsOptional()
  recurrencePattern?: RecurrencePatternDto | null;

  @ApiPropertyOptional({ description: 'Recurrence end date (ISO date)', nullable: true })
  @IsISO8601()
  @IsOptional()
  recurrenceEndDate?: string | null;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedMinutes?: number;
}

export class TaskTemplateFiltersDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
