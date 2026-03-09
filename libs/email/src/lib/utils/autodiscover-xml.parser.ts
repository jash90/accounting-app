import { type XMLParser } from 'fast-xml-parser';

import { type DiscoveredConfig } from '../interfaces/autodiscovery.interface';

/**
 * Extract value from parsed XML object (Microsoft format)
 * Handles multiple key formats and #text nodes
 */
function getValue(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key] || obj[key.toLowerCase()] || obj[key.toUpperCase()];
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object' && '#text' in val) {
    return String((val as Record<string, unknown>)['#text']);
  }
  return null;
}

/**
 * Parse Microsoft Autodiscover XML response
 *
 * Parses the Microsoft Exchange Autodiscover XML format used by:
 * - Exchange Online (Office 365)
 * - Exchange Server on-premises
 * - Outlook.com
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
 * const config = parseAutodiscoverXml(xmlResponse, parser);
 * ```
 */
export function parseAutodiscoverXml(xml: string, xmlParser: XMLParser): DiscoveredConfig | null {
  try {
    const parsed = xmlParser.parse(xml);

    // Navigate to the Account/Protocol section (handle various response formats)
    const autodiscover = parsed?.Autodiscover || parsed?.autodiscover;
    const response = autodiscover?.Response || autodiscover?.response;
    const account = response?.Account || response?.account;
    const protocols = account?.Protocol || account?.protocol;

    if (!protocols) {
      return null;
    }

    // Ensure protocols is an array
    const protocolList = Array.isArray(protocols) ? protocols : [protocols];

    // Find SMTP and IMAP protocol blocks
    const smtpProtocol = protocolList.find(
      (p: Record<string, unknown>) => (p.Type || p.type)?.toString().toUpperCase() === 'SMTP'
    );
    const imapProtocol = protocolList.find(
      (p: Record<string, unknown>) => (p.Type || p.type)?.toString().toUpperCase() === 'IMAP'
    );

    if (!smtpProtocol || !imapProtocol) {
      return null;
    }

    const smtpServer = getValue(smtpProtocol, 'Server');
    const smtpPort = getValue(smtpProtocol, 'Port');
    const smtpSSL = getValue(smtpProtocol, 'SSL');

    const imapServer = getValue(imapProtocol, 'Server');
    const imapPort = getValue(imapProtocol, 'Port');
    const imapSSL = getValue(imapProtocol, 'SSL');

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
  } catch {
    return null;
  }
}
