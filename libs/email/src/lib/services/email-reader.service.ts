import { Injectable, Logger } from '@nestjs/common';
import { simpleParser, ParsedMail, AddressObject, Source } from 'mailparser';
import type * as ImapTypes from 'node-imap';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Imap = require('node-imap');
import { ImapConfig } from '../interfaces/email-config.interface';
import { ReceivedEmail, FetchEmailsOptions, EmailAddress } from '../interfaces/email-message.interface';

// TLS validation - secure by default, configurable via env
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

/**
 * Service for reading emails via IMAP
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
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(imapConfig);
      const emails: ReceivedEmail[] = [];

      imap.once('ready', () => {
        const mailbox = options.mailbox || 'INBOX';

        imap.openBox(mailbox, false, (err: Error | null, box: ImapTypes.Box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const searchCriteria = this.buildSearchCriteria(options);

          imap.search(searchCriteria, (err: Error | null, results: number[]) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              this.logger.log('No emails found matching criteria');
              imap.end();
              return resolve([]);
            }

            // Apply limit
            const limit = options.limit || 10;
            const messagesToFetch = results.slice(-limit);

            const fetch = imap.fetch(messagesToFetch, {
              bodies: '',
              struct: true,
            });

            // Track message processing promises to wait for all to complete
            const messagePromises: Promise<void>[] = [];

            fetch.on('message', (msg: ImapTypes.ImapMessage, seqno: number) => {
              // Create a promise for this message that waits for both attributes and body
              const messagePromise = new Promise<void>((resolveMessage) => {
                let messageAttrs: ImapTypes.ImapMessageAttributes | null = null;
                let parsedEmail: ReceivedEmail | null = null;
                let parseComplete = false;
                let attrsComplete = false;

                const tryComplete = () => {
                  if (parseComplete && attrsComplete && parsedEmail) {
                    // Both events completed - set UID and flags from attributes
                    if (messageAttrs) {
                      parsedEmail.uid = messageAttrs.uid;
                      parsedEmail.flags = messageAttrs.flags;
                    }
                    emails.push(parsedEmail);
                    resolveMessage();
                  }
                };

                msg.once('attributes', (attrs: ImapTypes.ImapMessageAttributes) => {
                  messageAttrs = attrs;
                  attrsComplete = true;
                  if (options.markAsSeen && !attrs.flags.includes('\\Seen')) {
                    imap.addFlags(attrs.uid, '\\Seen', (err: Error | null) => {
                      if (err) {
                        this.logger.error(`Failed to mark email as seen: ${err.message}`);
                      }
                    });
                  }
                  tryComplete();
                });

                msg.on('body', (stream: NodeJS.ReadableStream) => {
                  simpleParser(stream as unknown as Source, (err: Error | null, parsed: ParsedMail) => {
                    if (err) {
                      this.logger.error(`Error parsing email: ${err.message}`);
                    } else {
                      parsedEmail = this.convertParsedMailToReceivedEmail(parsed, seqno);
                    }
                    parseComplete = true;
                    tryComplete();
                  });
                });
              });
              messagePromises.push(messagePromise);
            });

            fetch.once('error', (err: Error) => {
              this.logger.error(`Fetch error: ${err.message}`);
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              // Wait for all message processing to complete before ending connection
              Promise.all(messagePromises).then(() => {
                this.logger.log(`Fetched ${emails.length} emails`);
                imap.end();
                // Resolve directly - don't wait for 'end' event which may not fire reliably
                resolve(emails);
              });
            });
          });
        });
      });

      imap.once('error', (err: Error) => {
        this.logger.error(`IMAP connection error: ${err.message}`);
        reject(err);
      });

      imap.once('end', () => {
        this.logger.debug('IMAP connection ended');
        resolve(emails);
      });

      imap.connect();
    });
  }

  /**
   * Get list of available mailboxes/folders
   */
  async listMailboxes(imapConfig: ImapConfig): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(imapConfig);

      imap.once('ready', () => {
        imap.getBoxes((err: Error | null, boxes: ImapTypes.MailBoxes) => {
          imap.end();

          if (err) {
            return reject(err);
          }

          const mailboxNames = this.extractMailboxNames(boxes);
          resolve(mailboxNames);
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  /**
   * Mark emails as seen/unseen
   */
  async markAsSeen(
    imapConfig: ImapConfig,
    messageIds: number[],
    seen: boolean = true
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(imapConfig);

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err: Error | null) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Always use \\Seen flag - add it when marking as seen, delete it when marking as unseen
          const flag = '\\Seen';
          const action = seen ? imap.addFlags : imap.delFlags;

          action.call(imap, messageIds, flag, (err: Error | null) => {
            imap.end();

            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  /**
   * Delete emails by message IDs
   */
  async deleteEmails(imapConfig: ImapConfig, messageIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(imapConfig);

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err: Error | null) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.addFlags(messageIds, '\\Deleted', (err: Error | null) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            imap.expunge((err: Error | null) => {
              imap.end();

              if (err) {
                return reject(err);
              }

              resolve();
            });
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  /**
   * Create IMAP connection instance
   */
  private createImapConnection(config: ImapConfig): InstanceType<typeof Imap> {
    return new Imap({
      host: config.host,
      port: config.port,
      tls: config.tls,
      user: config.user,
      password: config.password,
      tlsOptions: config.tlsOptions || { rejectUnauthorized: REJECT_UNAUTHORIZED },
      connTimeout: 30000,
      authTimeout: 15000,
    });
  }

  /**
   * Build IMAP search criteria from options
   */
  private buildSearchCriteria(options: FetchEmailsOptions): any[] {
    if (options.searchCriteria) {
      return options.searchCriteria;
    }

    return options.unseenOnly ? ['UNSEEN'] : ['ALL'];
  }

  /**
   * Convert mailparser ParsedMail to ReceivedEmail
   */
  private convertParsedMailToReceivedEmail(parsed: ParsedMail, seqno: number): ReceivedEmail {
    return {
      uid: 0, // Will be set from attributes
      seqno,
      subject: parsed.subject || '',
      from: this.convertAddressObject(parsed.from),
      to: this.convertAddressObject(parsed.to),
      cc: parsed.cc ? this.convertAddressObject(parsed.cc) : undefined,
      date: parsed.date || new Date(),
      flags: [],
      text: parsed.text,
      html: parsed.html ? parsed.html.toString() : undefined,
      attachments: parsed.attachments?.map((att: { filename?: string; contentType: string; size: number; content: Buffer; contentId?: string }) => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        contentId: att.contentId,
      })),
    };
  }

  /**
   * Convert mailparser AddressObject to EmailAddress array
   */
  private convertAddressObject(addressObj: AddressObject | AddressObject[] | undefined): EmailAddress[] {
    if (!addressObj) {
      return [];
    }

    const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];

    return addresses.flatMap(addr =>
      addr.value.map((v: { name?: string; address?: string }) => ({
        name: v.name,
        address: v.address || '',
      }))
    );
  }

  /**
   * Extract mailbox names from IMAP boxes structure
   */
  private extractMailboxNames(boxes: ImapTypes.MailBoxes, prefix = ''): string[] {
    const names: string[] = [];

    if (!boxes) {
      return names;
    }

    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}/${name}` : name;
      names.push(fullName);

      if (box && typeof box === 'object' && 'children' in box) {
        names.push(...this.extractMailboxNames((box as ImapTypes.Folder).children as ImapTypes.MailBoxes, fullName));
      }
    }

    return names;
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

      // Common Sent folder names (case-insensitive check)
      const sentNames = [
        'Sent',
        'Sent Items',
        'Sent Mail',
        '[Gmail]/Sent Mail',
        'Wysłane',
        'INBOX.Sent',
        'INBOX/Sent',
      ];

      for (const sentName of sentNames) {
        const found = boxes.find(box => box.toLowerCase() === sentName.toLowerCase());
        if (found) {
          this.logger.log(`Found Sent mailbox: ${found}`);
          return found;
        }
      }

      // Fallback to 'Sent' if not found
      this.logger.warn(`Sent mailbox not found, using default: 'Sent'`);
      return 'Sent';
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
    flags: string[] = ['\\Seen'],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(imapConfig);

      imap.once('ready', () => {
        imap.openBox(mailboxName, false, (err: Error) => {
          if (err) {
            imap.end();
            this.logger.error(`Failed to open mailbox ${mailboxName}: ${err.message}`);
            return reject(new Error(`Failed to open mailbox: ${err.message}`));
          }

          imap.append(rawMessage, { mailbox: mailboxName, flags }, (err: Error) => {
            imap.end();

            if (err) {
              this.logger.error(`Failed to append to ${mailboxName}: ${err.message}`);
              reject(new Error(`Failed to save to ${mailboxName}: ${err.message}`));
            } else {
              this.logger.log(`Successfully appended email to ${mailboxName}`);
              resolve();
            }
          });
        });
      });

      imap.once('error', (err: Error) => {
        this.logger.error(`IMAP connection error during append: ${err.message}`);
        reject(new Error(`IMAP connection failed: ${err.message}`));
      });

      imap.connect();
    });
  }
}
