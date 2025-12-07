import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CustomFieldType } from '@accounting/common';

export class CreateFieldDefinitionDto {
  @ApiProperty({ description: 'Field name (internal identifier)' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Field label (display name)' })
  @IsString()
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
    description: 'Values for ENUM field type',
  })
  @IsOptional()
  @IsArray()
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
  @IsString()
  value?: string | null;
}
