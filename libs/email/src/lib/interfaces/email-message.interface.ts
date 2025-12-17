/**
 * Email message structure for sending
 */
export interface EmailMessage {
  /**
   * Recipient email address(es)
   */
  to: string | string[];

  /**
   * Email subject
   */
  subject: string;

  /**
   * Plain text content
   */
  text?: string;

  /**
   * HTML content
   */
  html?: string;

  /**
   * Sender email (overrides default)
   */
  from?: string;

  /**
   * CC recipients
   */
  cc?: string | string[];

  /**
   * BCC recipients
   */
  bcc?: string | string[];

  /**
   * Reply-To address
   */
  replyTo?: string;

  /**
   * Email attachments
   */
  attachments?: EmailAttachment[];

  /**
   * Custom headers
   */
  headers?: Record<string, string>;
}

/**
 * Email attachment structure
 */
export interface EmailAttachment {
  /**
   * Attachment filename
   */
  filename: string;

  /**
   * Attachment content (Buffer, Stream, or string)
   */
  content?: Buffer | NodeJS.ReadableStream | string;

  /**
   * Path to file (alternative to content)
   */
  path?: string;

  /**
   * Content type (MIME type)
   */
  contentType?: string;

  /**
   * Content disposition (default: 'attachment')
   */
  contentDisposition?: 'attachment' | 'inline';
}

/**
 * Received email structure from IMAP
 */
export interface ReceivedEmail {
  /**
   * Email unique identifier
   */
  uid: number;

  /**
   * Message sequence number
   */
  seqno: number;

  /**
   * Email subject
   */
  subject: string;

  /**
   * Sender information
   */
  from: EmailAddress[];

  /**
   * Recipient information
   */
  to: EmailAddress[];

  /**
   * CC recipients
   */
  cc?: EmailAddress[];

  /**
   * Email date
   */
  date: Date;

  /**
   * Email flags (e.g., \Seen, \Flagged)
   */
  flags: string[];

  /**
   * Plain text body
   */
  text?: string;

  /**
   * HTML body
   */
  html?: string;

  /**
   * Email attachments
   */
  attachments?: ReceivedEmailAttachment[];

  /**
   * Email headers
   */
  headers?: Map<string, string[]>;
}

/**
 * Email address structure
 */
export interface EmailAddress {
  /**
   * Display name
   */
  name?: string;

  /**
   * Email address
   */
  address: string;
}

/**
 * Received email attachment structure
 */
export interface ReceivedEmailAttachment {
  /**
   * Attachment filename
   */
  filename: string;

  /**
   * Content type (MIME type)
   */
  contentType: string;

  /**
   * Attachment size in bytes
   */
  size: number;

  /**
   * Attachment content
   */
  content: Buffer;

  /**
   * Content ID (for inline attachments)
   */
  contentId?: string;
}

/**
 * Options for fetching emails from IMAP
 */
export interface FetchEmailsOptions {
  /**
   * Mailbox/folder name (default: 'INBOX')
   */
  mailbox?: string;

  /**
   * Maximum number of emails to fetch
   */
  limit?: number;

  /**
   * Fetch only unseen emails
   */
  unseenOnly?: boolean;

  /**
   * Mark emails as seen after fetching
   */
  markAsSeen?: boolean;

  /**
   * Search criteria (e.g., ['UNSEEN', ['SINCE', '2024-01-01']])
   */
  searchCriteria?: any[];
}
