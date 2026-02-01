import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { Sanitize, ZusContributionStatus, type ZusContributionTarget } from '@accounting/common';

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

  @ApiPropertyOptional({
    description: 'Filter by contribution type (OWNER or EMPLOYEE)',
    enum: ZusContributionTarget,
  })
  @IsOptional()
  @IsEnum(ZusContributionTarget)
  contributionType?: ZusContributionTarget;

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

/**
 * DTO for calculating employee ZUS contributions
 */
export class CalculateEmployeeContributionsDto {
  @ApiProperty({ description: 'Client ID' })
  @IsUUID('4', { message: 'Nieprawidłowy format ID klienta' })
  clientId!: string;

  @ApiProperty({ description: 'List of employee IDs to calculate contributions for' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Wybierz co najmniej jednego pracownika' })
  @IsUUID('4', { each: true, message: 'Nieprawidłowy format ID pracownika' })
  employeeIds!: string[];

  @ApiProperty({ description: 'Period month (1-12)', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1, { message: 'Miesiąc musi być między 1 a 12' })
  @Max(12, { message: 'Miesiąc musi być między 1 a 12' })
  periodMonth!: number;

  @ApiProperty({ description: 'Period year', minimum: 2020 })
  @IsInt()
  @Min(2020, { message: 'Rok musi być co najmniej 2020' })
  periodYear!: number;
}

/**
 * DTO for bulk contribution calculation result
 */
export class BulkContributionResultDto {
  @ApiProperty({ description: 'Number of contributions successfully created' })
  created!: number;

  @ApiProperty({ description: 'Number of contributions skipped (already exist)' })
  skipped!: number;

  @ApiProperty({ description: 'Number of employees exempt from ZUS' })
  exempt!: number;

  @ApiProperty({ description: 'Number of errors' })
  errors!: number;

  @ApiProperty({ description: 'List of created contribution IDs' })
  contributionIds!: string[];

  @ApiProperty({ description: 'Error messages if any' })
  errorMessages!: string[];
}
