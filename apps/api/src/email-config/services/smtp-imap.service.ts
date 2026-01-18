import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { EmailConfigService } from './email-config.service';
import { EncryptionService } from './encryption.service';

const Imap = require('node-imap');

// TLS validation - configurable via env, defaults to true in production
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

// Helper function to extract text from AddressObject or AddressObject[]
function getAddressText(address: { text?: string } | { text?: string }[] | undefined): string {
  if (!address) return '';
  if (Array.isArray(address)) {
    return address.map(a => a.text || '').join(', ');
  }
  return address.text || '';
}

export interface SendEmailDto {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  date: Date;
  text: string;
  html?: string;
}

export interface TestSmtpDto {
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPassword: string;
}

export interface TestImapDto {
  imapHost: string;
  imapPort: number;
  imapTls?: boolean;
  imapUser: string;
  imapPassword: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * SMTP/IMAP Service for testing connections and sending/receiving emails
 * Uses nodemailer for SMTP and node-imap for IMAP operations
 */
@Injectable()
export class SmtpImapService {
  constructor(
    private emailConfigService: EmailConfigService,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Test SMTP connection without sending an email
   * Uses nodemailer's verify() method to validate credentials
   */
  async testSmtpConnection(dto: TestSmtpDto): Promise<TestConnectionResult> {
    try {
      const transporter = nodemailer.createTransport({
        host: dto.smtpHost,
        port: dto.smtpPort,
        secure: dto.smtpSecure ?? true,
        auth: {
          user: dto.smtpUser,
          pass: dto.smtpPassword,
        },
        connectionTimeout: CONNECTION_TIMEOUT_MS,
      });

      await transporter.verify();

      return {
        success: true,
        message: 'Połączenie SMTP działa poprawnie',
      };
    } catch (error) {
      throw new BadRequestException(`Błąd połączenia SMTP: ${error.message}`);
    }
  }

  /**
   * Test IMAP connection without fetching emails
   * Opens inbox in readonly mode to validate credentials
   */
  async testImapConnection(dto: TestImapDto): Promise<TestConnectionResult> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout;
      let imap: any;
      let settled = false; // Prevent double resolve/reject

      const settleReject = (error: Error | BadRequestException) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        try {
          imap?.end();
        } catch {
          // Ignore cleanup errors
        }
        reject(error instanceof BadRequestException ? error : new BadRequestException(`Błąd połączenia IMAP: ${error.message}`));
      };

      const settleResolve = (result: TestConnectionResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        try {
          imap?.end();
        } catch {
          // Ignore cleanup errors
        }
        resolve(result);
      };

      try {
        imap = new Imap({
          user: dto.imapUser,
          password: dto.imapPassword,
          host: dto.imapHost,
          port: dto.imapPort,
          tls: dto.imapTls ?? true,
          tlsOptions: { rejectUnauthorized: REJECT_UNAUTHORIZED },
          connTimeout: CONNECTION_TIMEOUT_MS,
          authTimeout: CONNECTION_TIMEOUT_MS,
        });

        // Set timeout for the entire operation
        timeoutHandle = setTimeout(() => {
          settleReject(new BadRequestException('Błąd połączenia IMAP: Przekroczono limit czasu połączenia'));
        }, CONNECTION_TIMEOUT_MS);

        imap.once('ready', () => {
          imap.openBox('INBOX', true, (err: Error | null) => {
            if (err) {
              settleReject(err);
            } else {
              settleResolve({
                success: true,
                message: 'Połączenie IMAP działa poprawnie',
              });
            }
          });
        });

        imap.once('error', (err: Error) => {
          settleReject(err);
        });

        imap.connect();
      } catch (error) {
        settleReject(error);
      }
    });
  }

  /**
   * Send email using user's SMTP configuration
   */
  async sendEmail(userId: string, dto: SendEmailDto): Promise<void> {
    try {
      // Get user's email configuration
      const config = await this.emailConfigService.getUserConfig(userId);

      // Decrypt SMTP password
      const smtpPassword = await this.encryptionService.decrypt(config.smtpPassword);

      // Create nodemailer transporter with per-connection TLS config
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: REJECT_UNAUTHORIZED,
        },
      });

      // Verify transporter configuration
      await transporter.verify();

      // Send email
      await transporter.sendMail({
        from: config.smtpUser,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });
    } catch (error) {
      if (error.message?.includes('not found')) {
        throw error; // Re-throw NotFoundException
      }
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email using company's SMTP configuration
   */
  async sendCompanyEmail(companyId: string, dto: SendEmailDto): Promise<void> {
    try {
      // Get company's email configuration
      const config = await this.emailConfigService.getCompanyConfig(companyId);

      // Decrypt SMTP password
      const smtpPassword = await this.encryptionService.decrypt(config.smtpPassword);

      // Create nodemailer transporter with per-connection TLS config
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: REJECT_UNAUTHORIZED,
        },
      });

      // Verify transporter configuration
      await transporter.verify();

      // Send email
      await transporter.sendMail({
        from: config.smtpUser,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });
    } catch (error) {
      if (error.message?.includes('not found')) {
        throw error; // Re-throw NotFoundException
      }
      throw new BadRequestException(`Failed to send company email: ${error.message}`);
    }
  }

  /**
   * Check user's inbox and retrieve recent emails
   */
  async checkInbox(userId: string, limit: number = 10): Promise<EmailMessage[]> {
    // Get user's email configuration (async operations before Promise)
    const config = await this.emailConfigService.getUserConfig(userId);

    // Decrypt IMAP password
    const imapPassword = await this.encryptionService.decrypt(config.imapPassword);

    // Wrap callback-based IMAP operations in Promise
    return new Promise((resolve, reject) => {
      // Create IMAP connection
      const imap = new Imap({
        user: config.imapUser,
        password: imapPassword,
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapTls,
        tlsOptions: { rejectUnauthorized: REJECT_UNAUTHORIZED },
        connTimeout: CONNECTION_TIMEOUT_MS,
        authTimeout: CONNECTION_TIMEOUT_MS,
      });

      const messages: EmailMessage[] = [];
      const parsePromises: Promise<void>[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(new BadRequestException(`Failed to open inbox: ${err.message}`));
          }

          // Calculate fetch range (get last N messages)
          const total = box.messages.total;
          const start = Math.max(1, total - limit + 1);
          const end = total;

          if (total === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.seq.fetch(`${start}:${end}`, {
            bodies: '',
            struct: true,
          });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              // Wrap simpleParser in a promise to track completion
              const parsePromise = simpleParser(stream)
                .then((parsed) => {
                  messages.push({
                    from: getAddressText(parsed.from),
                    to: getAddressText(parsed.to),
                    subject: parsed.subject || '',
                    date: parsed.date || new Date(),
                    text: parsed.text || '',
                    html: parsed.html || undefined,
                  });
                })
                .catch((err) => {
                  console.error('Error parsing email:', err);
                });
              parsePromises.push(parsePromise);
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            reject(new BadRequestException(`Failed to fetch emails: ${err.message}`));
          });

          fetch.once('end', () => {
            // Wait for all parsing to complete before resolving
            Promise.all(parsePromises)
              .then(() => {
                imap.end();
                // Sort by date, newest first
                messages.sort((a, b) => b.date.getTime() - a.date.getTime());
                resolve(messages);
              })
              .catch((err) => {
                imap.end();
                reject(new BadRequestException(`Failed to parse emails: ${err.message}`));
              });
          });
        });
      });

      imap.once('error', (err) => {
        reject(new BadRequestException(`IMAP connection error: ${err.message}`));
      });

      imap.once('end', () => {
        // Connection closed
      });

      imap.connect();
    });
  }

  /**
   * Check company's inbox and retrieve recent emails
   */
  async checkCompanyInbox(companyId: string, limit: number = 10): Promise<EmailMessage[]> {
    // Get company's email configuration (async operations before Promise)
    const config = await this.emailConfigService.getCompanyConfig(companyId);

    // Decrypt IMAP password
    const imapPassword = await this.encryptionService.decrypt(config.imapPassword);

    // Wrap callback-based IMAP operations in Promise
    return new Promise((resolve, reject) => {
      // Create IMAP connection
      const imap = new Imap({
        user: config.imapUser,
        password: imapPassword,
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapTls,
        tlsOptions: { rejectUnauthorized: REJECT_UNAUTHORIZED },
        connTimeout: CONNECTION_TIMEOUT_MS,
        authTimeout: CONNECTION_TIMEOUT_MS,
      });

      const messages: EmailMessage[] = [];
      const parsePromises: Promise<void>[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(new BadRequestException(`Failed to open inbox: ${err.message}`));
          }

          // Calculate fetch range (get last N messages)
          const total = box.messages.total;
          const start = Math.max(1, total - limit + 1);
          const end = total;

          if (total === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.seq.fetch(`${start}:${end}`, {
            bodies: '',
            struct: true,
          });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              // Wrap simpleParser in a promise to track completion
              const parsePromise = simpleParser(stream)
                .then((parsed) => {
                  messages.push({
                    from: getAddressText(parsed.from),
                    to: getAddressText(parsed.to),
                    subject: parsed.subject || '',
                    date: parsed.date || new Date(),
                    text: parsed.text || '',
                    html: parsed.html || undefined,
                  });
                })
                .catch((err) => {
                  console.error('Error parsing email:', err);
                });
              parsePromises.push(parsePromise);
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            reject(new BadRequestException(`Failed to fetch emails: ${err.message}`));
          });

          fetch.once('end', () => {
            // Wait for all parsing to complete before resolving
            Promise.all(parsePromises)
              .then(() => {
                imap.end();
                // Sort by date, newest first
                messages.sort((a, b) => b.date.getTime() - a.date.getTime());
                resolve(messages);
              })
              .catch((err) => {
                imap.end();
                reject(new BadRequestException(`Failed to parse emails: ${err.message}`));
              });
          });
        });
      });

      imap.once('error', (err) => {
        reject(new BadRequestException(`IMAP connection error: ${err.message}`));
      });

      imap.once('end', () => {
        // Connection closed
      });

      imap.connect();
    });
  }
}
