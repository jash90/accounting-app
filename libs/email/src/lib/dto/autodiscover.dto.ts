import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsEmail, IsNotEmpty } from 'class-validator';

import {
  AutodiscoveryResult,
  ConfidenceLevel,
  DiscoveredConfig,
  DiscoverySource,
} from '../interfaces/autodiscovery.interface';

/**
 * Request DTO for email autodiscovery
 */
export class AutodiscoverRequestDto {
  @ApiProperty({
    description: 'Email address to discover server settings for',
    example: 'user@gmail.com',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;
}

/**
 * SMTP configuration in response
 */
export class SmtpConfigDto {
  @ApiProperty({ description: 'SMTP server hostname', example: 'smtp.gmail.com' })
  host!: string;

  @ApiProperty({ description: 'SMTP server port', example: 465 })
  port!: number;

  @ApiProperty({ description: 'Whether to use SSL/TLS', example: true })
  secure!: boolean;

  @ApiProperty({
    description: 'Authentication method',
    example: 'plain',
    enum: ['plain', 'oauth2', 'login', 'cram-md5'],
  })
  authMethod!: string;
}

/**
 * IMAP configuration in response
 */
export class ImapConfigDto {
  @ApiProperty({ description: 'IMAP server hostname', example: 'imap.gmail.com' })
  host!: string;

  @ApiProperty({ description: 'IMAP server port', example: 993 })
  port!: number;

  @ApiProperty({ description: 'Whether to use TLS', example: true })
  tls!: boolean;
}

/**
 * Discovered email configuration
 */
export class DiscoveredConfigDto {
  @ApiProperty({ description: 'SMTP server configuration', type: SmtpConfigDto })
  smtp!: SmtpConfigDto;

  @ApiProperty({ description: 'IMAP server configuration', type: ImapConfigDto })
  imap!: ImapConfigDto;

  @ApiPropertyOptional({ description: 'Email provider name', example: 'Google' })
  provider?: string;

  @ApiPropertyOptional({ description: 'Display name for the provider', example: 'Gmail' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'URL to provider documentation',
    example: 'https://support.google.com/mail/answer/7126229',
  })
  documentationUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the provider requires an app-specific password',
    example: true,
  })
  requiresAppPassword?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the provider requires OAuth2 authentication',
    example: true,
  })
  requiresOAuth?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes about configuring this provider',
    example: 'Requires App Password or OAuth2. Enable 2FA first.',
  })
  notes?: string;
}

/**
 * Response DTO for email autodiscovery
 */
export class AutodiscoverResponseDto {
  @ApiProperty({ description: 'Whether discovery was successful', example: true })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Discovered email server configuration',
    type: DiscoveredConfigDto,
  })
  config?: DiscoveredConfigDto;

  @ApiProperty({
    description: 'Source of the discovered configuration',
    example: 'known-provider',
    enum: ['known-provider', 'autoconfig', 'autodiscover', 'ispdb', 'dns-srv', 'mx-heuristic'],
  })
  source!: DiscoverySource;

  @ApiProperty({
    description: 'Confidence level of the discovered settings',
    example: 'high',
    enum: ['high', 'medium', 'low'],
  })
  confidence!: ConfidenceLevel;

  @ApiPropertyOptional({
    description: 'Warnings about the discovered configuration',
    example: ['This provider requires an App Password with 2FA enabled'],
    type: [String],
  })
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Error message if discovery failed',
    example: 'Could not discover settings for this domain',
  })
  error?: string;

  /**
   * Create response DTO from autodiscovery result
   */
  static fromResult(result: AutodiscoveryResult): AutodiscoverResponseDto {
    const dto = new AutodiscoverResponseDto();
    dto.success = result.success;
    dto.source = result.source;
    dto.confidence = result.confidence;
    dto.warnings = result.warnings;
    dto.error = result.error;

    if (result.config) {
      dto.config = AutodiscoverResponseDto.mapConfig(result.config);
    }

    return dto;
  }

  /**
   * Map discovered config to DTO
   */
  private static mapConfig(config: DiscoveredConfig): DiscoveredConfigDto {
    const configDto = new DiscoveredConfigDto();

    configDto.smtp = {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      authMethod: config.smtp.authMethod,
    };

    configDto.imap = {
      host: config.imap.host,
      port: config.imap.port,
      tls: config.imap.tls,
    };

    configDto.provider = config.provider;
    configDto.displayName = config.displayName;
    configDto.documentationUrl = config.documentationUrl;
    configDto.requiresAppPassword = config.requiresAppPassword;
    configDto.requiresOAuth = config.requiresOAuth;
    configDto.notes = config.notes;

    return configDto;
  }
}
