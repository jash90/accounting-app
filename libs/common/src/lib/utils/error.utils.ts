/**
 * Extracts a string error message from an unknown caught value.
 * Handles Error instances, strings, and other values gracefully.
 *
 * @example
 * try { ... } catch (error) {
 *   this.logger.error(getErrorMessage(error));
 * }
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
