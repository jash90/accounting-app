/**
 * JWT Service Injection Tokens
 *
 * These tokens are used to inject separate JwtService instances for access and refresh tokens.
 * This separation ensures that access tokens and refresh tokens use different secrets and expiration times.
 */

/**
 * Injection token for the access token JwtService
 * - Uses JWT_SECRET environment variable
 * - Shorter expiration time (default: 15m)
 */
export const ACCESS_JWT_SERVICE = 'ACCESS_JWT_SERVICE';

/**
 * Injection token for the refresh token JwtService
 * - Uses JWT_REFRESH_SECRET environment variable
 * - Longer expiration time (default: 7d)
 */
export const REFRESH_JWT_SERVICE = 'REFRESH_JWT_SERVICE';
