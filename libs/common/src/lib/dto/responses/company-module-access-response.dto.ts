import { ApiProperty } from '@nestjs/swagger';
import { ModuleResponseDto } from './module-response.dto';

export class CompanyModuleAccessResponseDto {
  @ApiProperty({
    description: 'Access record unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Company ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId: string;

  @ApiProperty({
    description: 'Module ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Whether the module access is enabled for the company',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Access record creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: () => ModuleResponseDto,
    description: 'Module details (when included)',
    required: false,
  })
  module?: ModuleResponseDto;
}
