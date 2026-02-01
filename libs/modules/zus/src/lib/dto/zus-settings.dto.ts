import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { HealthContributionType, ZusClientSettings, ZusDiscountType } from '@accounting/common';

export class UpdateZusSettingsDto {
  @ApiPropertyOptional({ enum: ZusDiscountType })
  @IsOptional()
  @IsEnum(ZusDiscountType)
  discountType?: ZusDiscountType;

  @ApiPropertyOptional({ description: 'Discount start date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @ApiPropertyOptional({ description: 'Discount end date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @ApiPropertyOptional({ enum: HealthContributionType })
  @IsOptional()
  @IsEnum(HealthContributionType)
  healthContributionType?: HealthContributionType;

  @ApiPropertyOptional({ description: 'Opt-in for voluntary sickness insurance' })
  @IsOptional()
  @IsBoolean()
  sicknessInsuranceOptIn?: boolean;

  @ApiPropertyOptional({
    description: 'Payment day of month (10, 15, or 20)',
    minimum: 10,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10, { message: 'Dzień płatności musi być 10, 15 lub 20' })
  @Max(20, { message: 'Dzień płatności musi być 10, 15 lub 20' })
  paymentDay?: number;

  @ApiPropertyOptional({
    description: 'Custom accident insurance rate (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  accidentRate?: number;
}

export class ZusSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty({ enum: ZusDiscountType })
  discountType!: ZusDiscountType;

  @ApiPropertyOptional()
  discountStartDate?: string;

  @ApiPropertyOptional()
  discountEndDate?: string;

  @ApiProperty({ enum: HealthContributionType })
  healthContributionType!: HealthContributionType;

  @ApiProperty()
  sicknessInsuranceOptIn!: boolean;

  @ApiProperty()
  paymentDay!: number;

  @ApiProperty()
  accidentRate!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  /**
   * Maps entity to response DTO
   */
  static fromEntity(entity: ZusClientSettings): ZusSettingsResponseDto {
    const dto = new ZusSettingsResponseDto();

    dto.id = entity.id;
    dto.clientId = entity.clientId;
    dto.discountType = entity.discountType;
    dto.discountStartDate = entity.discountStartDate
      ? (entity.discountStartDate?.toISOString?.() ?? String(entity.discountStartDate))
      : undefined;
    dto.discountEndDate = entity.discountEndDate
      ? (entity.discountEndDate?.toISOString?.() ?? String(entity.discountEndDate))
      : undefined;
    dto.healthContributionType = entity.healthContributionType;
    dto.sicknessInsuranceOptIn = entity.sicknessInsuranceOptIn;
    dto.paymentDay = entity.paymentDay;
    dto.accidentRate = Number(entity.accidentRate);
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt?.toISOString?.() ?? String(entity.createdAt);
    dto.updatedAt = entity.updatedAt?.toISOString?.() ?? String(entity.updatedAt);

    return dto;
  }
}

export class ZusRatesResponseDto {
  @ApiProperty({ description: 'Podstawa pełnego ZUS (grosze)' })
  fullBasis!: number;

  @ApiProperty({ description: 'Podstawa małego ZUS (grosze)' })
  smallZusBasis!: number;

  @ApiProperty({ description: 'Minimalne wynagrodzenie (grosze)' })
  minimumWage!: number;

  @ApiProperty({ description: 'Prognozowane przeciętne wynagrodzenie (grosze)' })
  averageWage!: number;

  @ApiProperty({ description: 'Minimalna składka zdrowotna (grosze)' })
  healthMin!: number;

  @ApiProperty({ description: 'Ryczałt - próg 1 (grosze)' })
  lumpSumTier1!: number;

  @ApiProperty({ description: 'Ryczałt - próg 2 (grosze)' })
  lumpSumTier2!: number;

  @ApiProperty({ description: 'Ryczałt - próg 3 (grosze)' })
  lumpSumTier3!: number;

  // Formatted PLN values
  @ApiProperty({ description: 'Podstawa pełnego ZUS (PLN)' })
  fullBasisPln!: string;

  @ApiProperty({ description: 'Podstawa małego ZUS (PLN)' })
  smallZusBasisPln!: string;

  @ApiProperty({ description: 'Minimalne wynagrodzenie (PLN)' })
  minimumWagePln!: string;

  @ApiProperty({ description: 'Minimalna składka zdrowotna (PLN)' })
  healthMinPln!: string;
}
