import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import sanitizeHtml from 'sanitize-html';

import { CustomFieldType, Sanitize } from '@accounting/common';

export class CreateFieldDefinitionDto {
  @ApiProperty({ description: 'Field name (internal identifier)', minLength: 1, maxLength: 100 })
  @Sanitize()
  @IsString()
  @MinLength(1, { message: 'Nazwa pola jest wymagana' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Field label (display name)', minLength: 1, maxLength: 255 })
  @Sanitize()
  @IsString()
  @MinLength(1, { message: 'Etykieta pola jest wymagana' })
  @MaxLength(255)
  label!: string;

  @ApiProperty({ enum: CustomFieldType, description: 'Field type' })
  @IsEnum(CustomFieldType)
  fieldType!: CustomFieldType;

  @ApiPropertyOptional({ description: 'Is field required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Values for ENUM field type (required for ENUM/MULTISELECT types, max 50 values)',
    maxItems: 50,
  })
  @ValidateIf(
    (o) => o.fieldType === CustomFieldType.ENUM || o.fieldType === CustomFieldType.MULTISELECT
  )
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) =>
        typeof v === 'string'
          ? sanitizeHtml(v, {
              allowedTags: [],
              allowedAttributes: {},
              textFilter: (text) => text.trim(),
            })
          : v
      );
    }
    return value;
  })
  @IsArray({ message: 'ENUM/MULTISELECT fields require enumValues array' })
  @ArrayMinSize(1, { message: 'At least one enum value is required' })
  @ArrayMaxSize(50, { message: 'Maksymalna liczba wartości ENUM to 50' })
  @IsString({ each: true })
  enumValues?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateFieldDefinitionDto extends PartialType(CreateFieldDefinitionDto) {}

export class SetCustomFieldValueDto {
  @ApiProperty({ description: 'Field definition ID' })
  @IsString()
  fieldDefinitionId!: string;

  @ApiProperty({ description: 'Field value', nullable: true })
  @IsOptional()
  @Sanitize()
  @ValidateIf((o) => o.value !== null)
  @IsString()
  value?: string | null;
}

export class FieldDefinitionQueryDto {
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
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

/**
 * Response DTO for field definition
 */
export class FieldDefinitionResponseDto {
  @ApiProperty({
    description: 'Unique field definition identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Field name (internal identifier)',
    example: 'contract_number',
  })
  name!: string;

  @ApiProperty({
    description: 'Field label (display name)',
    example: 'Contract Number',
  })
  label!: string;

  @ApiProperty({
    enum: CustomFieldType,
    description: 'Field type defining the data format',
    example: CustomFieldType.TEXT,
  })
  fieldType!: CustomFieldType;

  @ApiProperty({
    description: 'Whether this field is required for clients',
    example: false,
  })
  isRequired!: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Allowed values for ENUM/MULTISELECT fields',
    example: ['Option A', 'Option B', 'Option C'],
  })
  enumValues?: string[];

  @ApiProperty({
    description: 'Display order for sorting fields in UI',
    example: 0,
  })
  displayOrder!: number;

  @ApiProperty({
    description: 'Company ID that owns this field definition',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-06-20T14:45:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Paginated response for field definition list
 */
export class PaginatedFieldDefinitionsResponseDto {
  @ApiProperty({
    type: [FieldDefinitionResponseDto],
    description: 'Array of field definitions',
  })
  data!: FieldDefinitionResponseDto[];

  @ApiProperty({
    description: 'Total number of field definitions',
    example: 10,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages!: number;
}
