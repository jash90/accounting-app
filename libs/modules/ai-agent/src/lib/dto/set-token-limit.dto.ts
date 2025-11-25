import {
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  Max,
  IsString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetTokenLimitDto {
  @ApiProperty({
    description: 'Target type for the limit',
    enum: ['company', 'user'],
    example: 'user',
  })
  @IsString()
  @IsIn(['company', 'user'])
  targetType: 'company' | 'user';

  @ApiProperty({
    description: 'Target ID (company ID or user ID)',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Monthly token limit',
    example: 1000000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  monthlyLimit: number;

  @ApiPropertyOptional({
    description: 'Warning threshold percentage (1-99)',
    example: 80,
    minimum: 1,
    maximum: 99,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99)
  warningThresholdPercentage?: number;

  @ApiPropertyOptional({
    description: 'Send notification when warning threshold reached',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Send notification when limit exceeded',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnExceeded?: boolean;
}
