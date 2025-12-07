import { IsOptional, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({
    example: 'notifications@company.com',
    description: 'Email address used as sender for notification emails',
  })
  @IsOptional()
  @IsEmail()
  notificationFromEmail?: string;
}
