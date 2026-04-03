import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'employee@example.com', description: 'Employee email address' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    minLength: 8,
    example: 'SecureP@ss123',
    description: 'Employee password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane', description: 'Employee first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Smith', description: 'Employee last name' })
  @IsString()
  lastName: string;
}
