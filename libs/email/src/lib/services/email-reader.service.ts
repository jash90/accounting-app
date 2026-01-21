import { Injectable, Logger } from '@nestjs/common';

import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

import { ImapConfig } from '../interfaces/email-config.interface';
import { ReceivedEmail, FetchEmailsOptions } from '../interfaces/email-message.interface';
import { convertParsedMailToReceivedEmail } from '../utils/email-message.parser';
import {
  createImapFlowClient,
  sendClientIdentification,
  buildSearchCriteria,
  extractMailboxNames,
} from '../utils/imap-connection.factory';
import { findSentMailboxFromList, findDraftsMailboxFromList } from '../utils/imap-folder-discovery';

/**
 * Service for reading emails via IMAP using ImapFlow
 *
 * @example
 * ```typescript
 * constructor(private emailReader: EmailReaderService) {}
 *
 * async readEmails() {
 *   const config = {
 *     host: 'mail-server123456.lh.pl',
 *     port: 993,
 *     tls: true,
 *     user: 'your@domain.pl',
 *     password: 'password'
 *   };
 *
 *   const emails = await this.emailReader.fetchEmails(config, {
 *     limit: 10,
 *     unseenOnly: true
 *   });
 * }
 * ```
 */
@Injectable()
export class EmailReaderService {
  private readonly logger = new Logger(EmailReaderService.name);

  /**
   * Fetch emails from IMAP server
   */
  async fetchEmails(
    imapConfig: ImapConfig,
    options: FetchEmailsOptions = {}
  ): Promise<ReceivedEmail[]> {
    const client = createImapFlowClient(imapConfig);
    const emails: ReceivedEmail[] = [];

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const mailbox = options.mailbox || 'INBOX';
      this.logger.log(`[IMAP] Attempting to open mailbox: "${mailbox}"`);

      const lock = await client.getMailboxLock(mailbox);

      try {
        const mailboxInfo = client.mailbox;
        const totalMessages =
          mailboxInfo && typeof mailboxInfo !== 'boolean' ? mailboxInfo.exists : 0;
        this.logger.log(`[IMAP] Opened mailbox: "${mailbox}", total messages: ${totalMessages}`);

        // Build search criteria
        const searchCriteria = buildSearchCriteria(options);
        const results = await client.search(searchCriteria, { uid: true });

        if (!results || results.length === 0) {
          this.logger.log('No emails found matching criteria');
          return [];
        }

        // Apply limit - get last N messages
        const limit = options.limit || 10;
        const uidsToFetch = results.slice(-limit);

        this.logger.log(`[IMAP] Fetching ${uidsToFetch.length} messages`);

        // Fetch messages using async iterator
        for await (const message of client.fetch(uidsToFetch, {
          uid: true,
          flags: true,
          envelope: true,
          source: true, // Get full RFC822 message for parsing
        })) {
          try {
            const email = await this.processMessage(message, client, options.markAsSeen);
            if (email) {
              emails.push(email);
            }
          } catch (parseError) {
            this.logger.error(
              `Error processing message UID ${message.uid}: ${(parseError as Error).message}`
            );
          }
        }

        this.logger.log(`Fetched ${emails.length} emails`);
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`IMAP connection error: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.logout().catch((err) => {
        this.logger.debug(`Logout error (non-critical): ${err.message}`);
      });
    }

    return emails;
  }

  /**
   * Process a single fetched message
   */
  private async processMessage(
    message: FetchMessageObject,
    client: ImapFlow,
    markAsSeen?: boolean
  ): Promise<ReceivedEmail | null> {
    if (!message.source) {
      this.logger.warn(`Message UID ${message.uid} has no source`);
      return null;
    }

    // Parse message with mailparser
    const parsed: ParsedMail = await simpleParser(message.source);
    const email = convertParsedMailToReceivedEmail(parsed, message.seq);

    // Set UID and flags from ImapFlow message
    email.uid = message.uid;
    email.flags = message.flags ? Array.from(message.flags) : [];

    // Mark as seen if requested
    if (markAsSeen && !email.flags.includes('\\Seen')) {
      try {
        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
      } catch (flagError) {
        this.logger.error(`Failed to mark email as seen: ${(flagError as Error).message}`);
      }
    }

    return email;
  }

  /**
   * Get list of available mailboxes/folders
   */
  async listMailboxes(imapConfig: ImapConfig): Promise<string[]> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const mailboxes = await client.list();
      return extractMailboxNames(mailboxes);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Mark emails as seen/unseen
   */
  async markAsSeen(
    imapConfig: ImapConfig,
    messageUids: number[],
    seen: boolean = true
  ): Promise<void> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const lock = await client.getMailboxLock('INBOX');

      try {
        if (seen) {
          await client.messageFlagsAdd(messageUids, ['\\Seen']);
        } else {
          await client.messageFlagsRemove(messageUids, ['\\Seen']);
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Delete emails by message UIDs
   */
  async deleteEmails(imapConfig: ImapConfig, messageUids: number[]): Promise<void> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const lock = await client.getMailboxLock('INBOX');

      try {
        // ImapFlow's messageDelete marks as deleted and expunges
        await client.messageDelete(messageUids, { uid: true });
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Find Sent mailbox name (handles different server conventions)
   *
   * Different email providers use different names for the Sent folder:
   * - Gmail: '[Gmail]/Sent Mail'
   * - Outlook: 'Sent Items'
   * - Standard: 'Sent'
   * - Polish servers: 'Wysłane' or 'Sent'
   *
   * @param imapConfig IMAP configuration
   * @returns Name of the Sent mailbox
   */
  async findSentMailbox(imapConfig: ImapConfig): Promise<string> {
    try {
      const boxes = await this.listMailboxes(imapConfig);
      return findSentMailboxFromList(boxes, this.logger);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding Sent mailbox: ${err.message}`);
      return 'Sent'; // Fallback
    }
  }

  /**
   * Append email to mailbox (e.g., save sent email to Sent folder)
   *
   * This is used after sending an email via SMTP to save a copy
   * in the IMAP Sent folder so it appears in the email client.
   *
   * @param imapConfig IMAP configuration
   * @param mailboxName Name of the mailbox (e.g., 'Sent')
   * @param rawMessage Raw MIME message buffer
   * @param flags IMAP flags to set (default: ['\\Seen'])
   *
   * @example
   * ```typescript
   * // After sending email via SMTP:
   * const sentFolder = await this.findSentMailbox(imapConfig);
   * await this.appendToMailbox(imapConfig, sentFolder, rawMessageBuffer, ['\\Seen']);
   * ```
   */
  async appendToMailbox(
    imapConfig: ImapConfig,
    mailboxName: string,
    rawMessage: Buffer,
    flags: string[] = ['\\Seen']
  ): Promise<void> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      await client.append(mailboxName, rawMessage, flags);
      this.logger.log(`Successfully appended email to ${mailboxName}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to append to ${mailboxName}: ${err.message}`);
      throw new Error(`Failed to save to ${mailboxName}: ${err.message}`);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Find Drafts mailbox name (handles different server conventions)
   *
   * Different email providers use different names for the Drafts folder:
   * - Gmail: '[Gmail]/Drafts'
   * - Outlook: 'Drafts'
   * - Standard: 'Drafts'
   * - Polish servers: 'Robocze' or 'Szkice'
   * - German servers: 'Entwürfe'
   *
   * @param imapConfig IMAP configuration
   * @returns Name of the Drafts mailbox
   */
  async findDraftsMailbox(imapConfig: ImapConfig): Promise<string> {
    try {
      const boxes = await this.listMailboxes(imapConfig);
      this.logger.log(`Available mailboxes: ${boxes.join(', ')}`);

      const result = findDraftsMailboxFromList(boxes, this.logger);

      if (result.needsCreation) {
        try {
          await this.createMailbox(imapConfig, 'Drafts');
          this.logger.log(`Successfully created 'Drafts' mailbox`);
          return 'Drafts';
        } catch (createError) {
          this.logger.error(`Failed to create Drafts folder: ${(createError as Error).message}`);
          throw new Error(
            `Drafts folder not found and could not be created. Available folders: ${boxes.join(', ')}`
          );
        }
      }

      return result.mailbox as string;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding Drafts mailbox: ${err.message}`);
      throw error;
    }
  }

  /**
   * Create a new mailbox on IMAP server
   */
  async createMailbox(imapConfig: ImapConfig, mailboxName: string): Promise<void> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      await client.mailboxCreate(mailboxName);
      this.logger.log(`Mailbox ${mailboxName} created successfully`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create mailbox ${mailboxName}: ${err.message}`);
      throw new Error(`Failed to create mailbox: ${err.message}`);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Append email to Drafts folder and return assigned UID
   *
   * @param imapConfig IMAP configuration
   * @param rawMessage Raw MIME message buffer
   * @returns Object containing assigned UID and mailbox name
   */
  async appendToDrafts(
    imapConfig: ImapConfig,
    rawMessage: Buffer
  ): Promise<{ uid: number; mailbox: string }> {
    const draftsMailbox = await this.findDraftsMailbox(imapConfig);
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      // ImapFlow's append returns the UID directly
      const appendResult = await client.append(draftsMailbox, rawMessage, ['\\Draft', '\\Seen']);

      // Get the UID from append result (handle false case)
      let uid = 0;
      if (appendResult && typeof appendResult !== 'boolean') {
        uid = appendResult.uid || Number(appendResult.uidValidity) || 0;
      }
      this.logger.log(`Draft appended with UID: ${uid}`);

      return { uid, mailbox: draftsMailbox };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to append draft: ${err.message}`);
      throw new Error(`Failed to save draft: ${err.message}`);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Fetch all drafts from IMAP Drafts folder
   *
   * @param imapConfig IMAP configuration
   * @param options Fetch options (limit, etc.)
   * @returns Array of draft emails with UIDs
   */
  async fetchDrafts(
    imapConfig: ImapConfig,
    options: FetchEmailsOptions = {}
  ): Promise<ReceivedEmail[]> {
    const draftsMailbox = await this.findDraftsMailbox(imapConfig);

    return this.fetchEmails(imapConfig, {
      ...options,
      mailbox: draftsMailbox,
    });
  }

  /**
   * Delete draft from IMAP by UID
   *
   * @param imapConfig IMAP configuration
   * @param uid Message UID to delete
   * @param mailbox Mailbox name (optional, will find Drafts if not provided)
   */
  async deleteDraftFromImap(imapConfig: ImapConfig, uid: number, mailbox?: string): Promise<void> {
    const draftsMailbox = mailbox || (await this.findDraftsMailbox(imapConfig));
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const lock = await client.getMailboxLock(draftsMailbox);

      try {
        await client.messageDelete([uid], { uid: true });
        this.logger.log(`Draft UID ${uid} deleted from IMAP`);
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Update draft in IMAP (delete old, append new)
   * IMAP doesn't support in-place updates, so we delete and re-append
   *
   * @param imapConfig IMAP configuration
   * @param oldUid UID of existing draft to replace
   * @param rawMessage New raw MIME message
   * @returns New UID and mailbox name
   */
  async updateDraftInImap(
    imapConfig: ImapConfig,
    oldUid: number,
    rawMessage: Buffer
  ): Promise<{ uid: number; mailbox: string }> {
    // Delete old version first
    try {
      await this.deleteDraftFromImap(imapConfig, oldUid);
    } catch (error) {
      // Log but continue - draft might not exist
      this.logger.warn(`Could not delete old draft UID ${oldUid}: ${(error as Error).message}`);
    }

    // Append new version
    return this.appendToDrafts(imapConfig, rawMessage);
  }
}
