import { IsString, IsEmail, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for sending emails via SMTP
 */
export class SendEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsEmail()
  @IsOptional()
  from?: string;

  @IsEmail({}, { each: true })
  @IsOptional()
  cc?: string | string[];

  @IsEmail({}, { each: true })
  @IsOptional()
  bcc?: string | string[];

  @IsEmail()
  @IsOptional()
  replyTo?: string;
}

/**
 * DTO for email attachment
 */
export class EmailAttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}
