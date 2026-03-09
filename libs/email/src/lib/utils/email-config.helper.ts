import {
  type EmailConfig,
  type EmailConfigOptions,
  type ImapConfig,
  type SmtpConfig,
} from '../interfaces/email-config.interface';

// TLS validation - secure by default, configurable via env
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

/**
 * Helper class for creating email configurations
 * Simplifies configuration setup for LH.pl mail servers
 */
export class EmailConfigHelper {
  /**
   * Create email configuration from LH.pl server details
   *
   * @example
   * ```typescript
   * const config = EmailConfigHelper.createFromLHServer({
   *   serverNumber: '123456',
   *   emailAddress: 'contact@yourdomain.pl',
   *   password: 'your-password'
   * });
   * ```
   */
  static createFromLHServer(options: EmailConfigOptions): EmailConfig {
    const host = `mail-server${options.serverNumber}.lh.pl`;

    return {
      smtp: this.createSmtpConfig(host, options.emailAddress, options.password, options.smtpPort),
      imap: this.createImapConfig(host, options.emailAddress, options.password, options.imapPort),
      defaults: {
        from: options.emailAddress,
      },
    };
  }

  /**
   * Create SMTP configuration
   */
  static createSmtpConfig(
    host: string,
    user: string,
    password: string,
    port: number = 465
  ): SmtpConfig {
    return {
      host,
      port,
      secure: true, // Use SSL/TLS
      auth: {
        user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: REJECT_UNAUTHORIZED,
      },
    };
  }

  /**
   * Create IMAP configuration
   */
  static createImapConfig(
    host: string,
    user: string,
    password: string,
    port: number = 993
  ): ImapConfig {
    return {
      host,
      port,
      tls: true, // Use TLS
      user,
      password,
      tlsOptions: {
        rejectUnauthorized: REJECT_UNAUTHORIZED,
      },
    };
  }

  /**
   * Create email configuration from environment variables
   *
   * @example
   * ```typescript
   * // In your .env file:
   * // MAIL_SERVER_NUMBER=123456
   * // MAIL_ADDRESS=contact@domain.pl
   * // MAIL_PASSWORD=password
   *
   * const config = EmailConfigHelper.createFromEnv(process.env);
   * ```
   */
  static createFromEnv(env: NodeJS.ProcessEnv): EmailConfig {
    const serverNumber = env['MAIL_SERVER_NUMBER'];
    const emailAddress = env['MAIL_ADDRESS'];
    const password = env['MAIL_PASSWORD'];

    if (!serverNumber || !emailAddress || !password) {
      throw new Error(
        'Missing required environment variables: MAIL_SERVER_NUMBER, MAIL_ADDRESS, MAIL_PASSWORD'
      );
    }

    return this.createFromLHServer({
      serverNumber,
      emailAddress,
      password,
      smtpPort: env['MAIL_SMTP_PORT'] ? parseInt(env['MAIL_SMTP_PORT']) : 465,
      imapPort: env['MAIL_IMAP_PORT'] ? parseInt(env['MAIL_IMAP_PORT']) : 993,
    });
  }

  /**
   * Validate email configuration
   */
  static validateConfig(config: EmailConfig): boolean {
    const smtpValid =
      config.smtp &&
      config.smtp.host &&
      config.smtp.port &&
      config.smtp.auth.user &&
      config.smtp.auth.pass;

    const imapValid =
      config.imap &&
      config.imap.host &&
      config.imap.port &&
      config.imap.user &&
      config.imap.password;

    return Boolean(smtpValid && imapValid);
  }
}
