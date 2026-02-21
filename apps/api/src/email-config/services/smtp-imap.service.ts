import { BadRequestException, HttpException, Injectable } from '@nestjs/common';

import { ImapFlow } from 'imapflow';
import { simpleParser, type Source } from 'mailparser';
import * as nodemailer from 'nodemailer';

import { EmailConfigService } from './email-config.service';
import { EncryptionService } from './encryption.service';

// TLS validation - configurable via env, defaults to true
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

// CRITICAL: Enforce TLS validation in production environment
if (process.env.NODE_ENV === 'production' && !REJECT_UNAUTHORIZED) {
  throw new Error(
    'SECURITY ERROR: EMAIL_REJECT_UNAUTHORIZED cannot be disabled in production environment. ' +
      'This setting allows man-in-the-middle attacks. Remove the EMAIL_REJECT_UNAUTHORIZED=false ' +
      'environment variable or set it to true for production deployments.'
  );
}

// Security warning when TLS validation is disabled (non-production only)
if (!REJECT_UNAUTHORIZED) {
  console.warn(
    '⚠️  EMAIL_REJECT_UNAUTHORIZED is disabled. TLS certificate validation is OFF. This should only be used in development/testing environments.'
  );
}

/**
 * Error message sanitization map - prevents leaking internal details
 */
const EMAIL_ERROR_MAP: Record<string, string> = {
  ECONNREFUSED: 'Nie można połączyć się z serwerem email',
  ETIMEDOUT: 'Przekroczono limit czasu połączenia',
  EAUTH: 'Błąd uwierzytelniania - sprawdź dane logowania',
  ESOCKET: 'Błąd połączenia sieciowego',
  ENOTFOUND: 'Nie znaleziono serwera email',
  ECONNRESET: 'Połączenie zostało przerwane',
  EHOSTUNREACH: 'Serwer email jest nieosiągalny',
  CERT_HAS_EXPIRED: 'Certyfikat serwera wygasł',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Nie można zweryfikować certyfikatu serwera',
  SELF_SIGNED_CERT_IN_CHAIN: 'Serwer używa niezaufanego certyfikatu',
};

// Helper function to extract text from AddressObject or AddressObject[]
function getAddressText(address: { text?: string } | { text?: string }[] | undefined): string {
  if (!address) return '';
  if (Array.isArray(address)) {
    return address.map((a) => a.text || '').join(', ');
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

/** IMAP configuration for inbox check operations */
interface ImapCheckConfig {
  imapUser: string;
  imapPassword: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
}

/**
 * SMTP/IMAP Service for testing connections and sending/receiving emails
 * Uses nodemailer for SMTP and ImapFlow for IMAP operations
 */
@Injectable()
export class SmtpImapService {
  constructor(
    private emailConfigService: EmailConfigService,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Create ImapFlow client with standardized configuration
   */
  private createImapFlowClient(config: ImapCheckConfig): ImapFlow {
    return new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapTls,
      auth: {
        user: config.imapUser,
        pass: config.imapPassword,
      },
      tls: { rejectUnauthorized: REJECT_UNAUTHORIZED },
      logger: false,
    });
  }

  /**
   * Internal method to fetch emails from IMAP inbox using ImapFlow
   * Uses async/await for cleaner code flow
   */
  private async fetchFromImapInbox(
    config: ImapCheckConfig,
    limit: number
  ): Promise<EmailMessage[]> {
    const client = this.createImapFlowClient(config);
    const messages: EmailMessage[] = [];

    try {
      await client.connect();

      const lock = await client.getMailboxLock('INBOX');

      try {
        const mailboxInfo = client.mailbox;
        const total = mailboxInfo && typeof mailboxInfo !== 'boolean' ? mailboxInfo.exists : 0;

        if (total === 0) {
          return [];
        }

        // Calculate range - get last N messages
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:${total}`;

        // Fetch messages using sequence numbers
        for await (const message of client.fetch(range, {
          source: true,
        })) {
          try {
            if (message.source) {
              const parsed = await simpleParser(message.source as unknown as Source);
              messages.push({
                from: getAddressText(parsed.from),
                to: getAddressText(parsed.to),
                subject: parsed.subject || '',
                date: parsed.date || new Date(),
                text: parsed.text || '',
                html: parsed.html || undefined,
              });
            }
          } catch (parseError) {
            console.error('Error parsing email:', parseError);
          }
        }

        // Sort by date descending (newest first)
        messages.sort((a, b) => b.date.getTime() - a.date.getTime());
      } finally {
        lock.release();
      }

      return messages;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new BadRequestException(this.sanitizeEmailError(err, 'pobierania wiadomości'));
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Sanitizes email-related error messages to prevent leaking internal details
   * Maps known error codes to user-friendly Polish messages
   */
  private sanitizeEmailError(error: Error, operation: string): string {
    const errorCode = (error as NodeJS.ErrnoException).code;

    if (errorCode && EMAIL_ERROR_MAP[errorCode]) {
      return EMAIL_ERROR_MAP[errorCode];
    }

    // Check for authentication errors in message
    const message = error.message.toLowerCase();
    if (message.includes('auth') || message.includes('535') || message.includes('authentication')) {
      return EMAIL_ERROR_MAP['EAUTH'];
    }

    // For unknown errors, return generic message without exposing internals
    // Log the actual error for debugging (but don't expose to user)
    console.error(`[SmtpImapService] ${operation} error:`, error.message);

    return `Błąd ${operation}: Spróbuj ponownie później`;
  }

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
        tls: {
          rejectUnauthorized: REJECT_UNAUTHORIZED,
        },
        connectionTimeout: CONNECTION_TIMEOUT_MS,
      });

      await transporter.verify();

      return {
        success: true,
        message: 'Połączenie SMTP działa poprawnie',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new BadRequestException(this.sanitizeEmailError(err, 'SMTP'));
    }
  }

  /**
   * Test IMAP connection using ImapFlow
   * Connects and opens inbox in readonly mode to validate credentials
   */
  async testImapConnection(dto: TestImapDto): Promise<TestConnectionResult> {
    const client = new ImapFlow({
      host: dto.imapHost,
      port: dto.imapPort,
      secure: dto.imapTls ?? true,
      auth: {
        user: dto.imapUser,
        pass: dto.imapPassword,
      },
      tls: { rejectUnauthorized: REJECT_UNAUTHORIZED },
      logger: false,
    });

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const settleReject = (error: Error | BadRequestException) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        client.logout().catch(() => {});
        reject(
          error instanceof BadRequestException
            ? error
            : new BadRequestException(this.sanitizeEmailError(error, 'połączenia IMAP'))
        );
      };

      const settleResolve = (result: TestConnectionResult) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        client.logout().catch(() => {});
        resolve(result);
      };

      // Set timeout for the entire operation
      timeoutId = setTimeout(() => {
        settleReject(
          new BadRequestException('Błąd połączenia IMAP: Przekroczono limit czasu połączenia')
        );
      }, CONNECTION_TIMEOUT_MS);

      // Handle connection errors
      client.on('error', (err: Error) => {
        settleReject(err);
      });

      // Connect and test
      client
        .connect()
        .then(async () => {
          try {
            // Try to get mailbox lock to verify access
            const lock = await client.getMailboxLock('INBOX');
            lock.release();
            settleResolve({
              success: true,
              message: 'Połączenie IMAP działa poprawnie',
            });
          } catch (err) {
            settleReject(err instanceof Error ? err : new Error(String(err)));
          }
        })
        .catch((err: Error) => {
          settleReject(err);
        });
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
      // Re-throw NestJS HTTP exceptions (NotFoundException, etc.) as-is
      if (error instanceof HttpException) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw new BadRequestException(this.sanitizeEmailError(err, 'wysyłania emaila'));
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
      // Re-throw NestJS HTTP exceptions (NotFoundException, etc.) as-is
      if (error instanceof HttpException) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw new BadRequestException(this.sanitizeEmailError(err, 'wysyłania emaila firmowego'));
    }
  }

  /**
   * Check user's inbox and retrieve recent emails
   */
  async checkInbox(userId: string, limit: number = 10): Promise<EmailMessage[]> {
    const config = await this.emailConfigService.getUserConfig(userId);
    const imapPassword = await this.encryptionService.decrypt(config.imapPassword);

    return this.fetchFromImapInbox(
      {
        imapUser: config.imapUser,
        imapPassword,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        imapTls: config.imapTls,
      },
      limit
    );
  }

  /**
   * Check company's inbox and retrieve recent emails
   */
  async checkCompanyInbox(companyId: string, limit: number = 10): Promise<EmailMessage[]> {
    const config = await this.emailConfigService.getCompanyConfig(companyId);
    const imapPassword = await this.encryptionService.decrypt(config.imapPassword);

    return this.fetchFromImapInbox(
      {
        imapUser: config.imapUser,
        imapPassword,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        imapTls: config.imapTls,
      },
      limit
    );
  }
}
