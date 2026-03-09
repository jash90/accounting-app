import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Maximum allowed date range in days to prevent excessive queries
const MAX_DATE_RANGE_DAYS = 366;

/**
 * Custom validator to ensure date range is valid:
 * - startDate must be before endDate
 * - Range cannot exceed MAX_DATE_RANGE_DAYS
 */
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { startDate?: string; endDate?: string };
    if (!obj.startDate || !obj.endDate) return true;

    const start = new Date(obj.startDate);
    const end = new Date(obj.endDate);

    // startDate must be before endDate
    if (start >= end) return false;

    // Check range doesn't exceed maximum
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= MAX_DATE_RANGE_DAYS;
  }

  defaultMessage(): string {
    return `Data początkowa musi być wcześniejsza niż końcowa, zakres max ${MAX_DATE_RANGE_DAYS} dni`;
  }
}

export enum TimesheetGroupBy {
  DAY = 'day',
  CLIENT = 'client',
  TASK = 'task',
}

export class DailyTimesheetDto {
  @ApiProperty({ description: 'Date for daily timesheet (ISO 8601)', example: '2026-01-18' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (managers only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class WeeklyTimesheetDto {
  @ApiProperty({ description: 'Start date of the week (ISO 8601)', example: '2026-01-13' })
  @IsDateString()
  weekStart!: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (managers only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class MonthlyTimesheetDto {
  @ApiProperty({ description: 'Year', example: 2026, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ description: 'Month (1-12)', example: 1, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiPropertyOptional({ description: 'Filter by user ID (managers only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class ReportFiltersDto {
  @ApiProperty({ description: 'Start date for report (ISO 8601)', example: '2026-01-01' })
  @IsDateString()
  @Validate(IsValidDateRangeConstraint)
  startDate!: string;

  @ApiProperty({ description: 'End date for report (ISO 8601)', example: '2026-01-31' })
  @IsDateString()
  endDate!: string;

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

  @ApiPropertyOptional({ enum: TimesheetGroupBy, description: 'Group results by' })
  @IsOptional()
  @IsEnum(TimesheetGroupBy)
  groupBy?: TimesheetGroupBy;
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ExportFiltersDto extends ReportFiltersDto {
  @ApiProperty({ enum: ExportFormat, description: 'Export format' })
  @IsEnum(ExportFormat)
  format!: ExportFormat;
}
