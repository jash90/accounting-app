import { ApiProperty } from '@nestjs/swagger';

export class UserBasicInfoDto {
  @ApiProperty({ description: 'User unique identifier', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName: string;
}

export class SimpleTextResponseDto {
  @ApiProperty({ description: 'Simple text entry unique identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Text content', example: 'This is a sample text entry' })
  content: string;

  @ApiProperty({ description: 'Company unique identifier', example: '123e4567-e89b-12d3-a456-426614174000' })
  companyId: string;

  @ApiProperty({ description: 'User who created this entry', type: UserBasicInfoDto })
  createdBy: UserBasicInfoDto;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}
