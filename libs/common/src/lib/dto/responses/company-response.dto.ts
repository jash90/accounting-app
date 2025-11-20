import { ApiProperty } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({
    description: 'Company unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Company owner user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  ownerId: string;

  @ApiProperty({
    description: 'Whether the company is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Company creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Company last update timestamp',
    example: '2024-01-16T14:20:00Z',
  })
  updatedAt: Date;
}
