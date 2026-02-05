import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { Sanitize, TimeEntryStatus } from '@accounting/common';

export class CreateTimeEntryDto {
  @ApiPropertyOptional({ description: 'Description of the time entry', maxLength: 255 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: 'Start time (ISO 8601)', example: '2026-01-18T09:00:00Z' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)', example: '2026-01-18T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes (optional if endTime provided)',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt({ message: 'Czas trwania musi być liczbą całkowitą' })
  @Min(0, { message: 'Czas trwania nie może być ujemny' })
  @Max(1440, { message: 'Czas trwania nie może przekraczać 24 godzin (1440 minut)' })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Is this entry billable', default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Hourly rate for billing', minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Stawka godzinowa musi być liczbą' })
  @Min(0, { message: 'Stawka godzinowa nie może być ujemna' })
  @Max(10000, { message: 'Stawka godzinowa nie może przekraczać 10000' })
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'PLN', maxLength: 3 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid 3-letter ISO 4217 code (e.g., PLN, USD, EUR)',
  })
  currency?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray({ message: 'Tagi muszą być tablicą' })
  @ArrayMaxSize(10, { message: 'Maksymalnie 10 tagów dozwolonych' })
  @Transform(({ value }) => value?.map((t: string) => t.trim()).filter((t: string) => t.length > 0))
  @IsString({ each: true, message: 'Każdy tag musi być tekstem' })
  @MaxLength(50, { each: true, message: 'Każdy tag może mieć maksymalnie 50 znaków' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Associated client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Associated task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {}

export class TimeEntryFiltersDto {
  @ApiPropertyOptional({ description: 'Search in description', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: TimeEntryStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;

  @ApiPropertyOptional({
    enum: TimeEntryStatus,
    isArray: true,
    description: 'Filter by multiple statuses',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TimeEntryStatus, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  statuses?: TimeEntryStatus[];

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filter by billable status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Filter entries starting from this date' })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter entries starting until this date' })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// SubmitTimeEntryDto and ApproveTimeEntryDto are intentionally empty classes.
// They exist to provide extensibility points for future features like submission/approval notes.
// The API endpoints accept these DTOs even though they currently have no properties.
export class SubmitTimeEntryDto {}

export class ApproveTimeEntryDto {}

export class RejectTimeEntryDto {
  @ApiProperty({ description: 'Reason for rejection', maxLength: 500 })
  @IsNotEmpty({ message: 'Powód odrzucenia jest wymagany' })
  @Sanitize()
  @IsString()
  @MaxLength(500)
  rejectionNote!: string;
}

export class BulkApproveDto {
  @ApiProperty({ description: 'Time entry IDs to approve (max 100)', type: [String] })
  @IsArray({ message: 'Identyfikatory wpisów muszą być tablicą' })
  @ArrayMinSize(1, { message: 'Wymagany jest co najmniej jeden identyfikator wpisu' })
  @ArrayMaxSize(100, { message: 'Nie można przetwarzać więcej niż 100 wpisów naraz' })
  @IsUUID('4', { each: true, message: 'Każdy identyfikator musi być prawidłowym UUID' })
  entryIds!: string[];
}

export class BulkRejectDto {
  @ApiProperty({ description: 'Time entry IDs to reject (max 100)', type: [String] })
  @IsArray({ message: 'Identyfikatory wpisów muszą być tablicą' })
  @ArrayMinSize(1, { message: 'Wymagany jest co najmniej jeden identyfikator wpisu' })
  @ArrayMaxSize(100, { message: 'Nie można przetwarzać więcej niż 100 wpisów naraz' })
  @IsUUID('4', { each: true, message: 'Każdy identyfikator musi być prawidłowym UUID' })
  entryIds!: string[];

  @ApiProperty({ description: 'Reason for rejection', maxLength: 500 })
  @IsNotEmpty({ message: 'Powód odrzucenia jest wymagany' })
  @Sanitize()
  @IsString()
  @MaxLength(500)
  rejectionNote!: string;
}

export class LockTimeEntryDto {
  @ApiPropertyOptional({ description: 'Optional reason for locking', maxLength: 500 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UnlockTimeEntryDto {
  @ApiPropertyOptional({ description: 'Optional reason for unlocking', maxLength: 500 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
