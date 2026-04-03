import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    example: 'newemail@example.com',
    description: 'Updated employee email address',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    minLength: 8,
    example: 'NewSecureP@ss456',
    description: 'Updated password (minimum 8 characters)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: 'Jane', description: 'Updated employee first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Johnson', description: 'Updated employee last name' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
