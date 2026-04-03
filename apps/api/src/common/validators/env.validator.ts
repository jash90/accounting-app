import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidator');

/**
 * Validates critical environment variables at application startup.
 * Throws on invalid configuration in production; warns in development.
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    const msg = 'JWT_SECRET must be at least 32 characters. Generate with: openssl rand -base64 64';
    if (isProduction) throw new Error(msg);
    logger.warn(msg);
  }

  // FIX-02: Block startup even in dev if secret is dangerously short
  if (jwtSecret && jwtSecret.length < 16) {
    throw new Error(
      'JWT_SECRET is dangerously short (< 16 chars). Application refused to start. ' +
        'Generate with: openssl rand -base64 64'
    );
  }

  const weakDefaults = [
    'jshdlfhalsdhflhjaslkdhfjklasjdlf',
    'CHANGE_ME_generate_secure_secret_with_crypto_randomBytes',
  ];
  if (jwtSecret && weakDefaults.includes(jwtSecret)) {
    const msg = 'JWT_SECRET is using a weak/default value. Rotate immediately!';
    if (isProduction) throw new Error(msg);
    logger.warn(msg);
  }

  // JWT_REFRESH_SECRET validation
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret || refreshSecret.length < 32) {
    const msg =
      'JWT_REFRESH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 64';
    if (isProduction) throw new Error(msg);
    logger.warn(msg);
  }

  if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
    const msg =
      'JWT_SECRET and JWT_REFRESH_SECRET must be different to maintain token separation security';
    if (isProduction) throw new Error(msg);
    logger.warn(msg);
  }

  // ENCRYPTION_KEY validation
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (isProduction && (!encryptionKey || encryptionKey.length < 32)) {
    throw new Error(
      "ENCRYPTION_KEY must be at least 32 characters in production. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // AI_API_KEY_ENCRYPTION_KEY validation
  const aiEncryptionKey = process.env.AI_API_KEY_ENCRYPTION_KEY;
  if (
    isProduction &&
    aiEncryptionKey &&
    (aiEncryptionKey.length < 32 || aiEncryptionKey === 'ai-encryption-key-32-chars-dev!!')
  ) {
    throw new Error(
      'AI_API_KEY_ENCRYPTION_KEY must be at least 32 cryptographically random characters in production'
    );
  }

  // CORS_ORIGINS validation in production
  const corsOrigins = process.env.CORS_ORIGINS;
  if (isProduction && (!corsOrigins || corsOrigins.includes('localhost'))) {
    logger.warn(
      'CORS_ORIGINS contains localhost or is empty in production. Configure proper production origins.'
    );
  }

  if (!isProduction) {
    logger.log('Environment validation passed (development mode — warnings only)');
  } else {
    logger.log('Environment validation passed (production mode — strict)');
  }
}
