import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
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

  @ApiPropertyOptional({
    description: 'Enable streaming mode for real-time token streaming via SSE',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  enableStreaming?: boolean;

  // Embedding configuration (for RAG/Knowledge Base)
  @ApiPropertyOptional({
    description: 'AI provider to use for embeddings (defaults to OpenAI as OpenRouter does not support embeddings)',
    enum: AIProvider,
    example: AIProvider.OPENAI,
  })
  @IsOptional()
  @IsEnum(AIProvider)
  embeddingProvider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Separate API key for embeddings (optional, falls back to main API key if not provided)',
    example: 'sk-...',
  })
  @IsOptional()
  @IsString()
  embeddingApiKey?: string;

  @ApiPropertyOptional({
    description: 'Embedding model to use',
    example: 'text-embedding-ada-002',
  })
  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
