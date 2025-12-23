import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { SmtpConfig } from '../interfaces/email-config.interface';
import { EmailMessage } from '../interfaces/email-message.interface';

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
@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private transporters: Map<string, Transporter> = new Map();

  /**
   * Send an email using SMTP configuration
   * Creates and caches transporter for reuse
   */
  async sendEmail(smtpConfig: SmtpConfig, message: EmailMessage): Promise<void> {
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
      this.logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info as nodemailer.SentMessageInfo)}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send email: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatchEmails(smtpConfig: SmtpConfig, messages: EmailMessage[]): Promise<void> {
    const promises = messages.map(message => this.sendEmail(smtpConfig, message));
    await Promise.all(promises);
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
   * Transporters are cached by config hash for reuse
   */
  private getOrCreateTransporter(smtpConfig: SmtpConfig): Transporter {
    const configKey = this.getConfigKey(smtpConfig);

    if (!this.transporters.has(configKey)) {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.auth.user,
          pass: smtpConfig.auth.pass,
        },
      });

      this.transporters.set(configKey, transporter);
      this.logger.debug(`Created new SMTP transporter for ${smtpConfig.host}`);
    }

    return this.transporters.get(configKey)!;
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
}
