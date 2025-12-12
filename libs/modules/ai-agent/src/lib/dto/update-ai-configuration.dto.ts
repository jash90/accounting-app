import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
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

  @ApiPropertyOptional({
    description: 'Enable streaming mode for real-time token streaming via SSE',
  })
  @IsOptional()
  @IsBoolean()
  enableStreaming?: boolean;

  // Embedding configuration (for RAG/Knowledge Base)
  @ApiPropertyOptional({
    description: 'AI provider to use for embeddings (defaults to OpenAI as OpenRouter does not support embeddings)',
    enum: AIProvider,
  })
  @IsOptional()
  @IsEnum(AIProvider)
  embeddingProvider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Separate API key for embeddings (optional, falls back to main API key if not provided)',
  })
  @IsOptional()
  @IsString()
  embeddingApiKey?: string;

  @ApiPropertyOptional({
    description: 'Embedding model to use',
  })
  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
