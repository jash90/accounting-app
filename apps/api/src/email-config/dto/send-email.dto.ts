import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'recipient@example.com',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Test Email from Accounting App',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiPropertyOptional({
    description: 'Plain text body',
    example: 'This is a test email sent from the accounting application.',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'HTML body',
    example: '<p>This is a <strong>test email</strong> sent from the accounting application.</p>',
  })
  @IsString()
  @IsOptional()
  html?: string;
}
