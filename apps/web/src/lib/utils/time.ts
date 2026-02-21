/**
 * Shared time formatting utilities for the application.
 */

/**
 * Formats minutes into a human-readable duration string (h:mm format).
 * @param minutes - The total number of minutes
 * @returns Formatted duration string (e.g., "2:30" for 150 minutes)
 */
export function formatDuration(minutes?: number): string {
  if (!minutes) return '0:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds into a human-readable duration string (hh:mm:ss format).
 * @param seconds - The total number of seconds
 * @returns Formatted duration string (e.g., "01:30:45")
 */
export function formatDurationSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses a duration string (h:mm or hh:mm:ss) into total minutes.
 * @param duration - The duration string to parse
 * @returns Total minutes, or 0 if parsing fails
 */
export function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 2) {
    // h:mm format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // hh:mm:ss format
    return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  }
  return 0;
}
