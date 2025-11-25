import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class TokenUsageResponseDto {
  @ApiProperty({ description: 'Usage record ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Company ID (nullable for System Admin entries)' })
  companyId: string | null;

  @ApiPropertyOptional({
    description: 'Company details',
    type: CompanyBasicInfoDto,
  })
  company: CompanyBasicInfoDto | null;

  @ApiProperty({
    description: 'User',
    type: UserBasicInfoDto,
  })
  user: UserBasicInfoDto;

  @ApiProperty({ description: 'Date for this usage record' })
  date: Date;

  @ApiProperty({ description: 'Total input tokens' })
  totalInputTokens: number;

  @ApiProperty({ description: 'Total output tokens' })
  totalOutputTokens: number;

  @ApiProperty({ description: 'Total tokens (input + output)' })
  totalTokens: number;

  @ApiProperty({ description: 'Number of conversations' })
  conversationCount: number;

  @ApiProperty({ description: 'Number of messages' })
  messageCount: number;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class TokenUsageStatsDto {
  @ApiProperty({ description: 'Total tokens used' })
  totalTokens: number;

  @ApiProperty({ description: 'Total input tokens' })
  totalInputTokens: number;

  @ApiProperty({ description: 'Total output tokens' })
  totalOutputTokens: number;

  @ApiProperty({ description: 'Total conversations' })
  conversationCount: number;

  @ApiProperty({ description: 'Total messages' })
  messageCount: number;

  @ApiProperty({ description: 'Period start date' })
  periodStart: Date;

  @ApiProperty({ description: 'Period end date' })
  periodEnd: Date;

  @ApiProperty({
    description: 'Daily usage breakdown',
    type: [TokenUsageResponseDto],
  })
  dailyUsage: TokenUsageResponseDto[];
}
