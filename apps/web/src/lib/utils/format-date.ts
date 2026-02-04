/**
 * Format a date to Polish locale string.
 * Returns '-' for null/undefined values.
 */
export function formatDate(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL');
}

/**
 * Format a date to ISO date string (yyyy-MM-dd).
 * Returns undefined for null/undefined values.
 */
export function formatISODate(date?: Date | string | null): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}
