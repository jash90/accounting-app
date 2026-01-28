import { format, isValid, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

/**
 * Safely parses a date value from various input types.
 * Handles Date objects, ISO strings, 'yyyy-MM-dd' format, and invalid input.
 *
 * @param value - The value to parse (Date, string, null, undefined)
 * @returns A valid Date object or undefined if parsing fails
 *
 * @example
 * ```ts
 * safeParseDate(new Date()) // Date object
 * safeParseDate('2024-01-15') // Date object
 * safeParseDate('2024-01-15T12:00:00Z') // Date object
 * safeParseDate('invalid') // undefined
 * safeParseDate(null) // undefined
 * ```
 */
export function safeParseDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return isValid(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    // Try parsing as ISO string first
    const isoDate = parseISO(value);
    if (isValid(isoDate)) {
      return isoDate;
    }

    // Try parsing 'yyyy-MM-dd' format as local date
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateMatch) {
      const [, year, month, day] = dateMatch.map(Number);
      const localDate = new Date(year, month - 1, day);
      if (isValid(localDate)) {
        return localDate;
      }
    }

    return undefined;
  }

  return undefined;
}

/**
 * Converts a Date object or date string to 'yyyy-MM-dd' format.
 * Returns undefined for invalid input.
 *
 * @param value - The date value to convert
 * @returns Date string in 'yyyy-MM-dd' format or undefined
 *
 * @example
 * ```ts
 * toDateString(new Date(2024, 0, 15)) // '2024-01-15'
 * toDateString('2024-01-15T12:00:00Z') // '2024-01-15'
 * toDateString(undefined) // undefined
 * ```
 */
export function toDateString(value: Date | string | undefined | null): string | undefined {
  const date = safeParseDate(value);
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Converts a 'yyyy-MM-dd' string to a Date object.
 * Creates the date in local timezone to avoid DST issues.
 *
 * @param value - Date string in 'yyyy-MM-dd' format
 * @returns Date object or undefined if invalid
 *
 * @example
 * ```ts
 * fromDateString('2024-01-15') // Date(2024, 0, 15) in local TZ
 * fromDateString(undefined) // undefined
 * ```
 */
export function fromDateString(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateMatch) return undefined;

  const [, year, month, day] = dateMatch.map(Number);
  const date = new Date(year, month - 1, day);
  return isValid(date) ? date : undefined;
}

/**
 * Formats a date value for display in Polish locale.
 * Uses 'dd.MM.yyyy' format by default.
 *
 * @param value - The date value to format
 * @param formatStr - Custom format string (default: 'dd.MM.yyyy')
 * @returns Formatted date string or empty string for invalid input
 *
 * @example
 * ```ts
 * formatDisplayDate(new Date(2024, 0, 15)) // '15.01.2024'
 * formatDisplayDate('2024-01-15') // '15.01.2024'
 * formatDisplayDate(undefined) // ''
 * ```
 */
export function formatDisplayDate(
  value: Date | string | undefined | null,
  formatStr: string = 'dd.MM.yyyy'
): string {
  const date = safeParseDate(value);
  if (!date) return '';
  return format(date, formatStr, { locale: pl });
}

/**
 * Formats a date value for display with month name (short format).
 * Uses 'd MMM' format with Polish locale.
 *
 * @param value - The date value to format
 * @returns Formatted date string or empty string for invalid input
 *
 * @example
 * ```ts
 * formatShortDisplayDate(new Date(2024, 0, 15)) // '15 sty'
 * ```
 */
export function formatShortDisplayDate(value: Date | string | undefined | null): string {
  return formatDisplayDate(value, 'd MMM');
}
