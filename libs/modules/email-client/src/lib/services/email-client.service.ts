import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { User } from '@accounting/common';
import {
  EmailReaderService,
  EmailSenderService,
  EmailConfigurationService,
  ReceivedEmail,
  FetchEmailsOptions,
} from '@accounting/email';

/**
 * Email Client Service
 *
 * Wrapper around EmailReaderService and EmailSenderService
 * for email client functionality with company-wide shared inbox.
 */
@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);

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

    const emails = await this.emailReaderService.fetchEmails(emailConfig.imap, {
      limit: options.limit || 50,
      unseenOnly: options.unseenOnly,
    });

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
    return this.emailReaderService.fetchEmails(emailConfig.imap, {
      limit: options.limit || 50,
      unseenOnly: options.unseenOnly,
    });
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

    return this.emailReaderService.listMailboxes(emailConfig.imap);
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
  }): Promise<void> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId);

    if (!emailConfig) {
      throw new BadRequestException('No email configuration for company');
    }

    this.logger.log(`Sending email from company ${user.companyId}, user ${user.id}`);

    await this.emailSenderService.sendEmailAndSave(emailConfig.smtp, emailConfig.imap, message);

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

    await this.emailReaderService.markAsSeen(emailConfig.imap, messageUids);
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

    await this.emailReaderService.deleteEmails(emailConfig.imap, messageUids);
    this.logger.log(`Deleted ${messageUids.length} messages`);
  }
}
