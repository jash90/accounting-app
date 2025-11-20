import { ApiProperty } from '@nestjs/swagger';
import { ModuleResponseDto } from './module-response.dto';
import { UserResponseDto } from './user-response.dto';

export class UserModulePermissionResponseDto {
  @ApiProperty({
    description: 'Permission record unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Module ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  moduleId: string;

  @ApiProperty({
    description: 'List of permissions granted to the user for this module',
    example: ['read', 'write', 'delete'],
    type: [String],
  })
  permissions: string[];

  @ApiProperty({
    description: 'ID of the user who granted these permissions',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  grantedById: string;

  @ApiProperty({
    description: 'Permission grant timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: () => ModuleResponseDto,
    description: 'Module details (when included)',
    required: false,
  })
  module?: ModuleResponseDto;

  @ApiProperty({
    type: () => UserResponseDto,
    description: 'User details (when included)',
    required: false,
  })
  user?: UserResponseDto;

  @ApiProperty({
    type: () => UserResponseDto,
    description: 'Details of user who granted permissions (when included)',
    required: false,
  })
  grantedBy?: UserResponseDto;
}
