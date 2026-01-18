import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TimeEntryStatus, Sanitize } from '@accounting/common';

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

  @ApiPropertyOptional({ description: 'Duration in minutes (optional if endTime provided)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Is this entry billable', default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Hourly rate for billing', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'PLN', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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

  @ApiPropertyOptional({ enum: TimeEntryStatus, isArray: true, description: 'Filter by multiple statuses' })
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
  limit?: number = 20;
}

export class SubmitTimeEntryDto {
  @ApiPropertyOptional({ description: 'Optional note when submitting' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ApproveTimeEntryDto {
  @ApiPropertyOptional({ description: 'Optional note when approving' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectTimeEntryDto {
  @ApiProperty({ description: 'Reason for rejection', maxLength: 500 })
  @Sanitize()
  @IsString()
  @MaxLength(500)
  rejectionNote!: string;
}

export class BulkApproveDto {
  @ApiProperty({ description: 'Time entry IDs to approve', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  entryIds!: string[];
}

export class BulkRejectDto {
  @ApiProperty({ description: 'Time entry IDs to reject', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  entryIds!: string[];

  @ApiProperty({ description: 'Reason for rejection', maxLength: 500 })
  @Sanitize()
  @IsString()
  @MaxLength(500)
  rejectionNote!: string;
}
