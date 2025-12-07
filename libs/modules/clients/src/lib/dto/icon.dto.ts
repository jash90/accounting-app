import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsEnum,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IconType, AutoAssignCondition } from '@accounting/common';

export class CreateIconDto {
  @ApiProperty({ description: 'Icon name' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Icon color (hex)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Icon type', enum: IconType })
  @IsOptional()
  @IsEnum(IconType)
  iconType?: IconType;

  @ApiPropertyOptional({ description: 'Icon value (lucide icon name or emoji)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  iconValue?: string;

  @ApiPropertyOptional({ description: 'Auto-assign condition (JSON)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
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
