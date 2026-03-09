/**
 * Locale strings for time-tracking module
 * These strings are used for display in reports and grouping
 */
export const TIME_TRACKING_LABELS = {
  /** Label for entries without a client assigned */
  NO_CLIENT: 'Bez klienta',
  /** Label for entries without a task assigned */
  NO_TASK: 'Bez zadania',
  /** Label for ungrouped entries */
  ALL: 'Wszystkie',
} as const;

/**
 * Error messages for time-tracking module
 * These strings are used for validation and error responses
 */
export const TIME_TRACKING_ERROR_MESSAGES = {
  /** Error when user does not belong to the company */
  USER_NOT_IN_COMPANY: 'Użytkownik nie należy do tej firmy',
} as const;
