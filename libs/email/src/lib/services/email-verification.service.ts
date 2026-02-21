import { Injectable, Logger } from '@nestjs/common';

import { ImapFlow } from 'imapflow';
import * as nodemailer from 'nodemailer';

import { DiscoveredConfig } from '../interfaces/autodiscovery.interface';

// TLS validation - configurable via env, defaults to true in production
const REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';

/**
 * Connection verification result
 */
export interface VerificationResult {
  smtp: { success: boolean; error?: string };
  imap: { success: boolean; error?: string };
}

/**
 * Service for verifying SMTP and IMAP connections using ImapFlow
 *
 * Performs actual connection tests with provided credentials
 * to validate that email configuration is working.
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly VERIFICATION_TIMEOUT = 10000; // 10 seconds for connection tests

  /**
   * Verify email configuration with actual credentials
   * Tests both SMTP and IMAP connections with full authentication
   *
   * @param config - The discovered email configuration
   * @param credentials - Email and password for authentication
   * @returns Verification result for both SMTP and IMAP
   */
  async verifyConfig(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<VerificationResult> {
    const domain = credentials.email.split('@')[1] || 'unknown';
    this.logger.debug('Verifying config', { domain });

    const [smtpResult, imapResult] = await Promise.allSettled([
      this.verifySmtp(config, credentials),
      this.verifyImap(config, credentials),
    ]);

    return {
      smtp:
        smtpResult.status === 'fulfilled'
          ? smtpResult.value
          : { success: false, error: smtpResult.reason?.message || 'SMTP verification failed' },
      imap:
        imapResult.status === 'fulfilled'
          ? imapResult.value
          : { success: false, error: imapResult.reason?.message || 'IMAP verification failed' },
    };
  }

  /**
   * Verify SMTP connection with authentication
   */
  async verifySmtp(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      let transport: nodemailer.Transporter | null = null;
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (transport) {
            transport.close();
          }
          resolve({ success: false, error: 'SMTP connection timeout' });
        }
      }, this.VERIFICATION_TIMEOUT);

      try {
        transport = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: credentials.email,
            pass: credentials.password,
          },
          tls: { rejectUnauthorized: REJECT_UNAUTHORIZED },
          connectionTimeout: this.VERIFICATION_TIMEOUT,
          greetingTimeout: 5000,
        });

        transport.verify((error) => {
          if (resolved) {
            transport?.close();
            return;
          }
          resolved = true;
          clearTimeout(timeoutId);
          transport?.close();

          if (error) {
            const errorMessage = this.formatVerificationError(error);
            this.logger.debug('SMTP verification failed', { error: errorMessage });
            resolve({ success: false, error: errorMessage });
          } else {
            this.logger.debug('SMTP verification successful');
            resolve({ success: true });
          }
        });
      } catch (error: unknown) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const message = error instanceof Error ? error.message : String(error);
          resolve({ success: false, error: message });
        }
      }
    });
  }

  /**
   * Verify IMAP connection with authentication using ImapFlow
   */
  async verifyImap(
    config: DiscoveredConfig,
    credentials: { email: string; password: string }
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      let resolved = false;
      let client: ImapFlow | null = null;

      const safeResolve = async (result: { success: boolean; error?: string }) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        if (client) {
          try {
            await client.logout();
          } catch {
            // Ignore cleanup errors
          }
        }
        resolve(result);
      };

      const timeoutId = setTimeout(() => {
        safeResolve({ success: false, error: 'IMAP connection timeout' });
      }, this.VERIFICATION_TIMEOUT);

      try {
        client = new ImapFlow({
          host: config.imap.host,
          port: config.imap.port,
          secure: config.imap.tls,
          auth: {
            user: credentials.email,
            pass: credentials.password,
          },
          tls: { rejectUnauthorized: REJECT_UNAUTHORIZED },
          logger: false,
        });

        // Handle connection errors
        client.on('error', (error: Error) => {
          const errorMessage = this.formatVerificationError(error);
          this.logger.debug('IMAP verification failed', { error: errorMessage });
          safeResolve({ success: false, error: errorMessage });
        });

        // Connect and verify
        client
          .connect()
          .then(() => {
            this.logger.debug('IMAP verification successful');
            safeResolve({ success: true });
          })
          .catch((error: Error) => {
            const errorMessage = this.formatVerificationError(error);
            this.logger.debug('IMAP verification failed', { error: errorMessage });
            safeResolve({ success: false, error: errorMessage });
          });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        safeResolve({ success: false, error: message });
      }
    });
  }

  /**
   * Format verification error for user-friendly display
   */
  formatVerificationError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('auth') || message.includes('535') || message.includes('authentication')) {
      return 'Authentication failed - please check your email and password';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Connection timed out - server may be unreachable';
    }
    if (message.includes('enotfound') || message.includes('getaddrinfo')) {
      return 'Server not found - please check the server address';
    }
    if (message.includes('econnrefused')) {
      return 'Connection refused - server may be down or port may be blocked';
    }
    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      return 'SSL/TLS error - security certificate issue';
    }

    return error.message;
  }
}
