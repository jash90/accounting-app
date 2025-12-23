import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Imap = require('imap');
import {
  AutodiscoveryResult,
  DiscoveredConfig,
} from '../interfaces/autodiscovery.interface';
import { DiscoveryCacheService } from './discovery-cache.service';
import { ProviderLookupService } from './provider-lookup.service';
import { DnsDiscoveryService } from './dns-discovery.service';

// TLS validation - configurable via env, defaults to true in production
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

/**
 * Connection verification result
 */
export interface VerificationResult {
  smtp: { success: boolean; error?: string };
  imap: { success: boolean; error?: string };
}

/**
 * Email Autodiscovery Service
 *
 * Discovers email server configuration using multiple strategies:
 * 1. Known provider lookup (fastest, most reliable)
 * 2. Mozilla Autoconfig XML
 * 3. Microsoft Autodiscover protocol
 * 4. Mozilla Thunderbird ISPDB
 * 5. DNS SRV records
 * 6. MX record heuristics (fallback)
 *
 * Results are cached to improve performance on repeated lookups.
 */
@Injectable()
export class EmailAutodiscoveryService {
  private readonly logger = new Logger(EmailAutodiscoveryService.name);
  private readonly VERIFICATION_TIMEOUT = 10000; // 10 seconds for connection tests

  constructor(
    private readonly cacheService: DiscoveryCacheService,
    private readonly providerLookup: ProviderLookupService,
    private readonly dnsDiscovery: DnsDiscoveryService,
  ) {}

  /**
   * Main autodiscovery method - tries multiple strategies in order of reliability
   * @param email Email address to discover configuration for
   * @returns Autodiscovery result with config if successful
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
    const cached = this.cacheService.get(domain);
    if (cached) {
      this.logger.debug('Returning cached result', { domain });
      return cached;
    }

    this.logger.debug('Starting autodiscovery', { domain });

    // 1. Check known providers first (fastest and most reliable)
    const knownResult = this.providerLookup.checkKnownProviders(domain);
    if (knownResult.success) {
      this.logger.log('Found known provider', { domain, provider: knownResult.config?.provider });
      this.cacheService.set(domain, knownResult);
      return knownResult;
    }

    // 2. Try Mozilla Autoconfig
    const autoconfigResult = await this.tryAutoconfig(domain);
    if (autoconfigResult.success) {
      this.logger.log('Found Autoconfig', { domain });
      this.cacheService.set(domain, autoconfigResult);
      return autoconfigResult;
    }

    // 3. Try Microsoft Autodiscover
    const autodiscoverResult = await this.tryAutodiscover(domain, email);
    if (autodiscoverResult.success) {
      this.logger.log('Found Autodiscover', { domain });
      this.cacheService.set(domain, autodiscoverResult);
      return autodiscoverResult;
    }

    // 4. Try Mozilla Thunderbird ISPDB
    const ispdbResult = await this.tryIspdb(domain);
    if (ispdbResult.success) {
      this.logger.log('Found ISPDB entry', { domain });
      this.cacheService.set(domain, ispdbResult);
      return ispdbResult;
    }

    // 5. Try DNS SRV records
    const srvResult = await this.dnsDiscovery.tryDnsSrv(domain);
    if (srvResult.success) {
      this.logger.log('Found DNS SRV records', { domain });
      this.cacheService.set(domain, srvResult);
      return srvResult;
    }

    // 6. Last resort: MX record heuristics
    const mxResult = await this.dnsDiscovery.tryMxHeuristics(domain);
    if (mxResult.success) {
      this.logger.log('Using MX heuristics', { domain });
      this.cacheService.set(domain, mxResult);
      return mxResult;
    }

    this.logger.warn('No configuration found', { domain });
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
    this.cacheService.set(domain, failResult);
    return failResult;
  }

  /**
   * Clear cache for a specific domain or all domains
   * @param domain Optional domain to clear
   */
  clearCache(domain?: string): void {
    this.cacheService.clear(domain);
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

  /**
   * Try Mozilla Autoconfig XML discovery
   */
  private async tryAutoconfig(domain: string): Promise<AutodiscoveryResult> {
    const urls = [
      `https://autoconfig.${domain}/mail/config-v1.1.xml`,
      `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml`,
      `http://autoconfig.${domain}/mail/config-v1.1.xml`,
    ];

    for (const url of urls) {
      try {
        this.logger.debug('Trying Autoconfig URL', { url });
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
        this.logger.debug('Autoconfig failed', { url, error: message });
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
        this.logger.debug('Trying Autodiscover URL', { url });
        const response = await this.fetchWithTimeout(url, 5000, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
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
        this.logger.debug('Autodiscover failed', { url, error: message });
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
   */
  private async tryIspdb(domain: string): Promise<AutodiscoveryResult> {
    const url = `https://autoconfig.thunderbird.net/v1.1/${domain}`;

    try {
      this.logger.debug('Trying ISPDB URL', { url });
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
      this.logger.debug('ISPDB failed', { domain, error: message });
    }

    return {
      success: false,
      source: 'ispdb',
      confidence: 'low',
    };
  }

  /**
   * Parse Mozilla Autoconfig XML response
   */
  private parseAutoconfigXml(xml: string): DiscoveredConfig | null {
    try {
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
      this.logger.debug('Failed to parse Autoconfig XML', { error: message });
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
      this.logger.debug('Failed to parse Autodiscover XML', { error: message });
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
   */
  async verifyConfig(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<VerificationResult> {
    const domain = credentials.email.split('@')[1] || 'unknown';
    this.logger.debug('Verifying config', { domain });

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
      let transport: nodemailer.Transporter | null = null;
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (transport) {
            transport.close();
          }
          resolve({ success: false, error: 'SMTP connection timeout' });
        }
      }, this.VERIFICATION_TIMEOUT);

      try {
        transport = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: credentials.email,
            pass: credentials.password,
          },
          tls: { rejectUnauthorized: REJECT_UNAUTHORIZED },
          connectionTimeout: this.VERIFICATION_TIMEOUT,
          greetingTimeout: 5000,
        });

        transport.verify((error) => {
          if (resolved) {
            transport?.close();
            return;
          }
          resolved = true;
          clearTimeout(timeoutId);
          transport?.close();

          if (error) {
            const errorMessage = this.formatVerificationError(error);
            this.logger.debug('SMTP verification failed', { error: errorMessage });
            resolve({ success: false, error: errorMessage });
          } else {
            this.logger.debug('SMTP verification successful');
            resolve({ success: true });
          }
        });
      } catch (error: unknown) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const message = error instanceof Error ? error.message : String(error);
          resolve({ success: false, error: message });
        }
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
          this.logger.debug('IMAP verification failed', { error: errorMessage });
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
