import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

/**
 * FIX-03: Self-registration DTO — role and companyId removed.
 * Self-registration always creates COMPANY_OWNER.
 * EMPLOYEE accounts are created by company owners via POST /company/employees.
 * ADMIN accounts are created by system administrators via POST /admin/users.
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    minLength: 12,
    description:
      'Min 12 chars, must contain uppercase, lowercase, digit, and special character (@$!%*?&)',
  })
  @IsString({ message: 'Hasło musi być tekstem' })
  @MinLength(12, { message: 'Hasło musi mieć minimum 12 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę, jedną cyfrę i jeden znak specjalny (@$!%*?&)',
  })
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;
}
