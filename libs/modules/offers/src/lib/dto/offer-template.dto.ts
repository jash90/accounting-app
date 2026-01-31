import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Sanitize } from '@accounting/common';

export class OfferPlaceholderDto {
  @ApiProperty({ description: 'Placeholder key (e.g., "nazwa", "nip")' })
  @IsString()
  @MaxLength(50)
  key!: string;

  @ApiProperty({ description: 'Display label for the placeholder' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ description: 'Description of the placeholder' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Default value for the placeholder' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;
}

export class OfferServiceItemDto {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Unit price (net)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice!: number;

  @ApiProperty({ description: 'Quantity', default: 1 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit (e.g., "szt.", "godz.", "mies.")' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;
}

export class CreateOfferTemplateDto {
  @ApiProperty({ description: 'Template name', minLength: 2, maxLength: 255 })
  @Sanitize()
  @IsString()
  @MinLength(2, { message: 'Nazwa musi mieć minimum 2 znaki' })
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @Sanitize()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Available placeholders for mail merge',
    type: [OfferPlaceholderDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferPlaceholderDto)
  availablePlaceholders?: OfferPlaceholderDto[];

  @ApiPropertyOptional({ description: 'Default service items', type: [OfferServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferServiceItemDto)
  defaultServiceItems?: OfferServiceItemDto[];

  @ApiPropertyOptional({ description: 'Default validity in days', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  defaultValidityDays?: number;

  @ApiPropertyOptional({ description: 'Default VAT rate (%)', default: 23 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  defaultVatRate?: number;

  @ApiPropertyOptional({ description: 'Set as default template', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateOfferTemplateDto extends PartialType(CreateOfferTemplateDto) {
  @ApiPropertyOptional({ description: 'Set template as active/inactive' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class OfferTemplateFiltersDto {
  @ApiPropertyOptional({ description: 'Search query', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
