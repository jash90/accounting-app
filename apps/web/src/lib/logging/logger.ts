/* eslint-disable no-console */
/**
 * Centralized Logger Service
 *
 * Mirrors NestJS Logger pattern for consistent logging across frontend.
 * Provides context-prefixed logs that are:
 * - Suppressed in production (except errors)
 * - Formatted consistently for easier debugging
 *
 * Usage:
 *   const logger = createLogger('MyComponent');
 *   logger.debug('Processing started', { count: 5 });
 *   logger.error('Operation failed', error, { userId: '123' });
 */

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  constructor(private readonly context: string) {}

  /**
   * Debug level - only in development, for verbose debugging info
   */
  debug(message: string, ctx?: LogContext): void {
    if (import.meta.env.DEV) {
      console.debug(`[${this.context}] ${message}`, ctx ?? '');
    }
  }

  /**
   * Log level - only in development, for general info
   */
  log(message: string, ctx?: LogContext): void {
    if (import.meta.env.DEV) {
      console.log(`[${this.context}] ${message}`, ctx ?? '');
    }
  }

  /**
   * Warn level - only in development, for non-critical issues
   */
  warn(message: string, ctx?: LogContext): void {
    if (import.meta.env.DEV) {
      console.warn(`[${this.context}] ${message}`, ctx ?? '');
    }
  }

  /**
   * Error level - always logs (dev & prod), for critical issues
   * In production, this would integrate with error tracking (e.g., Sentry)
   */
  error(message: string, error?: unknown, ctx?: LogContext): void {
    // Always log errors, even in production
    console.error(`[${this.context}] ${message}`, error ?? '', ctx ?? '');

    // Production: integrate with error tracking service
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     extra: { ...ctx, context: this.context, message },
    //   });
    // }
  }
}

/**
 * Create a logger instance with the given context name.
 *
 * @param context - The context/component name for log prefixing
 * @returns Logger instance
 *
 * @example
 * const logger = createLogger('AuthService');
 * logger.error('Login failed', error, { email: 'user@example.com' });
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Re-export Logger type for type annotations
export type { Logger, LogContext };
