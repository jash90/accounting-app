import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@accounting/common';

export class CreateAIConfigurationDto {
  @ApiProperty({
    description: 'AI provider to use',
    enum: AIProvider,
    example: AIProvider.OPENAI,
  })
  @IsEnum(AIProvider)
  provider: AIProvider;

  @ApiProperty({
    description: 'AI model identifier',
    example: 'gpt-4',
  })
  @IsString()
  model: string;

  @ApiPropertyOptional({
    description: 'System prompt for AI agent',
    example: 'You are a helpful assistant for accounting and business tasks.',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({
    description: 'API key for the AI provider (will be encrypted)',
    example: 'sk-...',
  })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({
    description: 'Temperature parameter for AI responses (0-2)',
    example: 0.7,
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens for AI responses',
    example: 4000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}
