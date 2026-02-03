import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { Sanitize } from '@accounting/common';

export class StartTimerDto {
  @ApiPropertyOptional({ description: 'Description of the time entry', maxLength: 255 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Is this entry billable', default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Hourly rate for billing', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'PLN', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Associated client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Associated task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

export class StopTimerDto {
  @ApiPropertyOptional({ description: 'Additional description to append', maxLength: 255 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateTimerDto {
  @ApiPropertyOptional({ description: 'Update description', maxLength: 255 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Is this entry billable' })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Associated client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Associated task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
