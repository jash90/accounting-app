import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, ValidateIf } from 'class-validator';

/**
 * DTO for sending emails.
 * Validation ensures at least one of text or html body is provided via @ValidateIf logic:
 * - If html is not provided, text is required and must be a non-empty string
 * - If text is not provided, html is required and must be a non-empty string
 */
export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'recipient@example.com',
  })
  @IsEmail()
  to!: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Test Email from Accounting App',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiPropertyOptional({
    description: 'Plain text body (required if html is not provided)',
    example: 'This is a test email sent from the accounting application.',
  })
  @ValidateIf((o) => !o.html)
  @IsString()
  @IsNotEmpty({ message: 'Text body cannot be empty when html is not provided' })
  text?: string;

  @ApiPropertyOptional({
    description: 'HTML body (required if text is not provided)',
    example: '<p>This is a <strong>test email</strong> sent from the accounting application.</p>',
  })
  @ValidateIf((o) => !o.text)
  @IsString()
  @IsNotEmpty({ message: 'HTML body cannot be empty when text is not provided' })
  html?: string;
}
