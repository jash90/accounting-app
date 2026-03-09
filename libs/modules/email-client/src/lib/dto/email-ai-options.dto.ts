import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class EmailAiOptionsDto {
  @ApiProperty({ description: 'IMAP message UID to reply to' })
  @Type(() => Number)
  @IsNumber()
  messageUid!: number;

  @ApiPropertyOptional({ enum: ['formal', 'casual', 'neutral'], default: 'neutral' })
  @IsOptional()
  @IsIn(['formal', 'casual', 'neutral'])
  tone?: 'formal' | 'casual' | 'neutral';

  @ApiPropertyOptional({ enum: ['short', 'medium', 'long'], default: 'medium' })
  @IsOptional()
  @IsIn(['short', 'medium', 'long'])
  length?: 'short' | 'medium' | 'long';

  @ApiPropertyOptional({ description: 'Custom instructions for AI' })
  @IsOptional()
  @IsString()
  customInstructions?: string;
}
