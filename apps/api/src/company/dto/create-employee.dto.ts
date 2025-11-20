import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'employee@company.com', description: 'Employee email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'SecureP@ss123', description: 'Employee password (minimum 8 characters)' })
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

