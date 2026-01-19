const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_CHANGE_EVENT = 'auth-token-change';

// Custom event for same-tab token changes (storage events only fire for other tabs)
type TokenChangeCallback = () => void;
const tokenChangeListeners = new Set<TokenChangeCallback>();

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

  isTokenValid: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
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

