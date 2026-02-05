import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { SettlementStatus, TaxScheme } from '@accounting/common';

/**
 * Allowed sort fields for settlements query.
 * This enum prevents SQL injection via the sortBy parameter.
 */
export enum SettlementSortField {
  CLIENT_NAME = 'client.name',
  CLIENT_NIP = 'client.nip',
  STATUS = 'settlement.status',
  MONTH = 'settlement.month',
  YEAR = 'settlement.year',
  PRIORITY = 'settlement.priority',
  DEADLINE = 'settlement.deadline',
  CREATED_AT = 'settlement.createdAt',
  UPDATED_AT = 'settlement.updatedAt',
  ASSIGNEE_EMAIL = 'assignedUser.email',
  ASSIGNEE_FIRST_NAME = 'assignedUser.firstName',
  ASSIGNEE_LAST_NAME = 'assignedUser.lastName',
}

export class GetSettlementsQueryDto {
  @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', minimum: 2020, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ enum: SettlementStatus })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Show only unassigned settlements' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional({ description: 'Search by client name or NIP' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TaxScheme })
  @IsOptional()
  @IsEnum(TaxScheme)
  taxScheme?: TaxScheme;

  @ApiPropertyOptional({ description: 'Filter settlements requiring attention' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresAttention?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field (whitelist validated to prevent SQL injection)',
    default: SettlementSortField.CLIENT_NAME,
    enum: SettlementSortField,
  })
  @IsOptional()
  @IsEnum(SettlementSortField)
  sortBy?: SettlementSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MonthYearQueryDto {
  @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', minimum: 2020, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;
}
