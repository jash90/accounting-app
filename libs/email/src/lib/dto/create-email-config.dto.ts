import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating email configuration
 * Used for both user and company email configurations
 */
export class CreateEmailConfigDto {
  // SMTP Configuration
  @IsString()
  @MinLength(3)
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsBoolean()
  smtpSecure!: boolean;

  @IsString()
  @MinLength(3)
  smtpUser!: string;

  @IsString()
  @MinLength(1)
  smtpPassword!: string;

  // IMAP Configuration
  @IsString()
  @MinLength(3)
  imapHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @IsBoolean()
  imapTls!: boolean;

  @IsString()
  @MinLength(3)
  imapUser!: string;

  @IsString()
  @MinLength(1)
  imapPassword!: string;

  // Optional metadata
  @IsString()
  @IsOptional()
  @MinLength(1)
  displayName?: string;
}
