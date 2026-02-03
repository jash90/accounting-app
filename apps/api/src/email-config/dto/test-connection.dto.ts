import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TestSmtpDto {
  @ApiProperty({
    description: 'SMTP server hostname',
    example: 'smtp.gmail.com',
  })
  @IsString()
  smtpHost!: string;

  @ApiProperty({
    description: 'SMTP server port (1-65535)',
    example: 465,
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
    description: 'SMTP password',
    example: 'your-password',
  })
  @IsString()
  smtpPassword!: string;
}

export class TestImapDto {
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
    description: 'IMAP password',
    example: 'your-password',
  })
  @IsString()
  imapPassword!: string;
}

export class TestConnectionResultDto {
  @ApiProperty({
    description: 'Whether the connection test was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Result message',
    example: 'Połączenie SMTP działa poprawnie',
  })
  message!: string;
}
