import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { Sanitize, ZusContributionStatus } from '@accounting/common';

export class CreateZusContributionDto {
  @ApiProperty({ description: 'Client ID' })
  @IsUUID('4', { message: 'Nieprawidłowy format ID klienta' })
  clientId!: string;

  @ApiProperty({ description: 'Period month (1-12)', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1, { message: 'Miesiąc musi być między 1 a 12' })
  @Max(12, { message: 'Miesiąc musi być między 1 a 12' })
  periodMonth!: number;

  @ApiProperty({ description: 'Period year', minimum: 2020 })
  @IsInt()
  @Min(2020, { message: 'Rok musi być co najmniej 2020' })
  periodYear!: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @Sanitize()
  @IsString()
  notes?: string;
}

export class UpdateZusContributionDto extends PartialType(CreateZusContributionDto) {
  @ApiPropertyOptional({ enum: ZusContributionStatus })
  @IsOptional()
  @IsEnum(ZusContributionStatus)
  status?: ZusContributionStatus;
}

export class CalculateZusContributionDto {
  @ApiProperty({ description: 'Client ID' })
  @IsUUID('4', { message: 'Nieprawidłowy format ID klienta' })
  clientId!: string;

  @ApiProperty({ description: 'Period month (1-12)', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({ description: 'Period year', minimum: 2020 })
  @IsInt()
  @Min(2020)
  periodYear!: number;

  @ApiPropertyOptional({
    description: 'Custom health basis (income) for calculation in grosze',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  healthBasis?: number;
}

export class GenerateMonthlyContributionsDto {
  @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1, { message: 'Miesiąc musi być między 1 a 12' })
  @Max(12, { message: 'Miesiąc musi być między 1 a 12' })
  month!: number;

  @ApiProperty({ description: 'Year', minimum: 2020 })
  @IsInt()
  @Min(2020, { message: 'Rok musi być co najmniej 2020' })
  year!: number;
}

export class MarkPaidDto {
  @ApiProperty({ description: 'Date of payment (ISO date string)' })
  @IsDateString({}, { message: 'Nieprawidłowy format daty' })
  paidDate!: string;
}

export class ZusContributionFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by period month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({ description: 'Filter by period year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  periodYear?: number;

  @ApiPropertyOptional({ enum: ZusContributionStatus })
  @IsOptional()
  @IsEnum(ZusContributionStatus)
  status?: ZusContributionStatus;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @Sanitize()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
