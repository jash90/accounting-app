import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsBoolean, IsOptional, Min, Max, IsEmail } from 'class-validator';

export class CreateEmailConfigDto {
  @ApiProperty({
    description: 'Display name for this email configuration',
    example: 'Admin Personal Email',
    required: false,
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    description: 'SMTP server hostname',
    example: 'smtp.gmail.com',
  })
  @IsString()
  smtpHost!: string;

  @ApiProperty({
    description: 'SMTP server port (1-65535)',
    example: 587,
    minimum: 1,
    maximum: 65535,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @ApiProperty({
    description: 'Use SSL/TLS for SMTP connection',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiProperty({
    description: 'SMTP username (usually email address)',
    example: 'admin@example.com',
  })
  @IsEmail()
  smtpUser!: string;

  @ApiProperty({
    description: 'SMTP password (will be encrypted)',
    example: 'your-password',
  })
  @IsString()
  smtpPassword!: string;

  @ApiProperty({
    description: 'IMAP server hostname',
    example: 'imap.gmail.com',
  })
  @IsString()
  imapHost!: string;

  @ApiProperty({
    description: 'IMAP server port (1-65535)',
    example: 993,
    minimum: 1,
    maximum: 65535,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @ApiProperty({
    description: 'Use TLS for IMAP connection',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  imapTls?: boolean;

  @ApiProperty({
    description: 'IMAP username (usually email address)',
    example: 'admin@example.com',
  })
  @IsEmail()
  imapUser!: string;

  @ApiProperty({
    description: 'IMAP password (will be encrypted)',
    example: 'your-password',
  })
  @IsString()
  imapPassword!: string;
}
