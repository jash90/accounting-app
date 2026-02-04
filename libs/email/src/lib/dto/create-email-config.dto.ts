import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating email configuration
 * Used for both user and company email configurations
 */
export class CreateEmailConfigDto {
  // Optional metadata
  @ApiPropertyOptional({
    description: 'Display name for this email configuration',
    example: 'Admin Personal Email',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  // SMTP Configuration
  @ApiProperty({
    description: 'SMTP server hostname',
    example: 'smtp.gmail.com',
  })
  @IsString()
  @MinLength(3)
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

  @ApiPropertyOptional({
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
  @MinLength(1)
  smtpPassword!: string;

  // IMAP Configuration
  @ApiProperty({
    description: 'IMAP server hostname',
    example: 'imap.gmail.com',
  })
  @IsString()
  @MinLength(3)
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

  @ApiPropertyOptional({
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
  @MinLength(1)
  imapPassword!: string;
}
