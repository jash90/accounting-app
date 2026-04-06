/**
 * Event bus for auth-related navigation events.
 * Used by the API client to signal auth state changes without
 * hard page navigation (preserves SPA state and React Query cache).
 */

export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session-expired',
  MODULE_ACCESS_DENIED: 'auth:module-access-denied',
} as const;

export const authEventBus = new EventTarget();
