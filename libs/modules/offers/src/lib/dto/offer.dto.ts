import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { OfferStatus, Sanitize, SanitizeWithFormatting } from '@accounting/common';

import { OfferServiceItemDto } from './offer-template.dto';

@ValidatorConstraint({ name: 'customPlaceholders', async: false })
class CustomPlaceholdersConstraint implements ValidatorConstraintInterface {
  validate(value: Record<string, string>): boolean {
    if (!value || typeof value !== 'object') return true;
    const keys = Object.keys(value);
    if (keys.length > 50) return false;
    return keys.every((key) => typeof value[key] === 'string' && value[key].length <= 1000);
  }

  defaultMessage(): string {
    return 'customPlaceholders może zawierać maksymalnie 50 kluczy, a każda wartość max 1000 znaków';
  }
}

export class ServiceTermsDto {
  @ApiProperty({ description: 'Service items', type: [OfferServiceItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Oferta musi zawierać co najmniej jedną pozycję' })
  @ValidateNested({ each: true })
  @Type(() => OfferServiceItemDto)
  items!: OfferServiceItemDto[];

  @ApiPropertyOptional({ description: 'Payment term in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: 'Payment method (e.g., "przelew", "gotówka")' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Additional terms and conditions' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  additionalTerms?: string;
}

export class CreateOfferDto {
  @ApiProperty({ description: 'Offer title', minLength: 2, maxLength: 255 })
  @Sanitize()
  @IsString()
  @MinLength(2, { message: 'Tytuł musi mieć minimum 2 znaki' })
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Offer description' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Existing client ID (if sending to existing client)' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID klienta' })
  clientId?: string;

  @ApiPropertyOptional({ description: 'Lead ID (if sending to a lead)' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID leada' })
  leadId?: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID szablonu' })
  templateId?: string;

  @ApiPropertyOptional({ description: 'VAT rate (%)', default: 23 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Service terms and items' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTermsDto)
  serviceTerms?: ServiceTermsDto;

  @ApiPropertyOptional({
    description: 'Custom placeholder values for mail merge (max 50 keys, max 1000 chars per value)',
  })
  @IsOptional()
  @IsObject()
  @Validate(CustomPlaceholdersConstraint)
  customPlaceholders?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Offer date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  offerDate?: string;

  @ApiPropertyOptional({ description: 'Valid until date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Validity in days (used if validUntil not provided)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  validityDays?: number;
}

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

export class UpdateOfferStatusDto {
  @ApiProperty({ enum: OfferStatus, description: 'New status' })
  @IsEnum(OfferStatus)
  status!: OfferStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SendOfferDto {
  @ApiProperty({ description: 'Recipient email address' })
  @Sanitize()
  @IsEmail({}, { message: 'Nieprawidłowy format adresu email' })
  email!: string;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ description: 'Email body' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @ApiPropertyOptional({ description: 'CC recipients (max 10)', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maksymalnie 10 adresów CC' })
  @IsEmail({}, { each: true, message: 'Nieprawidłowy format adresu email w CC' })
  cc?: string[];
}

export class OfferFiltersDto {
  @ApiPropertyOptional({ description: 'Search query', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: OfferStatus })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @ApiPropertyOptional({ enum: OfferStatus, isArray: true, description: 'Multiple statuses' })
  @IsOptional()
  @IsArray()
  @IsEnum(OfferStatus, { each: true })
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    return Array.isArray(value) ? value.filter((v: string) => v !== '') : [value];
  })
  statuses?: OfferStatus[];

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by lead ID' })
  @IsOptional()
  @IsUUID('4')
  leadId?: string;

  @ApiPropertyOptional({ description: 'Offer date from (ISO date string)' })
  @IsOptional()
  @IsDateString()
  offerDateFrom?: string;

  @ApiPropertyOptional({ description: 'Offer date to (ISO date string)' })
  @IsOptional()
  @IsDateString()
  offerDateTo?: string;

  @ApiPropertyOptional({ description: 'Valid until from (ISO date string)' })
  @IsOptional()
  @IsDateString()
  validUntilFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until to (ISO date string)' })
  @IsOptional()
  @IsDateString()
  validUntilTo?: string;

  @ApiPropertyOptional({ description: 'Minimum total net amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total net amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DuplicateOfferDto {
  @ApiPropertyOptional({ description: 'New recipient client ID' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'New recipient lead ID' })
  @IsOptional()
  @IsUUID('4')
  leadId?: string;

  @ApiPropertyOptional({ description: 'New offer title' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  title?: string;
}
