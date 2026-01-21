/**
 * Email Client Module Error Codes
 *
 * Standardized error codes for the Email Client module following
 * the pattern established in MODULE_DEVELOPMENT.md
 */
export enum EmailClientErrorCode {
  // Configuration Errors (2000-2099)
  EMAIL_CONFIG_MISSING = 'EMAIL_CLIENT_2000',
  EMAIL_CONFIG_INVALID = 'EMAIL_CLIENT_2001',
  CREDENTIALS_INVALID = 'EMAIL_CLIENT_2002',

  // IMAP Connection Errors (2100-2199)
  IMAP_CONNECTION_FAILED = 'EMAIL_CLIENT_2100',
  IMAP_AUTHENTICATION_FAILED = 'EMAIL_CLIENT_2101',
  IMAP_TIMEOUT = 'EMAIL_CLIENT_2102',
  IMAP_SSL_ERROR = 'EMAIL_CLIENT_2103',
  IMAP_DISCONNECTED = 'EMAIL_CLIENT_2104',

  // SMTP Errors (2200-2299)
  SMTP_CONNECTION_FAILED = 'EMAIL_CLIENT_2200',
  SMTP_AUTHENTICATION_FAILED = 'EMAIL_CLIENT_2201',
  SMTP_SEND_FAILED = 'EMAIL_CLIENT_2202',

  // Draft Errors (2300-2399)
  DRAFT_NOT_FOUND = 'EMAIL_CLIENT_2300',
  DRAFT_ACCESS_DENIED = 'EMAIL_CLIENT_2301',
  DRAFT_SAVE_FAILED = 'EMAIL_CLIENT_2302',
  DRAFT_SYNC_FAILED = 'EMAIL_CLIENT_2303',

  // Message Errors (2400-2499)
  MESSAGE_NOT_FOUND = 'EMAIL_CLIENT_2400',
  MESSAGE_FETCH_FAILED = 'EMAIL_CLIENT_2401',
  MESSAGE_DELETE_FAILED = 'EMAIL_CLIENT_2402',
  MESSAGE_MOVE_FAILED = 'EMAIL_CLIENT_2403',

  // Attachment Errors (2500-2599)
  ATTACHMENT_TOO_LARGE = 'EMAIL_CLIENT_2500',
  ATTACHMENT_NOT_FOUND = 'EMAIL_CLIENT_2501',
  ATTACHMENT_UPLOAD_FAILED = 'EMAIL_CLIENT_2502',
  ATTACHMENT_TYPE_NOT_ALLOWED = 'EMAIL_CLIENT_2503',

  // AI Integration Errors (2600-2699)
  AI_NOT_CONFIGURED = 'EMAIL_CLIENT_2600',
  AI_COMPOSE_FAILED = 'EMAIL_CLIENT_2601',
  AI_REPLY_FAILED = 'EMAIL_CLIENT_2602',
}

/**
 * Human-readable error messages for each error code
 */
export const EmailClientErrorMessages: Record<EmailClientErrorCode, string> = {
  [EmailClientErrorCode.EMAIL_CONFIG_MISSING]: 'Email configuration not found for this user',
  [EmailClientErrorCode.EMAIL_CONFIG_INVALID]: 'Email configuration is invalid or incomplete',
  [EmailClientErrorCode.CREDENTIALS_INVALID]: 'Email credentials are invalid',

  [EmailClientErrorCode.IMAP_CONNECTION_FAILED]: 'Failed to connect to IMAP server',
  [EmailClientErrorCode.IMAP_AUTHENTICATION_FAILED]: 'IMAP authentication failed',
  [EmailClientErrorCode.IMAP_TIMEOUT]: 'IMAP operation timed out (90s limit)',
  [EmailClientErrorCode.IMAP_SSL_ERROR]: 'SSL/TLS error while connecting to IMAP server',
  [EmailClientErrorCode.IMAP_DISCONNECTED]: 'IMAP connection was unexpectedly closed',

  [EmailClientErrorCode.SMTP_CONNECTION_FAILED]: 'Failed to connect to SMTP server',
  [EmailClientErrorCode.SMTP_AUTHENTICATION_FAILED]: 'SMTP authentication failed',
  [EmailClientErrorCode.SMTP_SEND_FAILED]: 'Failed to send email via SMTP',

  [EmailClientErrorCode.DRAFT_NOT_FOUND]: 'Email draft not found',
  [EmailClientErrorCode.DRAFT_ACCESS_DENIED]: 'Access denied to this email draft',
  [EmailClientErrorCode.DRAFT_SAVE_FAILED]: 'Failed to save email draft',
  [EmailClientErrorCode.DRAFT_SYNC_FAILED]: 'Failed to sync draft with email server',

  [EmailClientErrorCode.MESSAGE_NOT_FOUND]: 'Email message not found',
  [EmailClientErrorCode.MESSAGE_FETCH_FAILED]: 'Failed to fetch email messages',
  [EmailClientErrorCode.MESSAGE_DELETE_FAILED]: 'Failed to delete email message',
  [EmailClientErrorCode.MESSAGE_MOVE_FAILED]: 'Failed to move email message',

  [EmailClientErrorCode.ATTACHMENT_TOO_LARGE]: 'Attachment exceeds maximum size limit (10MB)',
  [EmailClientErrorCode.ATTACHMENT_NOT_FOUND]: 'Attachment not found',
  [EmailClientErrorCode.ATTACHMENT_UPLOAD_FAILED]: 'Failed to upload attachment',
  [EmailClientErrorCode.ATTACHMENT_TYPE_NOT_ALLOWED]: 'Attachment type is not allowed',

  [EmailClientErrorCode.AI_NOT_CONFIGURED]: 'AI assistant is not configured for email composition',
  [EmailClientErrorCode.AI_COMPOSE_FAILED]: 'AI failed to compose email',
  [EmailClientErrorCode.AI_REPLY_FAILED]: 'AI failed to generate reply',
};
