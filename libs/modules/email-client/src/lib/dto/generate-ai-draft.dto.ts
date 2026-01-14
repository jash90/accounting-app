import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateAiDraftDto {
  @ApiProperty({ description: 'IMAP message UID to reply to' })
  @IsString()
  messageUid!: string;

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
