import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@accounting/common';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!', description: 'User password (minimum 8 characters)' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.COMPANY_OWNER, description: 'User role in the system' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ required: false, example: '123e4567-e89b-12d3-a456-426614174000', description: 'Company ID (required for COMPANY_OWNER and EMPLOYEE roles)' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false, default: true, example: true, description: 'Whether the user account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

