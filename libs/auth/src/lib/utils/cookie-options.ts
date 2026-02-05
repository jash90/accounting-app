import { type CookieOptions } from 'express';

/**
 * Cookie names for JWT tokens
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Get secure cookie options for JWT tokens.
 *
 * Security considerations:
 * - httpOnly: Prevents XSS attacks from accessing tokens via JavaScript
 * - secure: Ensures cookies are only sent over HTTPS in production
 * - sameSite: Protects against CSRF attacks
 * - path: Restricts cookie scope to API endpoints
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options object
 */
export function getAccessTokenCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api',
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  };
}

/**
 * Get secure cookie options for refresh tokens.
 * Refresh tokens have longer expiry.
 * Note: Using same path '/api' as access token to ensure consistent cookie clearing on logout.
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options object
 */
export function getRefreshTokenCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api', // Same path as access token for consistent clearing
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

/**
 * Get options for clearing a cookie (logout).
 * Uses the same '/api' path as set functions for consistency.
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options for clearing
 */
export function getClearCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api',
  };
}
