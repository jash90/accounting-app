import { Injectable, Logger } from '@nestjs/common';
import * as Imap from 'node-imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { ImapConfig, ReceivedEmail, FetchEmailsOptions, EmailAddress } from '../interfaces/email-message.interface';

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

        imap.openBox(mailbox, false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const searchCriteria = this.buildSearchCriteria(options);

          imap.search(searchCriteria, (err, results) => {
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

            fetch.on('message', (msg, seqno) => {
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    this.logger.error(`Error parsing email: ${err.message}`);
                    return;
                  }

                  const email = this.convertParsedMailToReceivedEmail(parsed, seqno);
                  emails.push(email);
                });
              });

              msg.once('attributes', (attrs) => {
                if (options.markAsSeen && !attrs.flags.includes('\\Seen')) {
                  imap.addFlags(attrs.uid, '\\Seen', (err) => {
                    if (err) {
                      this.logger.error(`Failed to mark email as seen: ${err.message}`);
                    }
                  });
                }
              });
            });

            fetch.once('error', (err) => {
              this.logger.error(`Fetch error: ${err.message}`);
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              this.logger.log(`Fetched ${emails.length} emails`);
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
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
        imap.getBoxes((err, boxes) => {
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
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const flag = seen ? '\\Seen' : '';
          const action = seen ? imap.addFlags : imap.delFlags;

          action.call(imap, messageIds, flag, (err) => {
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
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.addFlags(messageIds, '\\Deleted', (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            imap.expunge((err) => {
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
  private createImapConnection(config: ImapConfig): Imap {
    return new Imap({
      host: config.host,
      port: config.port,
      tls: config.tls,
      user: config.user,
      password: config.password,
      tlsOptions: config.tlsOptions || { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000,
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
      attachments: parsed.attachments?.map(att => ({
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
      addr.value.map(v => ({
        name: v.name,
        address: v.address || '',
      }))
    );
  }

  /**
   * Extract mailbox names from IMAP boxes structure
   */
  private extractMailboxNames(boxes: any, prefix = ''): string[] {
    const names: string[] = [];

    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}/${name}` : name;
      names.push(fullName);

      if (box && typeof box === 'object' && 'children' in box) {
        names.push(...this.extractMailboxNames((box as any).children, fullName));
      }
    }

    return names;
  }
}
