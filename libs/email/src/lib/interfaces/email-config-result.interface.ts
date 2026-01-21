/**
 * Email configuration result interface
 * Provides a standardized format for email autodiscovery results
 */

import { AutodiscoveryResult, DiscoverySource, ConfidenceLevel } from './autodiscovery.interface';

/**
 * Security type for email connections
 */
export type SecurityType = 'SSL' | 'STARTTLS' | 'NONE';

/**
 * Source of email configuration discovery
 */
export type EmailConfigSource = 'autoconfig' | 'mx_lookup' | 'ispdb' | 'database';

/**
 * Incoming mail server configuration
 */
export interface IncomingServerConfig {
  protocol: 'IMAP' | 'POP3';
  server: string;
  port: number;
  security: SecurityType;
  username: string;
}

/**
 * Outgoing mail server configuration
 */
export interface OutgoingServerConfig {
  protocol: 'SMTP';
  server: string;
  port: number;
  security: SecurityType;
  username: string;
}

/**
 * Complete email configuration result from autodiscovery
 * This is the standardized interface for email autodiscovery results
 */
export interface DiscoveredEmailConfig {
  incoming: IncomingServerConfig;
  outgoing: OutgoingServerConfig;
  source: EmailConfigSource;
  confidence: ConfidenceLevel;
  provider?: string;
}

/**
 * Maps internal DiscoverySource to public EmailConfigSource
 */
function mapSource(src: DiscoverySource): EmailConfigSource {
  switch (src) {
    case 'known-provider':
      return 'database';
    case 'autoconfig':
      return 'autoconfig';
    case 'autodiscover':
      return 'autoconfig';
    case 'ispdb':
      return 'ispdb';
    case 'dns-srv':
      return 'mx_lookup';
    case 'mx-heuristic':
      return 'mx_lookup';
    default:
      return 'database';
  }
}

/**
 * Determines security type based on config flags
 * @param secure - Whether SSL/TLS is used
 * @param port - Port number to help determine security type
 */
function mapSecurity(secure: boolean, port: number): SecurityType {
  if (secure) {
    return 'SSL';
  }
  // Common STARTTLS ports
  if (port === 587 || port === 143) {
    return 'STARTTLS';
  }
  return 'NONE';
}

/**
 * Determines IMAP security type based on config
 * @param tls - Whether TLS is enabled
 * @param port - Port number to help determine security type
 */
function mapImapSecurity(tls: boolean, port: number): SecurityType {
  if (port === 993) {
    return 'SSL';
  }
  if (tls) {
    return 'STARTTLS';
  }
  return 'NONE';
}

/**
 * Converts AutodiscoveryResult to DiscoveredEmailConfig format
 *
 * @param result - The autodiscovery result to convert
 * @param email - The email address for username substitution
 * @returns DiscoveredEmailConfig if conversion is successful, null otherwise
 *
 * @example
 * ```typescript
 * const result = await autodiscoveryService.discover('user@gmail.com');
 * const config = toDiscoveredEmailConfig(result, 'user@gmail.com');
 * if (config) {
 *   console.log(`IMAP: ${config.incoming.server}:${config.incoming.port}`);
 *   console.log(`SMTP: ${config.outgoing.server}:${config.outgoing.port}`);
 * }
 * ```
 */
export function toDiscoveredEmailConfig(
  result: AutodiscoveryResult,
  email: string
): DiscoveredEmailConfig | null {
  if (!result.success || !result.config) {
    return null;
  }

  const { smtp, imap, provider } = result.config;

  return {
    incoming: {
      protocol: 'IMAP',
      server: imap.host,
      port: imap.port,
      security: mapImapSecurity(imap.tls, imap.port),
      username: email,
    },
    outgoing: {
      protocol: 'SMTP',
      server: smtp.host,
      port: smtp.port,
      security: mapSecurity(smtp.secure, smtp.port),
      username: email,
    },
    source: mapSource(result.source),
    confidence: result.confidence,
    provider,
  };
}

/**
 * Type guard to check if a DiscoveredEmailConfig has high confidence
 */
export function isHighConfidence(config: DiscoveredEmailConfig): boolean {
  return config.confidence === 'high';
}

/**
 * Type guard to check if a DiscoveredEmailConfig uses SSL for both connections
 */
export function isFullySsl(config: DiscoveredEmailConfig): boolean {
  return config.incoming.security === 'SSL' && config.outgoing.security === 'SSL';
}
