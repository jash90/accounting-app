import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { LeadSource, LeadStatus, Sanitize } from '@accounting/common';

export class CreateLeadDto {
  @ApiProperty({ description: 'Company name', minLength: 2, maxLength: 255 })
  @Sanitize()
  @IsString()
  @MinLength(2, { message: 'Nazwa musi mieć minimum 2 znaki' })
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'NIP (Tax Identification Number) - 10 digits' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'NIP musi składać się z 10 cyfr' })
  nip?: string;

  @ApiPropertyOptional({ description: 'REGON - 9 or 14 digits' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @Matches(/^(\d{9}|\d{14})$/, { message: 'REGON musi składać się z 9 lub 14 cyfr' })
  regon?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Polska' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Contact person position' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  contactPosition?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @Sanitize()
  @IsEmail({}, { message: 'Nieprawidłowy format adresu email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ enum: LeadSource, description: 'Lead source' })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @Sanitize()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Estimated value of potential deal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedValue?: number;

  @ApiPropertyOptional({ description: 'Assigned employee ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID użytkownika' })
  assignedToId?: string;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ enum: LeadStatus, description: 'Lead status' })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

export class LeadFiltersDto {
  @ApiPropertyOptional({ description: 'Search query', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Created from date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Created to date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

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

export class ConvertLeadToClientDto {
  @ApiPropertyOptional({ description: 'Override company name for client' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  clientName?: string;
}
