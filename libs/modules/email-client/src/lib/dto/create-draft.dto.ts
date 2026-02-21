import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateDraftDto {
  @ApiProperty({ type: [String], description: 'Recipient email addresses' })
  @IsArray()
  @IsEmail({}, { each: true })
  to!: string[];

  @ApiPropertyOptional({ type: [String], description: 'CC email addresses' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String], description: 'BCC email addresses' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Plain text content' })
  @IsString()
  textContent!: string;

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Reply to message UID' })
  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Attachment file paths' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentPaths?: string[];

  @ApiPropertyOptional({ description: 'AI generated flag' })
  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @ApiPropertyOptional({ description: 'AI prompt used' })
  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @ApiPropertyOptional({ description: 'AI generation options' })
  @IsOptional()
  aiOptions?: {
    tone: 'formal' | 'casual' | 'neutral';
    length: 'short' | 'medium' | 'long';
    customInstructions?: string;
  };
}

export class UpdateDraftDto extends CreateDraftDto {}
