import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { Sanitize } from '@accounting/common';

export class CreateTaskLabelDto {
  @ApiProperty({ description: 'Label name', minLength: 1, maxLength: 50 })
  @Sanitize()
  @IsString()
  @MinLength(1, { message: 'Nazwa etykiety jest wymagana' })
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    description: 'Label color in hex format',
    example: '#6366f1',
    default: '#6366f1',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Kolor musi być w formacie hex (#RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({ description: 'Label description', maxLength: 255 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateTaskLabelDto extends PartialType(CreateTaskLabelDto) {}
