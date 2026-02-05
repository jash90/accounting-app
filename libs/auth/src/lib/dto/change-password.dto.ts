import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString({ message: 'Aktualne hasło musi być tekstem' })
  @IsNotEmpty({ message: 'Aktualne hasło jest wymagane' })
  currentPassword!: string;

  @ApiProperty({
    description:
      'New password (min 12 chars, must contain uppercase, lowercase, number, special char)',
    minLength: 12,
  })
  @IsString({ message: 'Nowe hasło musi być tekstem' })
  @MinLength(12, { message: 'Hasło musi mieć minimum 12 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę, jedną cyfrę i jeden znak specjalny (@$!%*?&)',
  })
  newPassword!: string;
}
