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
 * - httpOnly: Prevents XSS attacks from accessing tokens via JavaScript.
 * - secure:   Cookies only travel over HTTPS in production.
 * - sameSite: 'none' in production because the frontend (Vercel) and the
 *             API (Railway) live on different origins. Direct cross-origin
 *             requests — most importantly the Socket.IO WS handshake which
 *             cannot be rewritten through Vercel — would otherwise drop the
 *             cookie and disconnect with "no token". 'lax' in dev is fine
 *             because portless places web/api on the same parent domain.
 *             CSRF defense for cross-origin requests comes from the CORS
 *             allow-list (`CORS_ORIGINS`) and the production Origin-required
 *             check in `apps/api/src/main.ts`.
 * - path:     '/' so cookies are sent for /api AND /socket.io.
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options object
 */
export function getAccessTokenCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  };
}

/**
 * Get secure cookie options for refresh tokens.
 * Refresh tokens have longer expiry. Same `sameSite` rationale as above.
 * Note: Using same path '/' as access token to ensure consistent cookie clearing on logout.
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options object
 */
export function getRefreshTokenCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

/**
 * Get options for clearing a cookie (logout).
 * Must mirror the `sameSite`/`secure`/`path` of the set call so the browser
 * actually clears the cookie (browsers match on those attributes).
 *
 * @param isProduction - Whether the app is running in production
 * @returns Cookie options for clearing
 */
export function getClearCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}
