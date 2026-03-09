import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { TimeRoundingMethod } from '@accounting/common';

export class UpdateTimeSettingsDto {
  @ApiPropertyOptional({ enum: TimeRoundingMethod, default: TimeRoundingMethod.NONE })
  @IsOptional()
  @IsEnum(TimeRoundingMethod)
  roundingMethod?: TimeRoundingMethod;

  @ApiPropertyOptional({
    description: 'Rounding interval in minutes',
    default: 15,
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  roundingIntervalMinutes?: number;

  @ApiPropertyOptional({ description: 'Default hourly rate', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Default currency code (ISO 4217)',
    default: 'PLN',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Require approval for time entries', default: false })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({ description: 'Allow overlapping time entries', default: true })
  @IsOptional()
  @IsBoolean()
  allowOverlappingEntries?: boolean;

  @ApiPropertyOptional({
    description: 'Working hours per day',
    default: 8,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  workingHoursPerDay?: number;

  @ApiPropertyOptional({
    description: 'Working hours per week',
    default: 40,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  workingHoursPerWeek?: number;

  @ApiPropertyOptional({
    description: 'First day of week (0=Sunday, 1=Monday, etc.)',
    default: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartDay?: number;

  @ApiPropertyOptional({ description: 'Allow timer mode', default: true })
  @IsOptional()
  @IsBoolean()
  allowTimerMode?: boolean;

  @ApiPropertyOptional({ description: 'Allow manual entry', default: true })
  @IsOptional()
  @IsBoolean()
  allowManualEntry?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-stop timer after X minutes (0=disabled)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  autoStopTimerAfterMinutes?: number;

  @ApiPropertyOptional({
    description: 'Minimum entry duration in minutes (0=no minimum)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumEntryMinutes?: number;

  @ApiPropertyOptional({
    description: 'Maximum entry duration in minutes (0=no maximum)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maximumEntryMinutes?: number;

  @ApiPropertyOptional({ description: 'Enable daily reminder', default: false })
  @IsOptional()
  @IsBoolean()
  enableDailyReminder?: boolean;

  @ApiPropertyOptional({ description: 'Daily reminder time (HH:MM format)', example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Godzina musi być w formacie HH:MM' })
  dailyReminderTime?: string;

  @ApiPropertyOptional({
    description: 'Lock entries older than X days (0=disabled)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lockEntriesAfterDays?: number;
}
