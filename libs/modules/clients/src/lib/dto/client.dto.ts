import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  IsUUID,
  IsArray,
  IsObject,
  IsInt,
  Min,
  Max,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
  Sanitize,
  SanitizeWithFormatting,
} from '@accounting/common';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name', minLength: 2, maxLength: 255 })
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

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @Sanitize()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Company start date' })
  @IsOptional()
  @Type(() => Date)
  companyStartDate?: Date;

  @ApiPropertyOptional({ description: 'Cooperation start date' })
  @IsOptional()
  @Type(() => Date)
  cooperationStartDate?: Date;

  @ApiPropertyOptional({ description: 'Suspension date' })
  @IsOptional()
  @Type(() => Date)
  suspensionDate?: Date;

  @ApiPropertyOptional({ description: 'Company specificity notes' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  companySpecificity?: string;

  @ApiPropertyOptional({ description: 'Additional information' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'GTU code' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  gtuCode?: string;

  @ApiPropertyOptional({ description: 'AML group' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(50)
  amlGroup?: string;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: VatStatus, description: 'VAT status' })
  @IsOptional()
  @IsEnum(VatStatus)
  vatStatus?: VatStatus;

  @ApiPropertyOptional({ enum: TaxScheme, description: 'Tax scheme' })
  @IsOptional()
  @IsEnum(TaxScheme)
  taxScheme?: TaxScheme;

  @ApiPropertyOptional({ enum: ZusStatus, description: 'ZUS status' })
  @IsOptional()
  @IsEnum(ZusStatus)
  zusStatus?: ZusStatus;

  @ApiPropertyOptional({ description: 'Whether client should receive email copies' })
  @IsOptional()
  @IsBoolean()
  receiveEmailCopy?: boolean;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientFiltersDto {
  @ApiPropertyOptional({ description: 'Search query', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100, { message: 'Wyszukiwanie nie może przekraczać 100 znaków' })
  search?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: VatStatus })
  @IsOptional()
  @IsEnum(VatStatus)
  vatStatus?: VatStatus;

  @ApiPropertyOptional({ enum: TaxScheme })
  @IsOptional()
  @IsEnum(TaxScheme)
  taxScheme?: TaxScheme;

  @ApiPropertyOptional({ enum: ZusStatus })
  @IsOptional()
  @IsEnum(ZusStatus)
  zusStatus?: ZusStatus;

  @ApiPropertyOptional({ enum: AmlGroup, description: 'AML Group filter' })
  @IsOptional()
  @IsEnum(AmlGroup)
  amlGroupEnum?: AmlGroup;

  @ApiPropertyOptional({ description: 'GTU code filter' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  gtuCode?: string;

  @ApiPropertyOptional({ description: 'Filter by email copy preference' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  receiveEmailCopy?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Cooperation start date from (ISO date string)' })
  @IsOptional()
  @IsDateString()
  cooperationStartDateFrom?: string;

  @ApiPropertyOptional({ description: 'Cooperation start date to (ISO date string)' })
  @IsOptional()
  @IsDateString()
  cooperationStartDateTo?: string;

  @ApiPropertyOptional({ description: 'Company start date from (ISO date string)' })
  @IsOptional()
  @IsDateString()
  companyStartDateFrom?: string;

  @ApiPropertyOptional({ description: 'Company start date to (ISO date string)' })
  @IsOptional()
  @IsDateString()
  companyStartDateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
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
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SetCustomFieldValuesDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    description: 'Object mapping field definition IDs to values',
  })
  @IsObject()
  values!: Record<string, string | null>;
}
