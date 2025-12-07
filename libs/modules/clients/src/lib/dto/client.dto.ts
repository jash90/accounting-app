import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
} from '@accounting/common';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'NIP (Tax Identification Number)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nip?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
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
  @IsString()
  companySpecificity?: string;

  @ApiPropertyOptional({ description: 'Additional information' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'GTU code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gtuCode?: string;

  @ApiPropertyOptional({ description: 'AML group' })
  @IsOptional()
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
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientFiltersDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class SetClientIconsDto {
  @ApiProperty({ type: [String], description: 'Array of icon IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  iconIds!: string[];
}

export class SetCustomFieldValuesDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    description: 'Object mapping field definition IDs to values',
  })
  values!: Record<string, string | null>;
}
