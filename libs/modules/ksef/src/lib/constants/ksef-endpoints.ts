import { KsefEnvironment } from '@accounting/common';

export const KSEF_BASE_URLS: Record<KsefEnvironment, string> = {
  [KsefEnvironment.TEST]: 'https://api-test.ksef.mf.gov.pl',
  [KsefEnvironment.DEMO]: 'https://api-demo.ksef.mf.gov.pl',
  [KsefEnvironment.PRODUCTION]: 'https://api.ksef.mf.gov.pl',
};

export const KSEF_API_PATHS = {
  // Auth
  AUTH_CHALLENGE: '/auth/challenge',
  AUTH_TOKEN: '/auth/ksef-token',
  AUTH_XADES: '/auth/xades-signature',
  AUTH_STATUS: '/auth',
  TOKEN_REDEEM: '/auth/token/redeem',
  TOKEN_REFRESH: '/auth/token/refresh',

  // Security
  PUBLIC_KEY: '/security/public-key-certificates',

  // Sessions
  SESSION_ONLINE_OPEN: '/sessions/online',
  SESSION_ONLINE_INVOICES: '/sessions/online/{ref}/invoices',
  SESSION_ONLINE_CLOSE: '/sessions/online/{ref}/close',
  SESSION_ONLINE_STATUS: '/sessions/online/{ref}',
  SESSION_BATCH_OPEN: '/sessions/batch',
  SESSION_BATCH_CLOSE: '/sessions/batch/{ref}/close',
  SESSION_BATCH_STATUS: '/sessions/batch/{ref}',

  // Invoices
  INVOICE_GET: '/invoices/ksef/{ksefNumber}',
  INVOICE_QUERY_METADATA: '/invoices/query/metadata',
  INVOICE_EXPORTS: '/invoices/exports',
  INVOICE_EXPORT_STATUS: '/invoices/exports/{ref}',
} as const;

export const KSEF_DEFAULTS = {
  REQUEST_TIMEOUT_MS: 30_000,
  UPLOAD_TIMEOUT_MS: 120_000,
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1_000,
  SESSION_EXPIRY_HOURS: 12,
  MAX_INVOICES_PER_SESSION: 10_000,
  MAX_INVOICE_SIZE_BYTES: 1_048_576, // 1 MB
  PUBLIC_KEY_CACHE_TTL_MS: 24 * 60 * 60 * 1_000, // 24h
  JWT_REFRESH_BUFFER_MS: 2 * 60 * 1_000, // refresh 2 min before expiry
} as const;
