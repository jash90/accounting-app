import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@accounting/common';

export class UpdateAIConfigurationDto {
  @ApiPropertyOptional({
    description: 'AI provider to use',
    enum: AIProvider,
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiPropertyOptional({
    description: 'AI model identifier',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'System prompt for AI agent',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({
    description: 'API key for the AI provider (will be encrypted). If provided, must not be empty.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'API key cannot be empty if provided' })
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Temperature parameter for AI responses (0-2)',
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
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}
