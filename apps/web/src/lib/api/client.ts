import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { tokenStorage } from '../auth/token-storage';
import { AUTH_EVENTS, authEventBus } from '../events/auth-events';

// Extend Window interface for runtime config
declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
      WS_URL?: string;
    };
  }
}

/**
 * Get API base URL with runtime config support for Railway deployment.
 * Priority: Runtime config (Railway) > Build-time env var (DEV only) > empty string (relative paths)
 */
const getApiBaseUrl = (): string => {
  // Runtime config (injected by Railway at deploy time via sed)
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) {
    const url = window.__APP_CONFIG__.API_BASE_URL;
    // Only use if placeholder was replaced (not '__API_BASE_URL__')
    if (url && url !== '__API_BASE_URL__') {
      return url;
    }
  }

  // In development, always use relative paths so requests go through the Vite proxy
  if (import.meta.env.DEV) {
    return '';
  }

  // Production without runtime config - use relative paths (assumes same domain or proxy)
  return '';
};

/**
 * Token refresh manager that handles concurrent 401 responses properly.
 * Uses a single promise for all concurrent refresh attempts to prevent race conditions.
 */
class TokenRefreshManager {
  private refreshPromise: Promise<void> | null = null;

  /**
   * Refreshes the token, ensuring only one refresh happens at a time.
   * Concurrent calls will share the same refresh promise.
   * Refresh token is sent via httpOnly cookie automatically (withCredentials: true).
   */
  refresh(): Promise<void> {
    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh token is in httpOnly cookie — sent automatically.
    // Empty body: backend reads refresh_token from cookie first, body as fallback.
    this.refreshPromise = axios
      .post(`${getApiBaseUrl()}/api/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        tokenStorage.setAccessToken(data.access_token);
      })
      .finally(() => {
        // Clear the promise so future refreshes can happen
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Handles token refresh failure by clearing tokens and dispatching session expired event.
   * The AuthProvider listens for this event and performs SPA-friendly navigation.
   */
  handleRefreshFailure(): void {
    silentRefreshScheduler.cancel();
    tokenStorage.clearTokens();
    authEventBus.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED));
  }
}

const tokenRefreshManager = new TokenRefreshManager();

/**
 * Silent refresh scheduler — proactively refreshes the access token
 * before it expires, preventing 401 errors during active sessions.
 *
 * IMPORTANT: these values MUST stay in sync with the backend `JWT_EXPIRES_IN`
 * env var (defaults to 15m in `libs/auth/src/lib/auth.module.ts:36`). If the
 * backend TTL changes, update `ACCESS_TOKEN_TTL_MS` here.
 *
 * Schedules a refresh 2 minutes before expiry (i.e. ~13 min after login).
 * Falls back to the 401 interceptor if the timer doesn't fire.
 */
class SilentRefreshScheduler {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  /** Refresh 2 minutes before expiry (access token TTL = 15 min) */
  private static readonly REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;
  private static readonly ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

  schedule(): void {
    this.cancel();
    if (!tokenStorage.isAuthenticated()) return;

    const delay =
      SilentRefreshScheduler.ACCESS_TOKEN_TTL_MS - SilentRefreshScheduler.REFRESH_BEFORE_EXPIRY_MS;
    this.timerId = setTimeout(() => this.performRefresh(), delay);
  }

  cancel(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private async performRefresh(): Promise<void> {
    try {
      await tokenRefreshManager.refresh();
      // Re-schedule after successful refresh
      this.schedule();
    } catch {
      tokenRefreshManager.handleRefreshFailure();
    }
  }
}

export const silentRefreshScheduler = new SilentRefreshScheduler();

// ==================== Retry Logic for Transient Errors ====================

/** HTTP status codes that are safe to retry (server-side transient errors) */
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

/** HTTP methods that are safe to retry (idempotent / read-only) */
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

/** Maximum number of retry attempts for transient errors */
const MAX_RETRIES = 2;

/** Base delay in ms for exponential backoff (delay * 2^attempt) */
const RETRY_BASE_DELAY_MS = 1_000;

/**
 * Determines if an error is retryable (transient network or server error).
 */
function isRetryableError(error: AxiosError): boolean {
  // Network errors (no response received)
  if (!error.response && error.code !== 'ERR_CANCELED') {
    return true;
  }
  // Server errors that are typically transient
  if (error.response && RETRYABLE_STATUS_CODES.has(error.response.status)) {
    return true;
  }
  return false;
}

/**
 * Determines if the request method is safe to retry.
 */
function isRetryableMethod(config: InternalAxiosRequestConfig): boolean {
  return RETRYABLE_METHODS.has((config.method || '').toLowerCase());
}

/**
 * Sleeps for specified ms. Uses exponential backoff: baseDelay * 2^attempt.
 */
function retryDelay(attempt: number): Promise<void> {
  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * API timeout configuration by request category.
 * AI endpoints override with per-request timeout in their API functions.
 */
export const API_TIMEOUTS = {
  /** Standard API requests */
  default: 30_000,
  /** File upload operations */
  upload: 120_000,
  /** AI agent chat/streaming operations */
  ai: 180_000,
} as const;

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUTS.default,
  withCredentials: true, // Send httpOnly cookies with every request
});

// Request interceptor — cookies carry the JWT automatically.
// Authorization header is no longer set (httpOnly cookie mode).
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — retry transient errors, then handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // --- Retry logic for transient errors (GET/HEAD only) ---
    if (
      isRetryableError(error) &&
      isRetryableMethod(originalRequest) &&
      (originalRequest._retryCount ?? 0) < MAX_RETRIES
    ) {
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;
      await retryDelay(originalRequest._retryCount - 1);
      // Add observability header
      originalRequest.headers['x-retry-count'] = String(originalRequest._retryCount);
      return apiClient(originalRequest);
    }

    if (error.response?.status === 403) {
      const data = error.response?.data;
      const msg =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: string }).message)
          : '';
      if (msg.includes('Access denied to module')) {
        authEventBus.dispatchEvent(new CustomEvent(AUTH_EVENTS.MODULE_ACCESS_DENIED));
        return new Promise(() => {});
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept 401 from login/register endpoints - let them show errors naturally
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register');

      // Don't intercept 401 from AI agent endpoints - these are API key issues, not JWT issues
      const isAIAgentEndpoint = originalRequest.url?.includes('/modules/ai-agent/');

      // Check if error message indicates API key issue (not JWT issue)
      const responseData = error.response?.data;
      const errorMessage = (
        typeof responseData === 'object' &&
        responseData !== null &&
        'message' in responseData &&
        typeof responseData.message === 'string'
          ? responseData.message
          : ''
      ).toLowerCase();
      const isApiKeyError =
        errorMessage.includes('api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('configuration');

      if (isAuthEndpoint || isAIAgentEndpoint || isApiKeyError) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // TokenRefreshManager handles concurrent requests - all share the same refresh promise
        // After refresh, cookies are updated automatically (withCredentials: true)
        await tokenRefreshManager.refresh();
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenRefreshManager.handleRefreshFailure();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
