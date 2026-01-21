import { Injectable, Logger } from '@nestjs/common';

import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

import { EmailReaderService } from './email-reader.service';
import { SmtpConfig, ImapConfig } from '../interfaces/email-config.interface';
import { EmailMessage } from '../interfaces/email-message.interface';

// CommonJS import - nodemailer's MailComposer lacks proper ESM exports
 
const MailComposer = require('nodemailer/lib/mail-composer');

/**
 * Service for sending emails via SMTP
 *
 * @example
 * ```typescript
 * constructor(private emailSender: EmailSenderService) {}
 *
 * async sendWelcomeEmail() {
 *   const config = {
 *     host: 'mail-server123456.lh.pl',
 *     port: 465,
 *     secure: true,
 *     auth: { user: 'your@domain.pl', pass: 'password' }
 *   };
 *
 *   await this.emailSender.sendEmail(config, {
 *     to: 'recipient@example.com',
 *     subject: 'Welcome!',
 *     html: '<p>Welcome to our platform!</p>'
 *   });
 * }
 * ```
 */
/** Cached transporter entry with creation timestamp */
interface CachedTransporter {
  transporter: Transporter;
  createdAt: number;
}

/** Default TTL for cached transporters (1 hour) */
const DEFAULT_TRANSPORTER_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private transporters: Map<string, CachedTransporter> = new Map();
  private readonly transporterTtlMs: number;

  constructor(private readonly emailReaderService: EmailReaderService) {
    this.transporterTtlMs =
      parseInt(process.env.EMAIL_TRANSPORTER_TTL_MS || '', 10) || DEFAULT_TRANSPORTER_TTL_MS;
  }

  /**
   * Send an email using SMTP configuration
   * Creates and caches transporter for reuse
   */
  async sendEmail(smtpConfig: SmtpConfig, message: EmailMessage): Promise<void> {
    // Debug logging for email sending initiation
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Email sending initiated', {
        to: this.maskEmail(Array.isArray(message.to) ? message.to[0] : message.to),
        subject: message.subject,
        from: message.from || smtpConfig.auth.user,
        smtpHost: smtpConfig.host,
        smtpPort: smtpConfig.port,
      });
    }

    try {
      const transporter = this.getOrCreateTransporter(smtpConfig);

      const mailOptions: nodemailer.SendMailOptions = {
        from: message.from || smtpConfig.auth.user,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        cc: Array.isArray(message.cc) ? message.cc.join(', ') : message.cc,
        bcc: Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc,
        replyTo: message.replyTo,
        attachments: message.attachments as nodemailer.SendMailOptions['attachments'],
        headers: message.headers,
      };

      const info = await transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${(info as { messageId?: string }).messageId}`);
      this.logger.debug(
        `Preview URL: ${nodemailer.getTestMessageUrl(info as nodemailer.SentMessageInfo)}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send email: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Send multiple emails in batch using Promise.allSettled for partial success handling
   * Returns results for each email, allowing caller to handle individual failures
   */
  async sendBatchEmails(
    smtpConfig: SmtpConfig,
    messages: EmailMessage[]
  ): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    // Debug logging for batch processing
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Batch email processing started', {
        totalCount: messages.length,
        smtpHost: smtpConfig.host,
        recipients: messages.map((m) => this.maskEmail(Array.isArray(m.to) ? m.to[0] : m.to)),
      });
    }

    const promises = messages.map((message) => this.sendEmail(smtpConfig, message));
    const results = await Promise.allSettled(promises);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason as Error).message);

    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Batch email processing completed', {
        totalCount: messages.length,
        succeeded,
        failed,
      });
    }

    if (failed > 0) {
      this.logger.warn(`Batch email: ${failed}/${messages.length} emails failed`, { errors });
    }

    return { succeeded, failed, errors };
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(smtpConfig: SmtpConfig): Promise<boolean> {
    try {
      const transporter = this.getOrCreateTransporter(smtpConfig);
      await transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`SMTP connection verification failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Get or create a nodemailer transporter for given config
   * Transporters are cached by config hash for reuse with TTL-based expiry
   */
  private getOrCreateTransporter(smtpConfig: SmtpConfig): Transporter {
    const configKey = this.getConfigKey(smtpConfig);
    const now = Date.now();

    // Clean up expired transporters periodically
    this.cleanupExpiredTransporters(now);

    const cached = this.transporters.get(configKey);
    if (cached && now - cached.createdAt < this.transporterTtlMs) {
      // Debug logging for cache hit
      if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
        this.logger.debug('Reusing cached SMTP transporter', {
          host: smtpConfig.host,
          port: smtpConfig.port,
          cacheSize: this.transporters.size,
          ageMs: now - cached.createdAt,
        });
      }
      return cached.transporter;
    }

    // Debug logging for new transporter creation
    if (process.env.ENABLE_EMAIL_DEBUG === 'true') {
      this.logger.debug('Creating new SMTP transporter', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.auth.user,
        reason: cached ? 'expired' : 'new',
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass,
      },
      ...(smtpConfig.tls && { tls: smtpConfig.tls }),
    });

    this.transporters.set(configKey, {
      transporter,
      createdAt: now,
    });
    this.logger.debug(`Created new SMTP transporter for ${smtpConfig.host}`);

    return transporter;
  }

  /**
   * Remove expired transporters from cache to prevent memory leaks
   */
  private cleanupExpiredTransporters(now: number): void {
    for (const [key, cached] of this.transporters) {
      if (now - cached.createdAt >= this.transporterTtlMs) {
        this.transporters.delete(key);
        this.logger.debug(`Removed expired transporter: ${key}`);
      }
    }
  }

  /**
   * Generate unique key for SMTP configuration
   */
  private getConfigKey(config: SmtpConfig): string {
    return `${config.host}:${config.port}:${config.auth.user}`;
  }

  /**
   * Clear cached transporters (useful for cleanup)
   */
  clearTransporters(): void {
    this.transporters.clear();
    this.logger.debug('Cleared all cached SMTP transporters');
  }

  /**
   * Mask email address for logging (PII protection)
   * @param email Full email address
   * @returns Masked email (***@domain.com)
   */
  private maskEmail(email: string): string {
    if (!email) return 'N/A';
    const [, domain] = email.split('@');
    return `***@${domain || 'unknown'}`;
  }

  /**
   * Send batch of emails with IMAP save to Sent folder
   *
   * Sends multiple emails sequentially, each saved to IMAP Sent folder.
   * For performance, use sendBatchEmails() if IMAP save not needed.
   *
   * @param smtpConfig SMTP configuration
   * @param imapConfig IMAP configuration
   * @param messages Array of email messages
   */
  async sendBatchEmailsAndSave(
    smtpConfig: SmtpConfig,
    imapConfig: ImapConfig,
    messages: EmailMessage[]
  ): Promise<void> {
    this.logger.log(`Sending batch of ${messages.length} emails with IMAP save`);

    for (const message of messages) {
      await this.sendEmailAndSave(smtpConfig, imapConfig, message);
    }

    this.logger.log(`Batch send complete: ${messages.length} emails sent and saved`);
  }

  /**
   * Send email via SMTP and save copy to IMAP Sent folder
   *
   * This method:
   * 1. Compiles email to raw MIME format using MailComposer
   * 2. Sends via SMTP
   * 3. Saves copy to IMAP Sent folder (fail-soft)
   *
   * @param smtpConfig SMTP configuration for sending
   * @param imapConfig IMAP configuration for saving to Sent
   * @param message Email message to send
   *
   * @example
   * ```typescript
   * await this.emailSenderService.sendEmailAndSave(smtpConfig, imapConfig, {
   *   to: 'recipient@example.com',
   *   subject: 'Test',
   *   text: 'Test message',
   * });
   * ```
   */
  async sendEmailAndSave(
    smtpConfig: SmtpConfig,
    imapConfig: ImapConfig,
    message: EmailMessage
  ): Promise<void> {
    const recipient = this.maskEmail(Array.isArray(message.to) ? message.to[0] : message.to);
    this.logger.log(`Sending email with IMAP save: ${recipient}`);

    // Step 1: Compile message to raw MIME format
    const mail = new MailComposer({
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments as Mail.Attachment[], // MailComposer types compatibility
      replyTo: message.replyTo,
      headers: message.headers,
    });

    const rawMessage: Buffer = await mail.compile().build();

    // Step 2: Send via SMTP using raw message
    // Build envelope recipients: TO + CC + BCC (all must be in RCPT TO)
    const allRecipients = [
      ...(Array.isArray(message.to) ? message.to : [message.to]),
      ...(message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : []),
      ...(message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : []),
    ];

    const transporter = this.getOrCreateTransporter(smtpConfig);
    await transporter.sendMail({
      envelope: {
        from: message.from || smtpConfig.auth.user,
        to: allRecipients,
      },
      raw: rawMessage,
    });

    this.logger.log(`Email sent successfully via SMTP to ${recipient}`);

    // Step 3: Save to IMAP Sent folder (fail-soft)
    try {
      const sentFolder = await this.emailReaderService.findSentMailbox(imapConfig);
      await this.emailReaderService.appendToMailbox(
        imapConfig,
        sentFolder,
        rawMessage,
        ['\\Seen'] // Mark as read
      );

      this.logger.log(`Email saved to ${sentFolder} folder via IMAP`);
    } catch (error) {
      const err = error as Error;
      // Log warning but don't fail - email was sent successfully
      this.logger.warn(`Failed to save email to Sent folder: ${err.message}`);
      this.logger.warn('Email sent successfully but not saved to IMAP Sent folder');
    }
  }
}
