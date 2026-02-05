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

/**
 * Get user initials for avatar display.
 * Returns first letters of firstName and lastName, or first letter of email.
 *
 * @param firstName - Optional first name
 * @param lastName - Optional last name
 * @param email - Optional email (fallback)
 * @returns Uppercase initials (e.g., "JD" or "J" or "?")
 */
export function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return email?.charAt(0).toUpperCase() ?? '?';
}

/**
 * Get display name for a user with safe handling of undefined.
 * Returns full name, email, or fallback text.
 *
 * @param user - Optional user object
 * @returns Display name or fallback text
 */
export function getUserDisplayName(user?: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (!user) return 'Nieznany użytkownik';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
}
