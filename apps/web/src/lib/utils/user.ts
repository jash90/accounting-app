/**
 * Utility functions for user-related operations.
 */

export interface UserNameInfo {
  firstName?: string;
  lastName?: string;
  email: string;
}

/**
 * Get display name for a user - returns full name if available, otherwise email.
 * Pure function with no external dependencies.
 *
 * @param user - User object with optional firstName/lastName and required email
 * @returns Display name string (e.g., "John Doe" or "john@example.com")
 */
export function getEmployeeName(user: UserNameInfo): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
}
