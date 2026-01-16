import { Injectable, Logger, BadRequestException, RequestTimeoutException, InternalServerErrorException } from '@nestjs/common';
import { User } from '@accounting/common';
import {
  EmailReaderService,
  EmailSenderService,
  EmailConfigurationService,
  ReceivedEmail,
  FetchEmailsOptions,
} from '@accounting/email';

/** Default timeout for IMAP operations in milliseconds */
const IMAP_OPERATION_TIMEOUT = 90000; // 90 seconds - Interia IMAP is slow

/**
 * Email Client Service
 *
 * Wrapper around EmailReaderService and EmailSenderService
 * for email client functionality with company-wide shared inbox.
 */
@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);

  /**
   * Wrap an async operation with a timeout
   * Returns a descriptive error instead of hanging indefinitely
   */
  private async withTimeout<T>(
    operation: Promise<T>,
    operationName: string,
    timeoutMs: number = IMAP_OPERATION_TIMEOUT,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new RequestTimeoutException(
          `Email operation '${operationName}' timed out after ${timeoutMs / 1000}s. ` +
          `The email server may be unreachable or experiencing issues. Please try again later.`
        ));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } catch (error) {
      if (error instanceof RequestTimeoutException) {
        this.logger.error(`IMAP operation '${operationName}' timed out after ${timeoutMs}ms`);
        throw error;
      }

      // Handle specific IMAP errors
      const err = error as Error;
      if (err.message?.includes('AUTHENTICATIONFAILED') || err.message?.includes('Invalid credentials')) {
        this.logger.error(`IMAP authentication failed: ${err.message}`);
        throw new InternalServerErrorException(
          'Email authentication failed. Please verify the email configuration credentials.'
        );
      }

      if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ETIMEDOUT') || err.message?.includes('ENOTFOUND')) {
        this.logger.error(`IMAP connection failed: ${err.message}`);
        throw new InternalServerErrorException(
          'Unable to connect to email server. Please check the server address and try again later.'
        );
      }

      this.logger.error(`IMAP operation '${operationName}' failed: ${err.message}`);
      throw new InternalServerErrorException(
        `Email operation failed: ${err.message || 'Unknown error'}`
      );
    }
  }

  constructor(
    private readonly emailReaderService: EmailReaderService,
    private readonly emailSenderService: EmailSenderService,
    private readonly emailConfigService: EmailConfigurationService,
  ) {}

  /**
   * Fetch inbox emails (real-time from IMAP)
   */
  async getInbox(user: User, options: Partial<FetchEmailsOptions> = {}): Promise<ReceivedEmail[]> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company. Please configure company email first.');
    }

    this.logger.log(`Fetching inbox for company ${user.companyId}, user ${user.id}`);

    const emails = await this.withTimeout(
      this.emailReaderService.fetchEmails(emailConfig.imap, {
        limit: options.limit || 50,
        unseenOnly: options.unseenOnly,
      }),
      'getInbox',
    );

    return emails;
  }

  /**
   * Fetch emails from specific folder
   */
  async getFolder(user: User, folderName: string, options: Partial<FetchEmailsOptions> = {}): Promise<ReceivedEmail[]> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    // Note: EmailReaderService currently doesn't support custom folder selection
    // Default to INBOX - folder selection can be added later
    return this.withTimeout(
      this.emailReaderService.fetchEmails(emailConfig.imap, {
        limit: options.limit || 50,
        unseenOnly: options.unseenOnly,
      }),
      `getFolder:${folderName}`,
    );
  }

  /**
   * List available mailboxes/folders
   */
  async listFolders(user: User): Promise<string[]> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    return this.withTimeout(
      this.emailReaderService.listMailboxes(emailConfig.imap),
      'listFolders',
    );
  }

  /**
   * Send email (with IMAP save to Sent folder)
   */
  async sendEmail(user: User, message: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{ path: string; filename: string }>;
  }): Promise<void> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    this.logger.log(`Sending email from company ${user.companyId}, user ${user.id}`);

    await this.withTimeout(
      this.emailSenderService.sendEmailAndSave(emailConfig.smtp, emailConfig.imap, message),
      'sendEmail',
      30000, // 30 seconds for sending (longer timeout for SMTP + IMAP save)
    );

    this.logger.log(`Email sent and saved to Sent folder successfully`);
  }

  /**
   * Mark email as read (IMAP operation)
   */
  async markAsRead(user: User, messageUids: number[]): Promise<void> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    await this.withTimeout(
      this.emailReaderService.markAsSeen(emailConfig.imap, messageUids),
      'markAsRead',
    );
    this.logger.log(`Marked ${messageUids.length} messages as read`);
  }

  /**
   * Delete email (move to Trash via IMAP)
   */
  async deleteEmail(user: User, messageUids: number[]): Promise<void> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    await this.withTimeout(
      this.emailReaderService.deleteEmails(emailConfig.imap, messageUids),
      'deleteEmail',
    );
    this.logger.log(`Deleted ${messageUids.length} messages`);
  }

  /**
   * Fetch single email by UID
   */
  async getEmail(user: User, uid: number): Promise<ReceivedEmail> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    this.logger.log(`Fetching email UID ${uid} for company ${user.companyId}`);

    const emails = await this.withTimeout(
      this.emailReaderService.fetchEmails(emailConfig.imap, {
        searchCriteria: [['UID', uid]],
        limit: 1,
        markAsSeen: true,
      }),
      `getEmail:${uid}`,
    );

    if (emails.length === 0) {
      throw new BadRequestException(`Email not found: ${uid}`);
    }

    return emails[0];
  }
}
