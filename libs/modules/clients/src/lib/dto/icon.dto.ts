import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsUUID,
  IsEnum,
  ValidateNested,
  IsObject,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IconType, AutoAssignCondition, Sanitize } from '@accounting/common';

export class CreateIconDto {
  @ApiProperty({ description: 'Icon name', minLength: 1, maxLength: 100 })
  @Sanitize()
  @IsString()
  @MinLength(1, { message: 'Nazwa ikony jest wymagana' })
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Icon color in hex format (e.g., #FF5733)', example: '#FF5733' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Kolor musi być w formacie hex (np. #FF5733)' })
  color?: string;

  @ApiPropertyOptional({ description: 'Icon type', enum: IconType })
  @IsOptional()
  @IsEnum(IconType)
  iconType?: IconType;

  @ApiPropertyOptional({ description: 'Icon value (lucide icon name or emoji)' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  iconValue?: string;

  @ApiPropertyOptional({ description: 'Tooltip text displayed on hover' })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  tooltip?: string;

  @ApiPropertyOptional({ description: 'Auto-assign condition (JSON)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        // Return undefined for invalid JSON - let validation handle it
        return undefined;
      }
    }
    return value;
  })
  @IsObject()
  autoAssignCondition?: AutoAssignCondition | null;
}

export class UpdateIconDto extends PartialType(CreateIconDto) {}

export class AssignIconDto {
  @ApiProperty({ description: 'Client ID' })
  @IsUUID('4')
  clientId!: string;

  @ApiProperty({ description: 'Icon ID' })
  @IsUUID('4')
  iconId!: string;
}

export class IconQueryDto {
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
 * Response DTO for icon data
 */
export class IconResponseDto {
  @ApiProperty({
    description: 'Unique icon identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Icon display name',
    example: 'Important Client',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Icon color in hex format',
    example: '#FF5733',
  })
  color?: string;

  @ApiProperty({
    enum: IconType,
    description: 'Type of icon (lucide, custom, or emoji)',
    example: IconType.LUCIDE,
  })
  iconType!: IconType;

  @ApiPropertyOptional({
    description: 'Icon value (lucide icon name, emoji character, or custom identifier)',
    example: 'star',
  })
  iconValue?: string;

  @ApiPropertyOptional({
    description: 'Tooltip text displayed on hover',
    example: 'High priority client',
  })
  tooltip?: string;

  @ApiPropertyOptional({
    description: 'URL to the uploaded custom icon file',
    example: 'https://storage.example.com/icons/custom-icon.png',
  })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Auto-assign condition for automatic icon assignment to clients',
    example: { type: 'AND', conditions: [{ field: 'vatStatus', operator: 'equals', value: 'VAT_MONTHLY' }] },
  })
  autoAssignCondition?: AutoAssignCondition | null;

  @ApiProperty({
    description: 'Company ID that owns this icon',
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
 * Paginated response for icon list
 */
export class PaginatedIconsResponseDto {
  @ApiProperty({
    type: [IconResponseDto],
    description: 'Array of icons',
  })
  data!: IconResponseDto[];

  @ApiProperty({
    description: 'Total number of icons',
    example: 25,
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

/**
 * Response DTO for icon assignment
 */
export class IconAssignmentResponseDto {
  @ApiProperty({
    description: 'Assignment ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  id!: string;

  @ApiProperty({
    description: 'Client ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  clientId!: string;

  @ApiProperty({
    description: 'Icon ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  iconId!: string;

  @ApiProperty({
    description: 'Whether this assignment was created by auto-assign rules',
    example: false,
  })
  isAutoAssigned!: boolean;

  @ApiProperty({
    description: 'Assignment creation timestamp',
    example: '2024-06-20T14:45:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Response DTO for icon URL
 */
export class IconUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for accessing the icon file',
    example: 'https://storage.example.com/icons/custom-icon.png?signature=...',
  })
  url!: string;
}
