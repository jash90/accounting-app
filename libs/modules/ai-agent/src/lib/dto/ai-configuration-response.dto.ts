import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@accounting/common';

class UserBasicInfoDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;
}

class CompanyBasicInfoDto {
  @ApiProperty({ description: 'Company ID' })
  id: string;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiProperty({ description: 'Is this the System Admin company' })
  isSystemCompany: boolean;
}

export class AIConfigurationResponseDto {
  @ApiProperty({ description: 'Configuration ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Company ID (nullable for System Admin entries)' })
  companyId: string | null;

  @ApiPropertyOptional({
    description: 'Company details',
    type: CompanyBasicInfoDto,
  })
  company: CompanyBasicInfoDto | null;

  @ApiProperty({
    description: 'AI provider',
    enum: AIProvider,
  })
  provider: AIProvider;

  @ApiProperty({ description: 'AI model identifier' })
  model: string;

  @ApiPropertyOptional({ description: 'System prompt' })
  systemPrompt: string | null;

  @ApiProperty({ description: 'API key status (not the actual key)' })
  hasApiKey: boolean;

  @ApiProperty({ description: 'Temperature parameter' })
  temperature: number;

  @ApiProperty({ description: 'Maximum tokens' })
  maxTokens: number;

  @ApiProperty({
    description: 'User who created the configuration',
    type: UserBasicInfoDto,
  })
  createdBy: UserBasicInfoDto;

  @ApiPropertyOptional({
    description: 'User who last updated the configuration',
    type: UserBasicInfoDto,
  })
  updatedBy: UserBasicInfoDto | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
