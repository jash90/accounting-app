/**
 * Email autodiscovery interfaces
 * Supports multiple discovery methods: known providers, Autoconfig, Autodiscover, DNS SRV, MX heuristics
 */

export type AuthMethod = 'plain' | 'oauth2' | 'login' | 'cram-md5';

export type DiscoverySource =
  | 'known-provider'
  | 'autoconfig'
  | 'autodiscover'
  | 'ispdb'
  | 'dns-srv'
  | 'mx-heuristic';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface SmtpDiscoveredConfig {
  host: string;
  port: number;
  secure: boolean;
  authMethod: AuthMethod;
}

export interface ImapDiscoveredConfig {
  host: string;
  port: number;
  tls: boolean;
}

export interface DiscoveredConfig {
  smtp: SmtpDiscoveredConfig;
  imap: ImapDiscoveredConfig;
  provider?: string;
  displayName?: string;
  documentationUrl?: string;
  requiresAppPassword?: boolean;
  requiresOAuth?: boolean;
  notes?: string;
}

export interface AutodiscoveryResult {
  success: boolean;
  config?: DiscoveredConfig;
  source: DiscoverySource;
  confidence: ConfidenceLevel;
  warnings?: string[];
  error?: string;
}

export interface KnownProvider extends DiscoveredConfig {
  domains: string[];
  aliases?: string[];
}

/**
 * Mozilla Autoconfig XML structure (simplified)
 */
export interface AutoconfigServer {
  type: 'smtp' | 'imap' | 'pop3';
  hostname: string;
  port: number;
  socketType: 'SSL' | 'STARTTLS' | 'plain';
  authentication: string;
  username?: string;
}

export interface AutoconfigResponse {
  emailProvider: {
    id: string;
    domain: string[];
    displayName: string;
    displayShortName?: string;
    incomingServer: AutoconfigServer[];
    outgoingServer: AutoconfigServer[];
    documentation?: {
      url: string;
      description?: string;
    };
  };
}

/**
 * DNS SRV record structure
 */
export interface SrvRecord {
  priority: number;
  weight: number;
  port: number;
  name: string;
}

/**
 * MX record structure
 */
export interface MxRecord {
  priority: number;
  exchange: string;
}
