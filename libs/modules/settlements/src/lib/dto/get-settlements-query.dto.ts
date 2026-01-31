import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { SettlementStatus, TaxScheme } from '@accounting/common';

export class GetSettlementsQueryDto {
  @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', minimum: 2020 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
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

  @ApiPropertyOptional({ description: 'Sort by field', default: 'client.name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

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

  @ApiProperty({ description: 'Year', minimum: 2020 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year!: number;
}
