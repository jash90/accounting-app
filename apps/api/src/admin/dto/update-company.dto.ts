import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Acme Corporation LLC', description: 'Updated company name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false, description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'notifications@company.com',
    description: 'Email address used as sender for notification emails',
  })
  @IsOptional()
  @IsEmail()
  notificationFromEmail?: string;
}

