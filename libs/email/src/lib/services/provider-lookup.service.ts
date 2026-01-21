import { Injectable, Logger } from '@nestjs/common';
import { AutodiscoveryResult, DiscoveredConfig } from '../interfaces/autodiscovery.interface';
import { PROVIDER_LOOKUP } from '../data/known-providers';

/**
 * Service for looking up known email providers and inferring configuration from MX records
 */
@Injectable()
export class ProviderLookupService {
  private readonly logger = new Logger(ProviderLookupService.name);

  /**
   * Check if domain matches a known email provider
   * @param domain Email domain to lookup
   * @returns Autodiscovery result with provider config if found
   */
  checkKnownProviders(domain: string): AutodiscoveryResult {
    const normalizedDomain = domain.toLowerCase();
    const provider = PROVIDER_LOOKUP.get(normalizedDomain);

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

      this.logger.log('Found known provider', {
        domain: normalizedDomain,
        provider: config.provider,
      });

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
   * Infer email configuration from MX record patterns
   * Used as a fallback when other discovery methods fail
   * @param mxHost Primary MX record hostname
   * @param domain Original email domain
   * @returns Discovered config or null if no pattern matched
   */
  inferFromMxRecord(mxHost: string, domain: string): DiscoveredConfig | null {
    const mxLower = mxHost.toLowerCase();

    // Google Workspace
    if (mxLower.includes('google') || mxLower.includes('googlemail')) {
      this.logger.debug('MX pattern matched: Google Workspace', { mxHost, domain });
      return {
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true, authMethod: 'oauth2' },
        imap: { host: 'imap.gmail.com', port: 993, tls: true },
        provider: 'Google Workspace',
        requiresOAuth: true,
        requiresAppPassword: true,
      };
    }

    // Microsoft 365
    if (
      mxLower.includes('outlook') ||
      mxLower.includes('microsoft') ||
      mxLower.includes('protection.outlook')
    ) {
      this.logger.debug('MX pattern matched: Microsoft 365', { mxHost, domain });
      return {
        smtp: { host: 'smtp.office365.com', port: 587, secure: false, authMethod: 'login' },
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        provider: 'Microsoft 365',
        requiresOAuth: true,
      };
    }

    // Zoho - detect region from MX record (zoho.com, zoho.eu, zoho.in, etc.)
    if (mxLower.includes('zoho')) {
      // Extract region suffix from MX record (e.g., mx.zoho.eu -> eu)
      const zohoMatch = mxLower.match(/zoho\.(\w+)/);
      const region = zohoMatch?.[1] || 'com'; // Default to .com if region not detected
      this.logger.debug('MX pattern matched: Zoho', { mxHost, domain, region });
      return {
        smtp: { host: `smtp.zoho.${region}`, port: 465, secure: true, authMethod: 'plain' },
        imap: { host: `imap.zoho.${region}`, port: 993, tls: true },
        provider: 'Zoho',
      };
    }

    // ProtonMail
    if (mxLower.includes('protonmail') || mxLower.includes('proton')) {
      this.logger.debug('MX pattern matched: ProtonMail', { mxHost, domain });
      return {
        smtp: { host: '127.0.0.1', port: 1025, secure: false, authMethod: 'plain' },
        imap: { host: '127.0.0.1', port: 1143, tls: false },
        provider: 'ProtonMail',
        notes: 'Requires ProtonMail Bridge running locally',
      };
    }

    // Polish hosting - home.pl
    if (mxLower.includes('home.pl')) {
      this.logger.debug('MX pattern matched: home.pl', { mxHost, domain });
      return {
        smtp: { host: 'smtp.home.pl', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.home.pl', port: 993, tls: true },
        provider: 'home.pl',
      };
    }

    // Polish hosting - nazwa.pl
    if (mxLower.includes('nazwa.pl')) {
      this.logger.debug('MX pattern matched: nazwa.pl', { mxHost, domain });
      return {
        smtp: { host: 'smtp.nazwa.pl', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.nazwa.pl', port: 993, tls: true },
        provider: 'nazwa.pl',
      };
    }

    // OVH
    if (mxLower.includes('ovh')) {
      this.logger.debug('MX pattern matched: OVH', { mxHost, domain });
      return {
        smtp: { host: 'ssl0.ovh.net', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'ssl0.ovh.net', port: 993, tls: true },
        provider: 'OVH',
      };
    }

    // Fastmail
    if (mxLower.includes('fastmail') || mxLower.includes('messagingengine')) {
      this.logger.debug('MX pattern matched: Fastmail', { mxHost, domain });
      return {
        smtp: { host: 'smtp.fastmail.com', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.fastmail.com', port: 993, tls: true },
        provider: 'Fastmail',
      };
    }

    // Yahoo
    if (mxLower.includes('yahoo') || mxLower.includes('yahoodns')) {
      this.logger.debug('MX pattern matched: Yahoo', { mxHost, domain });
      return {
        smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true, authMethod: 'plain' },
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        provider: 'Yahoo',
        requiresAppPassword: true,
      };
    }

    this.logger.debug('No MX pattern matched', { mxHost, domain });
    return null;
  }

  /**
   * Generate generic fallback configuration based on domain
   * Uses common patterns (smtp.domain.com, imap.domain.com)
   * @param domain Email domain
   * @returns Generic fallback config with low confidence
   */
  generateGenericFallback(domain: string): DiscoveredConfig {
    this.logger.debug('Generating generic fallback config', { domain });
    return {
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
    };
  }
}
