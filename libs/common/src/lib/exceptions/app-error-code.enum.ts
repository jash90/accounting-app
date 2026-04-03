/**
 * Common error codes shared across all modules.
 * Module-specific codes extend this set (e.g., ClientErrorCode adds CLIENT_001, etc.).
 */
export enum AppErrorCode {
  // Authorization
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
