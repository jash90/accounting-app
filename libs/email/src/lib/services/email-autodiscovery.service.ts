import { Injectable, Logger } from '@nestjs/common';

import { XMLParser } from 'fast-xml-parser';

import { DiscoveryCacheService } from './discovery-cache.service';
import { DnsDiscoveryService } from './dns-discovery.service';
import { EmailVerificationService, VerificationResult } from './email-verification.service';
import { ProviderLookupService } from './provider-lookup.service';
import { AutodiscoveryResult, DiscoveredConfig } from '../interfaces/autodiscovery.interface';
import { parseAutoconfigXml } from '../utils/autoconfig-xml.parser';
import { parseAutodiscoverXml } from '../utils/autodiscover-xml.parser';
import { fetchWithTimeout } from '../utils/fetch-with-timeout';

// Re-export for backwards compatibility
export type { VerificationResult } from './email-verification.service';

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
 *
 * Security: Includes SSRF protection with domain validation and private IP blocking.
 */
@Injectable()
export class EmailAutodiscoveryService {
  private readonly logger = new Logger(EmailAutodiscoveryService.name);
  private readonly xmlParser: XMLParser;

  // Domain validation using simple character-based approach (avoids regex backtracking)
  // Valid domain: alphanumeric labels separated by dots, labels can contain hyphens but not at start/end
  private isValidDomainFormat(domain: string): boolean {
    if (domain.length > 253 || domain.length === 0) return false;
    const labels = domain.split('.');
    if (labels.length < 2) return false;
    for (const label of labels) {
      if (label.length === 0 || label.length > 63) return false;
      if (label.startsWith('-') || label.endsWith('-')) return false;
      for (const char of label) {
        const code = char.toLowerCase().charCodeAt(0);
        const isAlphanumeric = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
        if (!isAlphanumeric && char !== '-') return false;
      }
    }
    return true;
  }

  // Blocked hostname patterns to prevent SSRF (RFC1918 and special ranges)
  private readonly blockedPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // Link-local
    /^0\./, // Current network
    /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./, // Carrier-grade NAT
    /^198\.1[89]\./, // Benchmark testing
    /^::1$/, // IPv6 localhost
    /^fc00:/i, // IPv6 unique local
    /^fe80:/i, // IPv6 link-local
  ];

  constructor(
    private readonly cacheService: DiscoveryCacheService,
    private readonly providerLookup: ProviderLookupService,
    private readonly dnsDiscovery: DnsDiscoveryService,
    private readonly verificationService: EmailVerificationService
  ) {
    // Initialize XML parser with options to handle attributes and preserve structure
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
    });
  }

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

    // Validate domain format to prevent SSRF
    if (!this.isValidDomain(domain)) {
      return {
        success: false,
        source: 'known-provider',
        confidence: 'low',
        error: 'Invalid or blocked domain format',
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
   * Validate domain format to prevent SSRF attacks
   * Rejects malformed domains, IP addresses, and special hostnames
   */
  private isValidDomain(domain: string): boolean {
    // Check basic format using safe character-based validation
    if (!this.isValidDomainFormat(domain)) {
      this.logger.warn('Invalid domain format', { domain });
      return false;
    }

    // Check for blocked hostnames/IPs
    if (this.isBlockedHostname(domain)) {
      this.logger.warn('Blocked hostname detected', { domain });
      return false;
    }

    return true;
  }

  /**
   * Check if hostname is in blocked list (private IPs, localhost, etc.)
   */
  private isBlockedHostname(hostname: string): boolean {
    return this.blockedPatterns.some((pattern) => pattern.test(hostname));
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
    // Only use HTTPS for security - HTTP autoconfig is a SSRF risk
    const urls = [
      `https://autoconfig.${domain}/mail/config-v1.1.xml`,
      `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml`,
    ];

    for (const url of urls) {
      try {
        this.logger.debug('Trying Autoconfig URL', { url });
        const response = await fetchWithTimeout(url, 5000);

        if (response.ok) {
          const xmlText = await response.text();
          const config = parseAutoconfigXml(xmlText, this.xmlParser);

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
        const response = await fetchWithTimeout(url, 5000, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body,
        });

        if (response.ok) {
          const xmlText = await response.text();
          const config = parseAutodiscoverXml(xmlText, this.xmlParser);

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
      const response = await fetchWithTimeout(url, 5000);

      if (response.ok) {
        const xmlText = await response.text();
        const config = parseAutoconfigXml(xmlText, this.xmlParser);

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
   * Verify email configuration with actual credentials
   * Tests both SMTP and IMAP connections with full authentication
   *
   * Delegates to EmailVerificationService for the actual verification logic.
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

    return this.verificationService.verifyConfig(config, credentials);
  }
}
