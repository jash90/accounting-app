import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import * as nodemailer from 'nodemailer';
import Imap from 'imap';
import {
  AutodiscoveryResult,
  DiscoveredConfig,
  AutoconfigResponse,
  SrvRecord,
  MxRecord,
  ConfidenceLevel,
} from '../interfaces/autodiscovery.interface';
import { PROVIDER_LOOKUP } from '../data/known-providers';

const resolveSrv = promisify(dns.resolveSrv);
const resolveMx = promisify(dns.resolveMx);

// TLS validation - configurable via env, defaults to true in production
const REJECT_UNAUTHORIZED = process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false';

/**
 * Cache entry with TTL tracking
 */
interface CacheEntry {
  result: AutodiscoveryResult;
  expiry: number;
}

/**
 * Connection verification result
 */
export interface VerificationResult {
  smtp: { success: boolean; error?: string };
  imap: { success: boolean; error?: string };
}

@Injectable()
export class EmailAutodiscoveryService {
  private readonly logger = new Logger(EmailAutodiscoveryService.name);

  /**
   * Escapes special XML characters to prevent XML injection
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Cache for discovery results
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_SUCCESS = 3600000; // 1 hour for successful lookups
  private readonly CACHE_TTL_FAILURE = 900000; // 15 minutes for failed lookups
  private readonly VERIFICATION_TIMEOUT = 10000; // 10 seconds for connection tests

  /**
   * Main autodiscovery method - tries multiple strategies in order of reliability
   */
  async discover(email: string): Promise<AutodiscoveryResult> {
    const domain = this.extractDomain(email);
    if (!domain) {
      return {
        success: false,
        source: 'known-provider',
        confidence: 'low',
        error: 'Invalid email address format',
      };
    }

    // Check cache first
    const cached = this.getCached(domain);
    if (cached) {
      this.logger.debug(`Returning cached result for ${domain}`);
      return cached;
    }

    this.logger.debug(`Starting autodiscovery for domain: ${domain}`);

    // 1. Check known providers first (fastest and most reliable)
    const knownResult = this.checkKnownProviders(domain);
    if (knownResult.success) {
      this.logger.log(`Found known provider for ${domain}: ${knownResult.config?.provider}`);
      this.setCache(domain, knownResult);
      return knownResult;
    }

    // 2. Try Mozilla Autoconfig
    const autoconfigResult = await this.tryAutoconfig(domain);
    if (autoconfigResult.success) {
      this.logger.log(`Found Autoconfig for ${domain}`);
      this.setCache(domain, autoconfigResult);
      return autoconfigResult;
    }

    // 3. Try Microsoft Autodiscover
    const autodiscoverResult = await this.tryAutodiscover(domain, email);
    if (autodiscoverResult.success) {
      this.logger.log(`Found Autodiscover for ${domain}`);
      this.setCache(domain, autodiscoverResult);
      return autodiscoverResult;
    }

    // 4. Try Mozilla Thunderbird ISPDB
    const ispdbResult = await this.tryIspdb(domain);
    if (ispdbResult.success) {
      this.logger.log(`Found ISPDB entry for ${domain}`);
      this.setCache(domain, ispdbResult);
      return ispdbResult;
    }

    // 5. Try DNS SRV records
    const srvResult = await this.tryDnsSrv(domain);
    if (srvResult.success) {
      this.logger.log(`Found DNS SRV records for ${domain}`);
      this.setCache(domain, srvResult);
      return srvResult;
    }

    // 6. Last resort: MX record heuristics
    const mxResult = await this.tryMxHeuristics(domain);
    if (mxResult.success) {
      this.logger.log(`Using MX heuristics for ${domain}`);
      this.setCache(domain, mxResult);
      return mxResult;
    }

    this.logger.warn(`No configuration found for ${domain}`);
    const failResult: AutodiscoveryResult = {
      success: false,
      source: 'mx-heuristic',
      confidence: 'low',
      error: `Could not auto-discover email configuration for ${domain}`,
      warnings: [
        'No known provider match',
        'No Autoconfig/Autodiscover found',
        'No ISPDB entry found',
        'No DNS SRV records found',
        'MX heuristics failed',
      ],
    };
    this.setCache(domain, failResult);
    return failResult;
  }

  /**
   * Get cached result for domain
   */
  private getCached(domain: string): AutodiscoveryResult | null {
    const key = domain.toLowerCase().trim();
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Set cache entry with appropriate TTL
   */
  private setCache(domain: string, result: AutodiscoveryResult): void {
    const key = domain.toLowerCase().trim();
    const ttl = result.success ? this.CACHE_TTL_SUCCESS : this.CACHE_TTL_FAILURE;

    this.cache.set(key, {
      result,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Clear cache for a specific domain or all domains
   */
  clearCache(domain?: string): void {
    if (domain) {
      this.cache.delete(domain.toLowerCase().trim());
    } else {
      this.cache.clear();
    }
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string | null {
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[1]) {
      return null;
    }
    return parts[1].toLowerCase().trim();
  }

  /**
   * Check if domain matches a known provider
   */
  private checkKnownProviders(domain: string): AutodiscoveryResult {
    const provider = PROVIDER_LOOKUP.get(domain.toLowerCase());

    if (provider) {
      const config: DiscoveredConfig = {
        smtp: { ...provider.smtp },
        imap: { ...provider.imap },
        provider: provider.provider,
        displayName: provider.displayName,
        documentationUrl: provider.documentationUrl,
        requiresAppPassword: provider.requiresAppPassword,
        requiresOAuth: provider.requiresOAuth,
        notes: provider.notes,
      };

      const warnings: string[] = [];
      if (provider.requiresAppPassword) {
        warnings.push('This provider requires an App Password instead of your regular password');
      }
      if (provider.requiresOAuth) {
        warnings.push('This provider prefers OAuth2 authentication');
      }
      if (provider.notes) {
        warnings.push(provider.notes);
      }

      return {
        success: true,
        config,
        source: 'known-provider',
        confidence: 'high',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    return {
      success: false,
      source: 'known-provider',
      confidence: 'low',
    };
  }

  /**
   * Try Mozilla Autoconfig XML discovery
   * Checks multiple URLs according to Mozilla specification
   */
  private async tryAutoconfig(domain: string): Promise<AutodiscoveryResult> {
    const urls = [
      `https://autoconfig.${domain}/mail/config-v1.1.xml`,
      `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml`,
      `http://autoconfig.${domain}/mail/config-v1.1.xml`,
    ];

    for (const url of urls) {
      try {
        this.logger.debug(`Trying Autoconfig URL: ${url}`);
        const response = await this.fetchWithTimeout(url, 5000);

        if (response.ok) {
          const xmlText = await response.text();
          const config = this.parseAutoconfigXml(xmlText);

          if (config) {
            return {
              success: true,
              config,
              source: 'autoconfig',
              confidence: 'high',
            };
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Autoconfig failed for ${url}: ${message}`);
      }
    }

    return {
      success: false,
      source: 'autoconfig',
      confidence: 'low',
    };
  }

  /**
   * Try Microsoft Autodiscover protocol
   */
  private async tryAutodiscover(domain: string, email: string): Promise<AutodiscoveryResult> {
    const urls = [
      `https://autodiscover.${domain}/autodiscover/autodiscover.xml`,
      `https://${domain}/autodiscover/autodiscover.xml`,
    ];

    const body = `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>${this.escapeXml(email)}</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>`;

    for (const url of urls) {
      try {
        this.logger.debug(`Trying Autodiscover URL: ${url}`);
        const response = await this.fetchWithTimeout(url, 5000, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
          },
          body,
        });

        if (response.ok) {
          const xmlText = await response.text();
          const config = this.parseAutodiscoverXml(xmlText);

          if (config) {
            return {
              success: true,
              config,
              source: 'autodiscover',
              confidence: 'high',
            };
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Autodiscover failed for ${url}: ${message}`);
      }
    }

    return {
      success: false,
      source: 'autodiscover',
      confidence: 'low',
    };
  }

  /**
   * Try Mozilla Thunderbird ISPDB
   * Uses the public ISPDB maintained by Mozilla for Thunderbird
   * https://autoconfig.thunderbird.net/v1.1/{domain}
   */
  private async tryIspdb(domain: string): Promise<AutodiscoveryResult> {
    const url = `https://autoconfig.thunderbird.net/v1.1/${domain}`;

    try {
      this.logger.debug(`Trying ISPDB URL: ${url}`);
      const response = await this.fetchWithTimeout(url, 5000);

      if (response.ok) {
        const xmlText = await response.text();
        const config = this.parseAutoconfigXml(xmlText);

        if (config) {
          return {
            success: true,
            config,
            source: 'ispdb',
            confidence: 'high',
          };
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`ISPDB failed for ${domain}: ${message}`);
    }

    return {
      success: false,
      source: 'ispdb',
      confidence: 'low',
    };
  }

  /**
   * Try DNS SRV record discovery
   */
  private async tryDnsSrv(domain: string): Promise<AutodiscoveryResult> {
    try {
      const srvQueries = [
        { query: `_submission._tcp.${domain}`, type: 'smtp' },
        { query: `_smtps._tcp.${domain}`, type: 'smtp-ssl' },
        { query: `_imaps._tcp.${domain}`, type: 'imap-ssl' },
        { query: `_imap._tcp.${domain}`, type: 'imap' },
      ];

      let smtpRecord: SrvRecord | null = null;
      let imapRecord: SrvRecord | null = null;
      let smtpSecure = false;
      let imapTls = false;

      for (const srv of srvQueries) {
        try {
          const records = await resolveSrv(srv.query);
          if (records && records.length > 0) {
            const record = records.sort((a, b) => a.priority - b.priority)[0];
            this.logger.debug(`Found SRV record for ${srv.query}: ${record.name}:${record.port}`);

            if (srv.type.startsWith('smtp') && !smtpRecord) {
              smtpRecord = record;
              smtpSecure = srv.type === 'smtp-ssl';
            } else if (srv.type.startsWith('imap') && !imapRecord) {
              imapRecord = record;
              imapTls = srv.type === 'imap-ssl';
            }
          }
        } catch {
          // SRV record not found, continue
        }
      }

      if (smtpRecord && imapRecord) {
        return {
          success: true,
          config: {
            smtp: {
              host: smtpRecord.name,
              port: smtpRecord.port,
              secure: smtpSecure,
              authMethod: 'plain',
            },
            imap: {
              host: imapRecord.name,
              port: imapRecord.port,
              tls: imapTls,
            },
          },
          source: 'dns-srv',
          confidence: 'medium',
          warnings: ['Configuration discovered via DNS SRV records. Verify settings before use.'],
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`DNS SRV lookup failed: ${message}`);
    }

    return {
      success: false,
      source: 'dns-srv',
      confidence: 'low',
    };
  }

  /**
   * Try MX record-based heuristics as last resort
   */
  private async tryMxHeuristics(domain: string): Promise<AutodiscoveryResult> {
    try {
      const mxRecords = await resolveMx(domain);

      if (mxRecords && mxRecords.length > 0) {
        const primaryMx = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;
        this.logger.debug(`Primary MX for ${domain}: ${primaryMx}`);

        // Check for known hosting patterns in MX records
        const config = this.inferFromMxRecord(primaryMx, domain);
        if (config) {
          return {
            success: true,
            config,
            source: 'mx-heuristic',
            confidence: 'low',
            warnings: [
              'Configuration inferred from MX records. These settings may not be accurate.',
              'Please verify the configuration before saving.',
            ],
          };
        }

        // Generic fallback based on domain
        return {
          success: true,
          config: {
            smtp: {
              host: `smtp.${domain}`,
              port: 465,
              secure: true,
              authMethod: 'plain',
            },
            imap: {
              host: `imap.${domain}`,
              port: 993,
              tls: true,
            },
          },
          source: 'mx-heuristic',
          confidence: 'low',
          warnings: [
            'Configuration is a best guess based on common patterns.',
            `Tried smtp.${domain} and imap.${domain} - verify these servers exist.`,
            'Consider contacting your email provider for correct settings.',
          ],
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`MX lookup failed for ${domain}: ${message}`);
    }

    return {
      success: false,
      source: 'mx-heuristic',
      confidence: 'low',
    };
  }

  /**
   * Infer configuration from MX record patterns
   */
  private inferFromMxRecord(mxHost: string, domain: string): DiscoveredConfig | null {
    const mxLower = mxHost.toLowerCase();

    // Google Workspace
    if (mxLower.includes('google') || mxLower.includes('googlemail')) {
      return {
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true, authMethod: 'oauth2' },
        imap: { host: 'imap.gmail.com', port: 993, tls: true },
        provider: 'Google Workspace',
        requiresOAuth: true,
        requiresAppPassword: true,
      };
    }

    // Microsoft 365
    if (mxLower.includes('outlook') || mxLower.includes('microsoft') || mxLower.includes('protection.outlook')) {
      return {
        smtp: { host: 'smtp.office365.com', port: 587, secure: false, authMethod: 'login' },
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        provider: 'Microsoft 365',
        requiresOAuth: true,
      };
    }

    // Zoho
    if (mxLower.includes('zoho')) {
      return {
        smtp: { host: 'smtp.zoho.eu', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.zoho.eu', port: 993, tls: true },
        provider: 'Zoho',
      };
    }

    // ProtonMail
    if (mxLower.includes('protonmail') || mxLower.includes('proton')) {
      return {
        smtp: { host: '127.0.0.1', port: 1025, secure: false, authMethod: 'plain' },
        imap: { host: '127.0.0.1', port: 1143, tls: false },
        provider: 'ProtonMail',
        notes: 'Requires ProtonMail Bridge running locally',
      };
    }

    // Polish hosting - home.pl
    if (mxLower.includes('home.pl')) {
      return {
        smtp: { host: 'smtp.home.pl', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.home.pl', port: 993, tls: true },
        provider: 'home.pl',
      };
    }

    // Polish hosting - nazwa.pl
    if (mxLower.includes('nazwa.pl')) {
      return {
        smtp: { host: 'smtp.nazwa.pl', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.nazwa.pl', port: 993, tls: true },
        provider: 'nazwa.pl',
      };
    }

    return null;
  }

  /**
   * Parse Mozilla Autoconfig XML response
   */
  private parseAutoconfigXml(xml: string): DiscoveredConfig | null {
    try {
      // Simple XML parsing without external dependencies
      const getTagContent = (tag: string, content: string): string | null => {
        const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
      };

      const getServerBlock = (type: string, content: string): string | null => {
        const regex = new RegExp(`<(incomingServer|outgoingServer)[^>]*type="${type}"[^>]*>([\\s\\S]*?)</\\1>`, 'i');
        const match = content.match(regex);
        return match ? match[2] : null;
      };

      const smtpBlock = getServerBlock('smtp', xml);
      const imapBlock = getServerBlock('imap', xml);

      if (!smtpBlock || !imapBlock) {
        return null;
      }

      const smtpHost = getTagContent('hostname', smtpBlock);
      const smtpPort = getTagContent('port', smtpBlock);
      const smtpSocket = getTagContent('socketType', smtpBlock);

      const imapHost = getTagContent('hostname', imapBlock);
      const imapPort = getTagContent('port', imapBlock);
      const imapSocket = getTagContent('socketType', imapBlock);

      if (!smtpHost || !smtpPort || !imapHost || !imapPort) {
        return null;
      }

      const displayName = getTagContent('displayName', xml);

      return {
        smtp: {
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpSocket?.toUpperCase() === 'SSL',
          authMethod: 'plain',
        },
        imap: {
          host: imapHost,
          port: parseInt(imapPort, 10),
          tls: imapSocket?.toUpperCase() === 'SSL' || imapSocket?.toUpperCase() === 'STARTTLS',
        },
        displayName: displayName || undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to parse Autoconfig XML: ${message}`);
      return null;
    }
  }

  /**
   * Parse Microsoft Autodiscover XML response
   */
  private parseAutodiscoverXml(xml: string): DiscoveredConfig | null {
    try {
      const getProtocolBlock = (type: string, content: string): string | null => {
        const regex = new RegExp(`<Protocol>[\\s\\S]*?<Type>${type}</Type>[\\s\\S]*?</Protocol>`, 'gi');
        const match = content.match(regex);
        return match ? match[0] : null;
      };

      const getTagContent = (tag: string, content: string): string | null => {
        const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
      };

      const smtpBlock = getProtocolBlock('SMTP', xml);
      const imapBlock = getProtocolBlock('IMAP', xml);

      if (!smtpBlock || !imapBlock) {
        return null;
      }

      const smtpServer = getTagContent('Server', smtpBlock);
      const smtpPort = getTagContent('Port', smtpBlock);
      const smtpSSL = getTagContent('SSL', smtpBlock);

      const imapServer = getTagContent('Server', imapBlock);
      const imapPort = getTagContent('Port', imapBlock);
      const imapSSL = getTagContent('SSL', imapBlock);

      if (!smtpServer || !smtpPort || !imapServer || !imapPort) {
        return null;
      }

      return {
        smtp: {
          host: smtpServer,
          port: parseInt(smtpPort, 10),
          secure: smtpSSL?.toLowerCase() === 'on',
          authMethod: 'plain',
        },
        imap: {
          host: imapServer,
          port: parseInt(imapPort, 10),
          tls: imapSSL?.toLowerCase() === 'on',
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to parse Autodiscover XML: ${message}`);
      return null;
    }
  }

  /**
   * Fetch with timeout helper
   */
  private async fetchWithTimeout(
    url: string,
    timeout: number,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verify email configuration with actual credentials
   * Tests both SMTP and IMAP connections with full authentication
   *
   * @param config - The discovered email configuration
   * @param credentials - Email and password for authentication
   * @returns Verification result for both SMTP and IMAP
   *
   * @example
   * ```typescript
   * const result = await autodiscoveryService.discover('user@gmail.com');
   * if (result.success) {
   *   const verification = await autodiscoveryService.verifyConfig(
   *     result.config,
   *     { email: 'user@gmail.com', password: 'app-password' }
   *   );
   *   if (verification.smtp.success && verification.imap.success) {
   *     console.log('Configuration verified successfully');
   *   }
   * }
   * ```
   */
  async verifyConfig(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<VerificationResult> {
    this.logger.debug(`Verifying config for ${credentials.email}`);

    // Test both connections in parallel
    const [smtpResult, imapResult] = await Promise.allSettled([
      this.verifySmtp(config, credentials),
      this.verifyImap(config, credentials),
    ]);

    return {
      smtp:
        smtpResult.status === 'fulfilled'
          ? smtpResult.value
          : { success: false, error: smtpResult.reason?.message || 'SMTP verification failed' },
      imap:
        imapResult.status === 'fulfilled'
          ? imapResult.value
          : { success: false, error: imapResult.reason?.message || 'IMAP verification failed' },
    };
  }

  /**
   * Verify SMTP connection with authentication
   */
  private async verifySmtp(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ success: false, error: 'SMTP connection timeout' });
      }, this.VERIFICATION_TIMEOUT);

      try {
        const transport = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: credentials.email,
            pass: credentials.password,
          },
          connectionTimeout: this.VERIFICATION_TIMEOUT,
          greetingTimeout: 5000,
        });

        transport.verify((error) => {
          clearTimeout(timeoutId);
          transport.close();

          if (error) {
            const errorMessage = this.formatVerificationError(error);
            this.logger.debug(`SMTP verification failed: ${errorMessage}`);
            resolve({ success: false, error: errorMessage });
          } else {
            this.logger.debug('SMTP verification successful');
            resolve({ success: true });
          }
        });
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const message = error instanceof Error ? error.message : String(error);
        resolve({ success: false, error: message });
      }
    });
  }

  /**
   * Verify IMAP connection with authentication
   */
  private async verifyImap(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ success: false, error: 'IMAP connection timeout' });
      }, this.VERIFICATION_TIMEOUT);

      try {
        const imap = new Imap({
          user: credentials.email,
          password: credentials.password,
          host: config.imap.host,
          port: config.imap.port,
          tls: config.imap.tls,
          tlsOptions: { rejectUnauthorized: REJECT_UNAUTHORIZED },
          connTimeout: this.VERIFICATION_TIMEOUT,
          authTimeout: 5000,
        });

        imap.once('ready', () => {
          clearTimeout(timeoutId);
          this.logger.debug('IMAP verification successful');
          imap.end();
          resolve({ success: true });
        });

        imap.once('error', (error: Error) => {
          clearTimeout(timeoutId);
          const errorMessage = this.formatVerificationError(error);
          this.logger.debug(`IMAP verification failed: ${errorMessage}`);
          imap.end();
          resolve({ success: false, error: errorMessage });
        });

        imap.connect();
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const message = error instanceof Error ? error.message : String(error);
        resolve({ success: false, error: message });
      }
    });
  }

  /**
   * Format verification error for user-friendly display
   */
  private formatVerificationError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('auth') || message.includes('535') || message.includes('authentication')) {
      return 'Authentication failed - please check your email and password';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Connection timed out - server may be unreachable';
    }
    if (message.includes('enotfound') || message.includes('getaddrinfo')) {
      return 'Server not found - please check the server address';
    }
    if (message.includes('econnrefused')) {
      return 'Connection refused - server may be down or port may be blocked';
    }
    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      return 'SSL/TLS error - security certificate issue';
    }

    return error.message;
  }
}
