/**
 * Token Storage Module — httpOnly Cookie Mode
 *
 * The backend sets httpOnly cookies on login/register/refresh responses.
 * Cookies are sent automatically with every request (withCredentials: true).
 *
 * localStorage stores ONLY a boolean auth flag for:
 * - Tracking whether the user is authenticated (UI state)
 * - Cross-tab auth state synchronization via storage events
 *
 * SECURITY: Actual JWT tokens are NEVER stored in localStorage.
 * They exist only in httpOnly cookies inaccessible to JavaScript.
 *
 * @see https://owasp.org/www-community/HttpOnly
 */

const AUTH_FLAG_KEY = 'is_authenticated';
const TOKEN_CHANGE_EVENT = 'auth-token-change';

// Legacy keys — only used for cleanup during migration
const LEGACY_ACCESS_TOKEN_KEY = 'access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refresh_token';

type TokenChangeCallback = () => void;

const notifyTokenChange = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT));
};

/**
 * On first load, remove any legacy JWT tokens left in localStorage.
 * The actual tokens are now in httpOnly cookies set by the backend.
 */
function migrateLegacyTokens(): void {
  if (typeof window === 'undefined') return;
  const legacyAccess = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
  if (legacyAccess) {
    // User had tokens in localStorage — set the auth flag and purge tokens
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }
}

// Run migration on module load
migrateLegacyTokens();

export const tokenStorage = {
  /**
   * Returns a sentinel value when the user is authenticated.
   * The actual JWT lives in an httpOnly cookie — JS never sees it.
   * The sentinel '__cookie__' tells the interceptor that auth is cookie-based.
   */
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_FLAG_KEY) === 'true' ? '__cookie__' : null;
  },

  /**
   * Mark the user as authenticated (flag only — token is in httpOnly cookie).
   * The token parameter is accepted for API compatibility but NOT stored.
   */
   
  setAccessToken: (_token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    notifyTokenChange();
  },

  /**
   * Refresh token lives in httpOnly cookie. Returns null — cookie sent automatically.
   */
  getRefreshToken: (): string | null => {
    return null;
  },

  /**
   * No-op — refresh token is stored in httpOnly cookie by the backend.
   */
   
  setRefreshToken: (_token: string): void => {
    // No-op: refresh token is in httpOnly cookie
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_FLAG_KEY);
    notifyTokenChange();
  },

  /** Whether the user appears to be authenticated (has auth flag). */
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTH_FLAG_KEY) === 'true';
  },

  /**
   * Checks if a JWT token has expired based on its `exp` claim.
   * IMPORTANT: Only for UX purposes (proactive refresh). Server always validates.
   */
  isTokenExpired: (token: string): boolean => {
    if (!token || token === '__cookie__') return false; // cookie mode — let server decide
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  },

  /** Subscribe to token changes (same-tab custom event + cross-tab storage event). */
  onTokenChange: (callback: TokenChangeCallback): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_FLAG_KEY || e.key === null) {
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
