/**
 * Token Storage Module
 *
 * SECURITY NOTE:
 * This module stores JWT tokens in localStorage, which is vulnerable to XSS attacks.
 * If an attacker can execute JavaScript on the page (via XSS), they can read these tokens.
 *
 * TODO: [SECURITY] Migrate to httpOnly cookies for token storage
 * - Requires backend changes to set httpOnly, Secure, SameSite cookies on login
 * - Backend should return tokens via Set-Cookie header instead of response body
 * - Frontend would no longer need direct token access (cookies sent automatically)
 * - Implement CSRF protection (double-submit cookie or synchronizer token pattern)
 *
 * Current mitigations:
 * - Short access token expiry (1h) limits exposure window
 * - Refresh tokens have separate expiry (7d) and rotation
 * - Content Security Policy (CSP) should be configured to prevent inline scripts
 * - Input sanitization and output encoding to prevent XSS
 *
 * @see https://owasp.org/www-community/HttpOnly
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_CHANGE_EVENT = 'auth-token-change';

// Custom event for same-tab token changes (storage events only fire for other tabs)
type TokenChangeCallback = () => void;

const notifyTokenChange = (): void => {
  if (typeof window === 'undefined') return;
  // Notify same-tab listeners via custom event
  window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT));
};

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    notifyTokenChange();
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    notifyTokenChange();
  },

  /**
   * Checks if a JWT token has expired based on its `exp` claim.
   *
   * IMPORTANT: This only checks expiration, NOT signature validity.
   * Token verification should always be done server-side.
   * This is intended only for UX purposes (e.g., proactive refresh).
   *
   * @param token - JWT token string
   * @returns true if token is expired or invalid, false if still valid
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Return true if expired (exp * 1000 <= current time)
      return payload.exp * 1000 <= Date.now();
    } catch {
      // If we can't parse the token, consider it expired
      return true;
    }
  },

  // Subscribe to token changes (both same-tab and cross-tab)
  onTokenChange: (callback: TokenChangeCallback): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACCESS_TOKEN_KEY || e.key === null) {
        callback();
      }
    };

    const handleCustomEvent = () => callback();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(TOKEN_CHANGE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(TOKEN_CHANGE_EVENT, handleCustomEvent);
    };
  },
};
