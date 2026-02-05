import { type Logger } from '@nestjs/common';

/**
 * Common Sent folder names across different email providers
 * Listed in order of priority for matching
 */
export const SENT_FOLDER_NAMES = [
  'Sent',
  'Sent Items',
  'Sent Mail',
  '[Gmail]/Sent Mail',
  'Wysłane', // Polish
  'INBOX.Sent',
  'INBOX/Sent',
];

/**
 * Common Drafts folder names across different email providers
 * Listed in order of priority for matching
 */
export const DRAFT_FOLDER_NAMES = [
  'Drafts',
  'Draft',
  '[Gmail]/Drafts',
  '[Gmail]/Wersje robocze', // Gmail Polish
  'INBOX.Drafts',
  'INBOX/Drafts',
  'INBOX.Robocze',
  'INBOX.Szkice',
  'Robocze', // Polish
  'Szkice', // Polish alternative
  'Wersje robocze', // Polish Gmail-style
  'Entwürfe', // German
  'Borradores', // Spanish
  'Brouillons', // French
  'Bozze', // Italian
  'Concepten', // Dutch
];

/**
 * Partial match patterns for finding Drafts folder
 * Used as fallback when exact match fails
 */
export const DRAFT_PARTIAL_MATCHES = [
  'draft',
  'robocz',
  'szkic',
  'bozz',
  'brouillon',
  'entwürf',
  'borrador',
];

/**
 * Find Sent mailbox name from list of available mailboxes
 *
 * Different email providers use different names for the Sent folder:
 * - Gmail: '[Gmail]/Sent Mail'
 * - Outlook: 'Sent Items'
 * - Standard: 'Sent'
 * - Polish servers: 'Wysłane' or 'Sent'
 *
 * @param boxes - List of available mailbox names
 * @param logger - Optional logger for debugging
 * @returns Found mailbox name or 'Sent' as fallback
 */
export function findSentMailboxFromList(boxes: string[], logger?: Logger): string {
  // Check against known Sent folder names (case-insensitive)
  for (const sentName of SENT_FOLDER_NAMES) {
    const found = boxes.find((box) => box.toLowerCase() === sentName.toLowerCase());
    if (found) {
      logger?.log(`Found Sent mailbox: ${found}`);
      return found;
    }
  }

  // Fallback to 'Sent' if not found
  logger?.warn(`Sent mailbox not found, using default: 'Sent'`);
  return 'Sent';
}

/**
 * Find Drafts mailbox name from list of available mailboxes
 *
 * Different email providers use different names for the Drafts folder:
 * - Gmail: '[Gmail]/Drafts'
 * - Outlook: 'Drafts'
 * - Standard: 'Drafts'
 * - Polish servers: 'Robocze' or 'Szkice'
 * - German servers: 'Entwürfe'
 *
 * @param boxes - List of available mailbox names
 * @param logger - Optional logger for debugging
 * @returns Object with found mailbox name or null, and needsCreation flag
 */
export function findDraftsMailboxFromList(
  boxes: string[],
  logger?: Logger
): { mailbox: string | null; needsCreation: boolean } {
  // First try exact match (case-insensitive)
  for (const draftName of DRAFT_FOLDER_NAMES) {
    const found = boxes.find((box) => box.toLowerCase() === draftName.toLowerCase());
    if (found) {
      logger?.log(`Found Drafts mailbox: ${found}`);
      return { mailbox: found, needsCreation: false };
    }
  }

  // Try partial match - look for folders containing draft-related keywords
  for (const partial of DRAFT_PARTIAL_MATCHES) {
    const found = boxes.find((box) => box.toLowerCase().includes(partial));
    if (found) {
      logger?.log(`Found Drafts mailbox by partial match: ${found}`);
      return { mailbox: found, needsCreation: false };
    }
  }

  // Not found - needs to be created
  logger?.warn(`Drafts mailbox not found in available folders. Attempting to create 'Drafts'...`);
  return { mailbox: null, needsCreation: true };
}
