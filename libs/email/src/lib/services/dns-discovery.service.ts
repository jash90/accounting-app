import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import { AutodiscoveryResult, SrvRecord } from '../interfaces/autodiscovery.interface';
import { ProviderLookupService } from './provider-lookup.service';

const resolveSrv = promisify(dns.resolveSrv);
const resolveMx = promisify(dns.resolveMx);

/**
 * Service for DNS-based email server discovery
 * Handles DNS SRV records and MX record heuristics
 */
@Injectable()
export class DnsDiscoveryService {
  private readonly logger = new Logger(DnsDiscoveryService.name);

  constructor(private readonly providerLookup: ProviderLookupService) {}

  /**
   * Discover email configuration using DNS SRV records
   * Queries for standard email service SRV records:
   * - _submission._tcp (SMTP submission)
   * - _smtps._tcp (SMTP over SSL)
   * - _imaps._tcp (IMAP over SSL)
   * - _imap._tcp (IMAP)
   *
   * @param domain Email domain to query
   * @returns Autodiscovery result with config if SRV records found
   */
  async tryDnsSrv(domain: string): Promise<AutodiscoveryResult> {
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
            // Sort by priority and take the first (lowest priority = highest preference)
            const record = records.sort((a, b) => a.priority - b.priority)[0];
            this.logger.debug('Found SRV record', {
              query: srv.query,
              host: record.name,
              port: record.port,
              priority: record.priority,
            });

            if (srv.type.startsWith('smtp') && !smtpRecord) {
              smtpRecord = record;
              smtpSecure = srv.type === 'smtp-ssl';
            } else if (srv.type.startsWith('imap') && !imapRecord) {
              imapRecord = record;
              imapTls = srv.type === 'imap-ssl';
            }
          }
        } catch {
          // SRV record not found for this query, continue trying others
        }
      }

      if (smtpRecord && imapRecord) {
        this.logger.log('DNS SRV discovery successful', {
          domain,
          smtpHost: smtpRecord.name,
          imapHost: imapRecord.name,
        });

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
      this.logger.debug('DNS SRV lookup failed', { domain, error: message });
    }

    return {
      success: false,
      source: 'dns-srv',
      confidence: 'low',
    };
  }

  /**
   * Discover email configuration using MX record heuristics
   * Falls back to pattern matching against known provider MX hostnames
   * and generic domain-based guessing as last resort
   *
   * @param domain Email domain to query
   * @returns Autodiscovery result with best-guess config
   */
  async tryMxHeuristics(domain: string): Promise<AutodiscoveryResult> {
    try {
      const mxRecords = await resolveMx(domain);

      if (mxRecords && mxRecords.length > 0) {
        // Sort by priority (lowest = highest preference) and get primary MX
        const primaryMx = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;
        this.logger.debug('Primary MX record found', { domain, mxHost: primaryMx });

        // Try to infer configuration from MX record patterns
        const inferredConfig = this.providerLookup.inferFromMxRecord(primaryMx, domain);
        if (inferredConfig) {
          return {
            success: true,
            config: inferredConfig,
            source: 'mx-heuristic',
            confidence: 'low',
            warnings: [
              'Configuration inferred from MX records. These settings may not be accurate.',
              'Please verify the configuration before saving.',
            ],
          };
        }

        // Generic fallback based on domain
        this.logger.debug('Using generic fallback for domain', { domain });
        return {
          success: true,
          config: this.providerLookup.generateGenericFallback(domain),
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
      this.logger.debug('MX lookup failed', { domain, error: message });
    }

    return {
      success: false,
      source: 'mx-heuristic',
      confidence: 'low',
    };
  }

  /**
   * Resolve MX records for a domain
   * Useful for external callers needing raw MX data
   * @param domain Email domain
   * @returns Array of MX records sorted by priority, or empty array on failure
   */
  async getMxRecords(domain: string): Promise<Array<{ priority: number; exchange: string }>> {
    try {
      const records = await resolveMx(domain);
      return records ? records.sort((a, b) => a.priority - b.priority) : [];
    } catch {
      return [];
    }
  }
}
