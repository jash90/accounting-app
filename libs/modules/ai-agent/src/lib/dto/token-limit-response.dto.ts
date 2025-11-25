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

export class TokenLimitResponseDto {
  @ApiProperty({ description: 'Limit configuration ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Company ID (nullable for System Admin entries)' })
  companyId: string | null;

  @ApiPropertyOptional({
    description: 'Company details',
    type: CompanyBasicInfoDto,
  })
  company: CompanyBasicInfoDto | null;

  @ApiPropertyOptional({
    description: 'User this limit applies to (null for company-wide limit)',
    type: UserBasicInfoDto,
  })
  user: UserBasicInfoDto | null;

  @ApiProperty({ description: 'Monthly token limit' })
  monthlyLimit: number;

  @ApiProperty({ description: 'Warning threshold percentage' })
  warningThresholdPercentage: number;

  @ApiProperty({ description: 'Send notification on warning' })
  notifyOnWarning: boolean;

  @ApiProperty({ description: 'Send notification when exceeded' })
  notifyOnExceeded: boolean;

  @ApiProperty({
    description: 'User who set this limit',
    type: UserBasicInfoDto,
  })
  setBy: UserBasicInfoDto;

  @ApiProperty({ description: 'Current usage this month' })
  currentUsage: number;

  @ApiProperty({ description: 'Percentage of limit used' })
  usagePercentage: number;

  @ApiProperty({ description: 'Is limit exceeded' })
  isExceeded: boolean;

  @ApiProperty({ description: 'Is warning threshold reached' })
  isWarning: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
