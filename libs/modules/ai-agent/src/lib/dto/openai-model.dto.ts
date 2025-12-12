import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for OpenAI model information
 */
export class OpenAIModelDto {
  @ApiProperty({
    description: 'Model ID',
    example: 'gpt-4o',
  })
  id: string;

  @ApiProperty({
    description: 'Friendly model name',
    example: 'GPT-4o',
  })
  name: string;

  @ApiProperty({
    description: 'Model description',
    example: 'Most capable model, multimodal (text + vision)',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Unix timestamp when model was created',
    example: 1699574400,
  })
  created?: number;
}
