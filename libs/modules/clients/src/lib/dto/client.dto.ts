import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type, Transform } from 'class-transformer';
import {
  Allow,
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
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
  Sanitize,
  SanitizeWithFormatting,
  PKD_CODE_REGEX,
  PKD_CODE_VALIDATION_MESSAGE,
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

  @ApiPropertyOptional({ description: 'GTU code (e.g., GTU_01)', example: 'GTU_01' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  @Matches(/^GTU_\d{2}$/, { message: 'Kod GTU musi być w formacie GTU_XX (np. GTU_01)' })
  gtuCode?: string;

  @ApiPropertyOptional({ description: 'PKD code (e.g., 62.01.Z)', example: '62.01.Z' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  @Matches(PKD_CODE_REGEX, { message: PKD_CODE_VALIDATION_MESSAGE })
  pkdCode?: string;

  @ApiPropertyOptional({ description: 'AML group (legacy string field)' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(50)
  amlGroup?: string;

  @ApiPropertyOptional({ enum: AmlGroup, description: 'AML group (enum)' })
  @IsOptional()
  @IsEnum(AmlGroup)
  amlGroupEnum?: AmlGroup;

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

/**
 * Valid operators for custom field filtering.
 * These operators determine how the field value is compared.
 */
export enum CustomFieldFilterOperator {
  /** Exact equality match */
  EQUALS = 'eq',
  /** Case-insensitive substring match */
  CONTAINS = 'contains',
  /** Greater than (for numbers and dates) */
  GREATER_THAN = 'gt',
  /** Greater than or equal (for numbers and dates) */
  GREATER_THAN_OR_EQUAL = 'gte',
  /** Less than (for numbers and dates) */
  LESS_THAN = 'lt',
  /** Less than or equal (for numbers and dates) */
  LESS_THAN_OR_EQUAL = 'lte',
  /** Value in list (for ENUM type) */
  IN = 'in',
  /** Any value matches (for MULTISELECT type) */
  CONTAINS_ANY = 'contains_any',
}

/**
 * Custom validator to sanitize string or array of strings
 */
function SanitizeFilterValue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'sanitizeFilterValue',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate() {
          // Validation always passes - transformation is done by Transform decorator
          return true;
        },
      },
    });
  };
}

/**
 * DTO for custom field filters used in client queries.
 * Validates fieldId, operator, and value.
 */
export class CustomFieldFilterDto {
  @ApiProperty({ description: 'Field definition ID' })
  @IsString()
  @IsUUID('4', { message: 'Nieprawidłowy format ID pola' })
  fieldId!: string;

  @ApiProperty({
    enum: CustomFieldFilterOperator,
    description: 'Filter operator',
    example: CustomFieldFilterOperator.EQUALS,
  })
  @IsEnum(CustomFieldFilterOperator, {
    message: `Operator musi być jednym z: ${Object.values(CustomFieldFilterOperator).join(', ')}`,
  })
  operator!: CustomFieldFilterOperator;

  @ApiProperty({
    description: 'Filter value (string or array for IN/CONTAINS_ANY operators)',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @Allow()
  @Transform(({ value }) => {
    // Sanitize value to prevent XSS - strip HTML tags and encode dangerous characters
    // Note: & is a valid business character (e.g., "Smith & Sons") so we preserve it
    const sanitizeString = (str: string): string => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, (char) => {
          // HTML encode dangerous characters (except &)
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          };
          return entities[char] || char;
        })
        .trim();
    };
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? sanitizeString(v) : v));
    }
    return typeof value === 'string' ? sanitizeString(value) : value;
  })
  @SanitizeFilterValue()
  value!: string | string[];
}

/**
 * @deprecated Use CustomFieldFilterDto instead. Kept for backwards compatibility.
 */
export type CustomFieldFilter = CustomFieldFilterDto;

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

  @ApiPropertyOptional({ description: 'GTU code filter (e.g., GTU_01)', example: 'GTU_01' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  @Matches(/^GTU_\d{2}$/, { message: 'Kod GTU musi być w formacie GTU_XX (np. GTU_01)' })
  gtuCode?: string;

  @ApiPropertyOptional({ description: 'PKD code filter (e.g., 62.01.Z)', example: '62.01.Z' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(10)
  @Matches(PKD_CODE_REGEX, { message: PKD_CODE_VALIDATION_MESSAGE })
  pkdCode?: string;

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
    description: 'Custom field filters',
    type: [CustomFieldFilterDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldFilterDto)
  customFieldFilters?: CustomFieldFilterDto[];

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

/**
 * Custom validator for limiting the number of properties in an object
 */
function MaxProperties(max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxProperties',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!value || typeof value !== 'object') return true;
          return Object.keys(value).length <= args.constraints[0];
        },
        defaultMessage(args: ValidationArguments) {
          return `Obiekt może mieć maksymalnie ${args.constraints[0]} właściwości`;
        },
      },
    });
  };
}

/**
 * Custom validator for limiting string value lengths in a Record
 */
function MaxValueLength(max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxValueLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!value || typeof value !== 'object') return true;
          return Object.values(value).every(
            (v) => v === null || (typeof v === 'string' && v.length <= args.constraints[0])
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `Wartości nie mogą przekraczać ${args.constraints[0]} znaków`;
        },
      },
    });
  };
}

export class SetCustomFieldValuesDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    description:
      'Object mapping field definition IDs to values (max 50 fields, max 1000 chars per value)',
  })
  @IsObject()
  @MaxProperties(50, { message: 'Maksymalnie 50 pól niestandardowych' })
  @MaxValueLength(1000, { message: 'Wartość pola nie może przekraczać 1000 znaków' })
  values!: Record<string, string | null>;
}
