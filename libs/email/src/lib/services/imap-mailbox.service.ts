import { Injectable, Logger } from '@nestjs/common';

import { ImapConfig } from '../interfaces/email-config.interface';
import {
  createImapFlowClient,
  sendClientIdentification,
  extractMailboxNames,
} from '../utils/imap-connection.factory';
import { findSentMailboxFromList, findDraftsMailboxFromList } from '../utils/imap-folder-discovery';

/**
 * Service for IMAP mailbox operations using ImapFlow
 *
 * Handles mailbox listing, creation, and folder discovery.
 * Separated from EmailReaderService for better maintainability.
 */
@Injectable()
export class ImapMailboxService {
  private readonly logger = new Logger(ImapMailboxService.name);

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
   * Append email to mailbox (e.g., save sent email to Sent folder)
   *
   * This is used after sending an email via SMTP to save a copy
   * in the IMAP Sent folder so it appears in the email client.
   *
   * @param imapConfig IMAP configuration
   * @param mailboxName Name of the mailbox (e.g., 'Sent')
   * @param rawMessage Raw MIME message buffer
   * @param flags IMAP flags to set (default: ['\\Seen'])
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
   * Find Sent mailbox name (handles different server conventions)
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
   * Find Drafts mailbox name (handles different server conventions)
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
}
