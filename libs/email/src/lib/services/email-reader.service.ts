import { Injectable, Logger } from '@nestjs/common';

import { FetchMessageObject, ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';

import { ImapConfig } from '../interfaces/email-config.interface';
import {
  FetchEmailsOptions,
  PaginatedEmailsResult,
  ReceivedEmail,
} from '../interfaces/email-message.interface';
import { convertParsedMailToReceivedEmail } from '../utils/email-message.parser';
import {
  buildSearchCriteria,
  createImapFlowClient,
  extractMailboxNames,
  sendClientIdentification,
} from '../utils/imap-connection.factory';
import {
  findDraftsMailboxFromList,
  findSentMailboxFromList,
  findTrashMailboxFromList,
} from '../utils/imap-folder-discovery';

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
        this.logger.log(`[IMAP] Mailbox lock acquired for "${mailbox}"`);
        this.logger.log(`[IMAP] Executing search with criteria: ${JSON.stringify(searchCriteria)}`);
        const results = await client.search(searchCriteria, { uid: true });
        this.logger.log(
          `[IMAP] Search returned ${Array.isArray(results) ? results.length : results} results`
        );

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
  /**
   * Fetch emails with cursor-based pagination
   */
  async fetchEmailsPaginated(
    imapConfig: ImapConfig,
    options: FetchEmailsOptions & { limit?: number }
  ): Promise<PaginatedEmailsResult> {
    const client = createImapFlowClient(imapConfig);
    const messages: ReceivedEmail[] = [];

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const mailbox = options.mailbox || 'INBOX';
      const lock = await client.getMailboxLock(mailbox);

      try {
        const mailboxInfo = client.mailbox;
        const total = mailboxInfo && typeof mailboxInfo !== 'boolean' ? mailboxInfo.exists : 0;

        // Get unseen count
        const unseenUidsResult = await client.search({ seen: false }, { uid: true });
        const unseenUids = Array.isArray(unseenUidsResult) ? unseenUidsResult : [];
        const unseen = unseenUids.length;

        // Get all UIDs
        const allUidsResult = await client.search({ all: true }, { uid: true });
        const allUids = Array.isArray(allUidsResult) ? allUidsResult : [];
        if (allUids.length === 0) {
          return { messages: [], total, unseen, nextCursor: null, prevCursor: null };
        }

        const limit = options.limit || 50;
        const cursor = options.cursor;
        const direction = options.direction || 'before';

        let uidsToFetch: number[];
        let nextCursor: number | null = null;
        let prevCursor: number | null = null;

        if (cursor) {
          const cursorIndex = allUids.indexOf(cursor);
          if (direction === 'before') {
            // Get emails before the cursor (older)
            const endIndex = cursorIndex < 0 ? allUids.length : cursorIndex;
            const startIndex = Math.max(0, endIndex - limit);
            uidsToFetch = allUids.slice(startIndex, endIndex);
            nextCursor = endIndex < allUids.length ? allUids[endIndex] : null;
            prevCursor = startIndex > 0 ? allUids[startIndex] : null;
          } else {
            // Get emails after the cursor (newer)
            const startIndex = cursorIndex < 0 ? 0 : cursorIndex + 1;
            const endIndex = Math.min(allUids.length, startIndex + limit);
            uidsToFetch = allUids.slice(startIndex, endIndex);
            nextCursor = endIndex < allUids.length ? allUids[endIndex] : null;
            prevCursor = startIndex > 0 ? allUids[startIndex - 1] : null;
          }
        } else {
          // No cursor: get the most recent emails
          const startIndex = Math.max(0, allUids.length - limit);
          uidsToFetch = allUids.slice(startIndex);
          nextCursor = null;
          prevCursor = startIndex > 0 ? allUids[startIndex] : null;
        }

        if (uidsToFetch.length === 0) {
          return { messages: [], total, unseen, nextCursor, prevCursor };
        }

        for await (const message of client.fetch(uidsToFetch, {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        })) {
          try {
            const email = await this.processMessage(message, client, options.markAsSeen);
            if (email) messages.push(email);
          } catch (parseError) {
            this.logger.error(
              `Error processing message UID ${message.uid}: ${(parseError as Error).message}`
            );
          }
        }

        return { messages, total, unseen, nextCursor, prevCursor };
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`IMAP paginated fetch error: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.logout().catch((err) => {
        this.logger.debug(`Logout error (non-critical): ${err.message}`);
      });
    }
  }

  /**
   * Search emails in a mailbox
   */
  async searchEmails(
    imapConfig: ImapConfig,
    options: {
      query: string;
      mailbox?: string;
      field?: 'all' | 'subject' | 'from' | 'body';
      limit?: number;
      cursor?: number;
      direction?: 'before' | 'after';
    }
  ): Promise<PaginatedEmailsResult> {
    const client = createImapFlowClient(imapConfig);
    const messages: ReceivedEmail[] = [];

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const mailbox = options.mailbox || 'INBOX';
      const lock = await client.getMailboxLock(mailbox);

      try {
        const { query, field = 'all', limit = 50 } = options;

        // Build search criteria based on field
        let searchCriteria: object;
        if (field === 'subject') {
          searchCriteria = { subject: query };
        } else if (field === 'from') {
          searchCriteria = { from: query };
        } else if (field === 'body') {
          searchCriteria = { body: query };
        } else {
          // all: search subject, from, body
          searchCriteria = { or: [{ subject: query }, { from: query }, { body: query }] };
        }

        const matchingUids = await client.search(searchCriteria, { uid: true });
        if (!matchingUids || matchingUids.length === 0) {
          return { messages: [], total: 0, unseen: 0, nextCursor: null, prevCursor: null };
        }

        // Apply cursor/pagination
        const cursor = options.cursor;
        const direction = options.direction || 'before';
        let uidsToFetch: number[];
        let nextCursor: number | null = null;
        let prevCursor: number | null = null;

        if (cursor) {
          const cursorIndex = matchingUids.indexOf(cursor);
          if (direction === 'before') {
            const endIndex = cursorIndex < 0 ? matchingUids.length : cursorIndex;
            const startIndex = Math.max(0, endIndex - limit);
            uidsToFetch = matchingUids.slice(startIndex, endIndex);
            nextCursor = endIndex < matchingUids.length ? matchingUids[endIndex] : null;
            prevCursor = startIndex > 0 ? matchingUids[startIndex] : null;
          } else {
            const startIndex = cursorIndex < 0 ? 0 : cursorIndex + 1;
            const endIndex = Math.min(matchingUids.length, startIndex + limit);
            uidsToFetch = matchingUids.slice(startIndex, endIndex);
            nextCursor = endIndex < matchingUids.length ? matchingUids[endIndex] : null;
            prevCursor = startIndex > 0 ? matchingUids[startIndex - 1] : null;
          }
        } else {
          const startIndex = Math.max(0, matchingUids.length - limit);
          uidsToFetch = matchingUids.slice(startIndex);
          nextCursor = null;
          prevCursor = startIndex > 0 ? matchingUids[startIndex] : null;
        }

        for await (const message of client.fetch(uidsToFetch, {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        })) {
          try {
            const email = await this.processMessage(message, client);
            if (email) messages.push(email);
          } catch (parseError) {
            this.logger.error(
              `Error processing message UID ${message.uid}: ${(parseError as Error).message}`
            );
          }
        }

        return {
          messages,
          total: matchingUids.length,
          unseen: messages.filter((m) => !m.flags.includes('\\Seen')).length,
          nextCursor,
          prevCursor,
        };
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`IMAP search error: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.logout().catch((err) => {
        this.logger.debug(`Logout error (non-critical): ${err.message}`);
      });
    }
  }

  /**
   * Move messages between mailboxes
   */
  async moveMessages(
    imapConfig: ImapConfig,
    uids: number[],
    sourceMailbox: string,
    destinationMailbox: string
  ): Promise<void> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const lock = await client.getMailboxLock(sourceMailbox);
      try {
        await client.messageMove(uids, destinationMailbox, { uid: true });
        this.logger.log(
          `Moved ${uids.length} messages from ${sourceMailbox} to ${destinationMailbox}`
        );
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`IMAP move error: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Update flags for messages
   */
  async updateFlags(
    imapConfig: ImapConfig,
    uid: number,
    options: { add?: string[]; remove?: string[]; mailbox?: string }
  ): Promise<string[]> {
    const client = createImapFlowClient(imapConfig);

    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);

      const mailbox = options.mailbox || 'INBOX';
      const lock = await client.getMailboxLock(mailbox);

      try {
        if (options.add && options.add.length > 0) {
          await client.messageFlagsAdd({ uid }, options.add);
        }
        if (options.remove && options.remove.length > 0) {
          await client.messageFlagsRemove({ uid }, options.remove);
        }

        // Fetch updated flags
        const resultFlags: string[] = [];
        for await (const message of client.fetch({ uid }, { uid: true, flags: true })) {
          resultFlags.push(...(message.flags ? Array.from(message.flags) : []));
        }
        return resultFlags;
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`IMAP updateFlags error: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Find Trash mailbox
   */
  async findTrashMailbox(imapConfig: ImapConfig): Promise<string | null> {
    try {
      const boxes = await this.listMailboxes(imapConfig);
      return findTrashMailboxFromList(boxes, this.logger);
    } catch (error) {
      this.logger.error(`Error finding Trash mailbox: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Fetch a single email attachment by filename and UID
   */
  async fetchEmailAttachment(
    imapConfig: ImapConfig,
    uid: number,
    filename: string,
    mailbox?: string
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const emails = await this.fetchEmails(imapConfig, {
      mailbox: mailbox || 'INBOX',
      searchCriteria: [['UID', uid]],
      limit: 1,
    });

    if (!emails || emails.length === 0) return null;
    const email = emails[0];
    if (!email.attachments) return null;

    const attachment = email.attachments.find(
      (a) => a.filename === filename || a.filename?.includes(filename)
    );

    if (!attachment) return null;

    return {
      buffer: attachment.content,
      contentType: attachment.contentType,
      filename: attachment.filename,
    };
  }
}
