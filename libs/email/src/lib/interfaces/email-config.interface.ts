/**
 * SMTP Configuration for sending emails
 * Port 465 with SSL/TLS encryption is recommended
 */
export interface SmtpConfig {
  /**
   * SMTP server host (e.g., mail-server123456.lh.pl)
   */
  host: string;

  /**
   * SMTP port (typically 465 for SSL/TLS)
   */
  port: number;

  /**
   * Enable SSL/TLS encryption (recommended: true)
   */
  secure: boolean;

  /**
   * Authentication credentials
   */
  auth: {
    /**
     * Full email address (e.g., your@yourdomain.pl)
     */
    user: string;

    /**
     * Email account password
     */
    pass: string;
  };

  /**
   * TLS options for secure connection
   */
  tls?: {
    rejectUnauthorized?: boolean;
  };
}

/**
 * IMAP Configuration for reading emails
 * Port 993 with SSL/TLS encryption is recommended
 */
export interface ImapConfig {
  /**
   * IMAP server host (e.g., mail-server123456.lh.pl)
   */
  host: string;

  /**
   * IMAP port (typically 993 for SSL/TLS)
   */
  port: number;

  /**
   * Enable TLS encryption (recommended: true)
   */
  tls: boolean;

  /**
   * Authentication credentials
   */
  user: string;

  /**
   * Email account password
   */
  password: string;

  /**
   * TLS options for secure connection
   */
  tlsOptions?: {
    rejectUnauthorized?: boolean;
  };
}

/**
 * Complete email configuration combining SMTP and IMAP
 */
export interface EmailConfig {
  /**
   * SMTP configuration for sending emails
   */
  smtp: SmtpConfig;

  /**
   * IMAP configuration for reading emails
   */
  imap: ImapConfig;

  /**
   * Default sender information
   */
  defaults?: {
    from?: string;
    replyTo?: string;
  };
}

/**
 * Options for creating email configuration from environment variables
 */
export interface EmailConfigOptions {
  /**
   * Server number (e.g., 123456 from mail-server123456.lh.pl)
   */
  serverNumber: string;

  /**
   * Email address (e.g., your@yourdomain.pl)
   */
  emailAddress: string;

  /**
   * Email account password
   */
  password: string;

  /**
   * Custom SMTP port (default: 465)
   */
  smtpPort?: number;

  /**
   * Custom IMAP port (default: 993)
   */
  imapPort?: number;
}
