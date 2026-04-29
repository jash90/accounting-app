/**
 * Safe wrapper around `window.localStorage` that swallows errors that crash
 * the React tree on misbehaving browsers.
 *
 * Why this exists:
 * - Safari Private Browsing throws `QuotaExceededError` on every `setItem`.
 * - iOS WebView with reduced cookies can throw `SecurityError` on access.
 * - Cross-origin iframes / sandboxed contexts can throw on read.
 *
 * Behaviour:
 * - `getItem` returns `null` instead of throwing.
 * - `setItem` logs a warning and proceeds without throwing.
 * - `removeItem` swallows silently (best-effort cleanup).
 *
 * Use this anywhere we read/write `localStorage` in app code. If a feature
 * truly cannot tolerate silent failure (rare), fall back to raw `localStorage`
 * with a local try/catch and surface a user-facing error explicitly.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } catch (error) {
      // QuotaExceededError (Safari private), SecurityError, etc.
      console.warn(`safeStorage.setItem(${key}) failed:`, error);
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch {
      // best-effort cleanup
    }
  },
};
