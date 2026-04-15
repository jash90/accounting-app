/**
 * TLS rejectUnauthorized setting for email connections.
 * Secure by default (true). Set EMAIL_REJECT_UNAUTHORIZED=false to disable
 * certificate verification (e.g., for self-signed certs in development).
 *
 * Centralized here to avoid duplicating the env read across 4+ files.
 */
export const EMAIL_REJECT_UNAUTHORIZED = process.env['EMAIL_REJECT_UNAUTHORIZED'] !== 'false';
