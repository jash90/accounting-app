import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleResponseDto {
  @ApiProperty({
    description: 'Module unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Module name',
    example: 'Simple Text Management',
  })
  name: string;

  @ApiProperty({
    description: 'Module URL-friendly slug',
    example: 'simple-text',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'A module for managing simple text documents',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Whether the module is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Module creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
