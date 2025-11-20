import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@accounting/common';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'updated@example.com', description: 'Updated email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NewSecureP@ss!', description: 'Updated password (minimum 8 characters)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'John', description: 'Updated first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Updated last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.EMPLOYEE, description: 'Updated user role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Updated company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: false, description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

