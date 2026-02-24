import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';

import { User, UserRole } from '@accounting/common';
import {
  EmailConfigurationService,
  EmailReaderService,
  EmailSenderService,
  FetchEmailsOptions,
  ImapConfig,
  PaginatedEmailsResult,
  ReceivedEmail,
  SmtpConfig,
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
    timeoutMs: number = IMAP_OPERATION_TIMEOUT
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new RequestTimeoutException(
            `Email operation '${operationName}' timed out after ${timeoutMs / 1000}s. ` +
              `The email server may be unreachable or experiencing issues. Please try again later.`
          )
        );
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
      if (
        err.message?.includes('AUTHENTICATIONFAILED') ||
        err.message?.includes('Invalid credentials')
      ) {
        this.logger.error(`IMAP authentication failed: ${err.message}`);
        throw new InternalServerErrorException(
          'Email authentication failed. Please verify the email configuration credentials.'
        );
      }

      if (
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('ENOTFOUND')
      ) {
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
    private readonly emailConfigService: EmailConfigurationService
  ) {}

  /**
   * Get email configuration for user based on their role
   * - ADMIN users: use System Admin shared email configuration
   * - Other users: use their company's email configuration
   */
  private async getEmailConfigForUser(user: User): Promise<{
    smtp: SmtpConfig;
    imap: ImapConfig;
  }> {
    // For ADMIN users, use System Admin shared email configuration
    if (user.role === UserRole.ADMIN) {
      const emailConfig = await this.emailConfigService.getDecryptedSystemAdminEmailConfig();

      if (!emailConfig) {
        throw new BadRequestException(
          'Brak konfiguracji email dla administratorów systemu. Skonfiguruj "Email System Admin" w ustawieniach.'
        );
      }

      this.logger.log(`Using System Admin email config for admin user ${user.id}`);
      return emailConfig;
    }

    // For non-ADMIN users, use company email configuration
    if (!user.companyId) {
      throw new BadRequestException('Użytkownik musi należeć do firmy');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
      user.companyId
    );

    if (!emailConfig) {
      throw new BadRequestException('Brak konfiguracji email dla firmy. Skonfiguruj email firmy.');
    }

    return emailConfig;
  }

  /**
   * Fetch inbox emails (real-time from IMAP)
   */
  async getInbox(user: User, options: Partial<FetchEmailsOptions> = {}): Promise<ReceivedEmail[]> {
    const emailConfig = await this.getEmailConfigForUser(user);

    this.logger.log(`Fetching inbox for user ${user.id} (role: ${user.role})`);

    const fetchOptions = { limit: options.limit || 20, unseenOnly: options.unseenOnly };

    try {
      return await this.withTimeout(
        this.emailReaderService.fetchEmails(emailConfig.imap, fetchOptions),
        'getInbox'
      );
    } catch (error) {
      const err = error as Error;
      if (
        err.message?.includes('Command failed') ||
        err.message?.includes('Email operation failed')
      ) {
        this.logger.warn(`IMAP fetchEmails failed (${err.message}), retrying once...`);
        return this.withTimeout(
          this.emailReaderService.fetchEmails(emailConfig.imap, fetchOptions),
          'getInbox-retry'
        );
      }
      throw error;
    }
  }

  /**
   * Fetch emails from specific folder
   */
  async getFolder(
    user: User,
    folderName: string,
    options: Partial<FetchEmailsOptions> = {}
  ): Promise<ReceivedEmail[]> {
    const emailConfig = await this.getEmailConfigForUser(user);

    return this.withTimeout(
      this.emailReaderService.fetchEmails(emailConfig.imap, {
        mailbox: folderName,
        limit: options.limit || 50,
        unseenOnly: options.unseenOnly,
      }),
      `getFolder:${folderName}`
    );
  }

  /**
   * List available mailboxes/folders
   */
  async listFolders(user: User): Promise<string[]> {
    const emailConfig = await this.getEmailConfigForUser(user);

    return this.withTimeout(this.emailReaderService.listMailboxes(emailConfig.imap), 'listFolders');
  }

  /**
   * Send email (with IMAP save to Sent folder)
   */
  async sendEmail(
    user: User,
    message: {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: Array<{ path: string; filename: string }>;
    }
  ): Promise<void> {
    const emailConfig = await this.getEmailConfigForUser(user);

    this.logger.log(`Sending email from user ${user.id} (role: ${user.role})`);

    await this.withTimeout(
      this.emailSenderService.sendEmailAndSave(emailConfig.smtp, emailConfig.imap, message),
      'sendEmail',
      30000 // 30 seconds for sending (longer timeout for SMTP + IMAP save)
    );

    this.logger.log(`Email sent and saved to Sent folder successfully`);
  }

  /**
   * Mark email as read (IMAP operation)
   */
  async markAsRead(user: User, messageUids: number[]): Promise<void> {
    const emailConfig = await this.getEmailConfigForUser(user);

    await this.withTimeout(
      this.emailReaderService.markAsSeen(emailConfig.imap, messageUids),
      'markAsRead'
    );
    this.logger.log(`Marked ${messageUids.length} messages as read`);
  }

  /**
   * Delete email - soft delete (move to Trash) or hard delete if no Trash folder or permanent=true
   */
  async deleteEmail(
    user: User,
    messageUids: number[],
    mailbox = 'INBOX',
    permanent = false
  ): Promise<void> {
    const emailConfig = await this.getEmailConfigForUser(user);

    if (!permanent) {
      // Try to find trash folder and move there
      const trashFolder = await this.withTimeout(
        this.emailReaderService.findTrashMailbox(emailConfig.imap),
        'findTrashMailbox'
      ).catch(() => null);

      if (trashFolder) {
        await this.withTimeout(
          this.emailReaderService.moveMessages(emailConfig.imap, messageUids, mailbox, trashFolder),
          'moveToTrash'
        );
        this.logger.log(`Moved ${messageUids.length} messages to Trash`);
        return;
      }
    }

    // Hard delete if no Trash or permanent=true
    await this.withTimeout(
      this.emailReaderService.deleteEmails(emailConfig.imap, messageUids),
      'deleteEmail'
    );
    this.logger.log(`Permanently deleted ${messageUids.length} messages`);
  }

  /**
   * Fetch single email by UID
   */
  async getEmail(user: User, uid: number): Promise<ReceivedEmail> {
    const emailConfig = await this.getEmailConfigForUser(user);

    this.logger.log(`Fetching email UID ${uid} for user ${user.id}`);

    const emails = await this.withTimeout(
      this.emailReaderService.fetchEmails(emailConfig.imap, {
        searchCriteria: [['UID', uid]],
        limit: 1,
        markAsSeen: true,
      }),
      `getEmail:${uid}`
    );

    if (emails.length === 0) {
      throw new BadRequestException(`Email not found: ${uid}`);
    }

    return emails[0];
  }
  /**
   * Fetch inbox emails with cursor-based pagination
   */
  async getInboxPaginated(
    user: User,
    options: { limit?: number; cursor?: number; direction?: 'before' | 'after' }
  ): Promise<PaginatedEmailsResult> {
    const emailConfig = await this.getEmailConfigForUser(user);
    return this.withTimeout(
      this.emailReaderService.fetchEmailsPaginated(emailConfig.imap, {
        mailbox: 'INBOX',
        limit: options.limit || 50,
        cursor: options.cursor,
        direction: options.direction,
      }),
      'getInboxPaginated'
    );
  }

  /**
   * Fetch folder emails with cursor-based pagination
   */
  async getFolderPaginated(
    user: User,
    folderName: string,
    options: { limit?: number; cursor?: number; direction?: 'before' | 'after' }
  ): Promise<PaginatedEmailsResult> {
    const emailConfig = await this.getEmailConfigForUser(user);
    return this.withTimeout(
      this.emailReaderService.fetchEmailsPaginated(emailConfig.imap, {
        mailbox: folderName,
        limit: options.limit || 50,
        cursor: options.cursor,
        direction: options.direction,
      }),
      `getFolderPaginated:${folderName}`
    );
  }

  /**
   * Update email flags
   */
  async updateFlags(
    user: User,
    uid: number,
    options: { add?: string[]; remove?: string[]; mailbox?: string }
  ): Promise<{ uid: number; flags: string[] }> {
    const emailConfig = await this.getEmailConfigForUser(user);
    const flags = await this.withTimeout(
      this.emailReaderService.updateFlags(emailConfig.imap, uid, options),
      `updateFlags:${uid}`
    );
    return { uid, flags };
  }

  /**
   * Move messages between mailboxes
   */
  async moveMessages(
    user: User,
    uids: number[],
    sourceMailbox: string,
    destinationMailbox: string
  ): Promise<void> {
    const emailConfig = await this.getEmailConfigForUser(user);
    await this.withTimeout(
      this.emailReaderService.moveMessages(
        emailConfig.imap,
        uids,
        sourceMailbox,
        destinationMailbox
      ),
      'moveMessages'
    );
  }

  /**
   * Search emails
   */
  async searchEmails(
    user: User,
    options: {
      query: string;
      mailbox?: string;
      field?: 'all' | 'subject' | 'from' | 'body';
      limit?: number;
      cursor?: number;
      direction?: 'before' | 'after';
    }
  ): Promise<PaginatedEmailsResult> {
    const emailConfig = await this.getEmailConfigForUser(user);
    return this.withTimeout(
      this.emailReaderService.searchEmails(emailConfig.imap, options),
      'searchEmails'
    );
  }

  /**
   * Get email attachment for download
   */
  async getEmailAttachment(
    user: User,
    uid: number,
    filename: string,
    mailbox?: string
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const emailConfig = await this.getEmailConfigForUser(user);
    const result = await this.withTimeout(
      this.emailReaderService.fetchEmailAttachment(emailConfig.imap, uid, filename, mailbox),
      `getAttachment:${uid}:${filename}`
    );
    if (!result) {
      throw new BadRequestException(`Attachment '${filename}' not found in email UID ${uid}`);
    }
    return result;
  }
}
