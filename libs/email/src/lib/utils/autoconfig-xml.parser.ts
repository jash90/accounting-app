import { type XMLParser } from 'fast-xml-parser';

import { type DiscoveredConfig } from '../interfaces/autodiscovery.interface';

/**
 * Extract value from parsed XML object
 * Handles both direct values and #text for text nodes
 */
function getValue(obj: Record<string, unknown> | undefined, key: string): string | null {
  if (!obj) return null;
  const val = obj[key];
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object' && '#text' in val) {
    return String((val as Record<string, unknown>)['#text']);
  }
  return null;
}

/**
 * Parse Mozilla Autoconfig XML response
 *
 * Parses the standard Mozilla Autoconfig XML format used by:
 * - Domain-hosted autoconfig (autoconfig.domain.com)
 * - Mozilla Thunderbird ISPDB
 * - Well-known locations (.well-known/autoconfig)
 *
 * @param xml - Raw XML string
 * @param xmlParser - Configured XMLParser instance
 * @returns DiscoveredConfig or null if parsing fails
 *
 * @example
 * ```typescript
 * const parser = new XMLParser({
 *   ignoreAttributes: false,
 *   attributeNamePrefix: '@_',
 *   textNodeName: '#text',
 * });
 * const config = parseAutoconfigXml(xmlResponse, parser);
 * ```
 */
export function parseAutoconfigXml(xml: string, xmlParser: XMLParser): DiscoveredConfig | null {
  try {
    const parsed = xmlParser.parse(xml);
    const config = parsed?.clientConfig || parsed?.ClientConfig;

    if (!config) {
      return null;
    }

    // Handle emailProvider which may be nested
    const provider = config.emailProvider || config.EmailProvider || config;

    // Find SMTP (outgoingServer) and IMAP (incomingServer) configurations
    let smtpConfig: Record<string, unknown> | null = null;
    let imapConfig: Record<string, unknown> | null = null;

    // Handle outgoingServer (SMTP)
    const outgoing = provider.outgoingServer || provider.OutgoingServer;
    if (outgoing) {
      const servers = Array.isArray(outgoing) ? outgoing : [outgoing];
      smtpConfig =
        servers.find(
          (s: Record<string, unknown>) =>
            s['@_type']?.toString().toLowerCase() === 'smtp' || !s['@_type']
        ) || servers[0];
    }

    // Handle incomingServer (IMAP preferred over POP3)
    const incoming = provider.incomingServer || provider.IncomingServer;
    if (incoming) {
      const servers = Array.isArray(incoming) ? incoming : [incoming];
      imapConfig =
        servers.find(
          (s: Record<string, unknown>) => s['@_type']?.toString().toLowerCase() === 'imap'
        ) || servers[0];
    }

    if (!smtpConfig || !imapConfig) {
      return null;
    }

    const smtpHost = getValue(smtpConfig, 'hostname') || getValue(smtpConfig, 'Hostname');
    const smtpPort = getValue(smtpConfig, 'port') || getValue(smtpConfig, 'Port');
    const smtpSocket = getValue(smtpConfig, 'socketType') || getValue(smtpConfig, 'SocketType');

    const imapHost = getValue(imapConfig, 'hostname') || getValue(imapConfig, 'Hostname');
    const imapPort = getValue(imapConfig, 'port') || getValue(imapConfig, 'Port');
    const imapSocket = getValue(imapConfig, 'socketType') || getValue(imapConfig, 'SocketType');

    if (!smtpHost || !smtpPort || !imapHost || !imapPort) {
      return null;
    }

    const displayName = getValue(provider, 'displayName') || getValue(provider, 'DisplayName');

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
  } catch {
    return null;
  }
}
