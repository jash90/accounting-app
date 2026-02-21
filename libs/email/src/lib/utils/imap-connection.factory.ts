import { type Logger } from '@nestjs/common';

import { ImapFlow, type ListResponse, type MailboxObject } from 'imapflow';

import { type ImapConfig } from '../interfaces/email-config.interface';
import { type FetchEmailsOptions } from '../interfaces/email-message.interface';

// TLS validation - secure by default, configurable via env
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

// Timeout configuration for serverless environments (Vercel functions have 60s limit)
const CONNECTION_TIMEOUT = 30000; // 30 seconds - time to establish connection
const GREETING_TIMEOUT = 10000; // 10 seconds - time to receive server greeting
const SOCKET_TIMEOUT = 60000; // 60 seconds - socket inactivity timeout

/**
 * ImapFlow client configuration interface
 */
export interface ImapFlowConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  logger: false;
  tls?: {
    rejectUnauthorized?: boolean;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

/**
 * Create ImapFlow client instance
 *
 * @param config - IMAP configuration
 * @returns Configured ImapFlow instance ready for connection
 */
export function createImapFlowClient(config: ImapConfig): ImapFlow {
  const imapFlowConfig: ImapFlowConfig = {
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
    tls: config.tlsOptions || { rejectUnauthorized: REJECT_UNAUTHORIZED },
    connectionTimeout: CONNECTION_TIMEOUT,
    greetingTimeout: GREETING_TIMEOUT,
    socketTimeout: SOCKET_TIMEOUT,
  };

  return new ImapFlow(imapFlowConfig);
}

/**
 * @deprecated Use createImapFlowClient instead
 * Legacy alias for backward compatibility during migration
 */
export const createImapConnection = createImapFlowClient;

/**
 * Send IMAP ID command to identify client to server
 *
 * Important for Polish email providers like Onet, WP, Interia that have anti-bot measures.
 * The ID command identifies the client application to the server.
 *
 * Note: ImapFlow sends ID automatically if server supports it.
 * This function is kept for logging purposes.
 *
 * @param client - ImapFlow client instance (after connect)
 * @param logger - Optional logger instance
 */
export async function sendClientIdentification(client: ImapFlow, logger?: Logger): Promise<void> {
  try {
    // ImapFlow handles ID command automatically during connect
    // We can access server info after connection
    if (client.serverInfo) {
      logger?.debug(`[IMAP] Server: ${client.serverInfo.vendor || 'unknown'}`);
    }
    if (client.capabilities) {
      logger?.debug(`[IMAP] Capabilities: ${Array.from(client.capabilities.keys()).join(', ')}`);
    }
  } catch {
    // ID command is optional - don't fail if not supported
    logger?.debug('[IMAP] Could not retrieve server identification');
  }
}

/**
 * Build ImapFlow search criteria from options
 *
 * ImapFlow uses object-based search criteria instead of array-based
 *
 * @param options - Fetch options containing search criteria
 * @returns ImapFlow search criteria object
 */
export function buildSearchCriteria(options: FetchEmailsOptions): Record<string, unknown> {
  if (options.searchCriteria) {
    // Convert legacy array-based criteria to ImapFlow format if needed
    return convertLegacySearchCriteria(options.searchCriteria);
  }

  if (options.unseenOnly) {
    return { seen: false };
  }

  return { all: true };
}

/**
 * Convert legacy node-imap array criteria to ImapFlow object format
 */
function convertLegacySearchCriteria(criteria: unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const item of criteria) {
    if (typeof item === 'string') {
      const upper = item.toUpperCase();
      switch (upper) {
        case 'ALL':
          result.all = true;
          break;
        case 'UNSEEN':
          result.seen = false;
          break;
        case 'SEEN':
          result.seen = true;
          break;
        case 'ANSWERED':
          result.answered = true;
          break;
        case 'UNANSWERED':
          result.answered = false;
          break;
        case 'DELETED':
          result.deleted = true;
          break;
        case 'UNDELETED':
          result.deleted = false;
          break;
        case 'FLAGGED':
          result.flagged = true;
          break;
        case 'UNFLAGGED':
          result.flagged = false;
          break;
        case 'DRAFT':
          result.draft = true;
          break;
        default:
          // Unknown criteria - pass as-is
          result[item.toLowerCase()] = true;
      }
    } else if (Array.isArray(item) && item.length >= 2) {
      // Handle [key, value] format like ['FROM', 'email@example.com']
      const [key, value] = item;
      if (typeof key === 'string') {
        result[key.toLowerCase()] = value;
      }
    }
  }

  // Default to all if no criteria
  if (Object.keys(result).length === 0) {
    result.all = true;
  }

  return result;
}

/**
 * Extract mailbox names from ImapFlow list response
 *
 * @param mailboxes - ImapFlow list response array
 * @returns Array of mailbox names with full paths
 */
export function extractMailboxNames(mailboxes: ListResponse[]): string[] {
  return mailboxes.map((mailbox) => mailbox.path);
}

/**
 * Helper type for mailbox info returned by ImapFlow
 */
export type { MailboxObject, ListResponse };
