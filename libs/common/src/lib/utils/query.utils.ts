import { UserRole } from '../enums/user-role.enum';

/**
 * Escapes special characters in SQL LIKE/ILIKE patterns to prevent injection.
 * Should be used whenever constructing LIKE patterns from user input.
 *
 * Escapes: backslash (\), percent (%), underscore (_)
 */
export function escapeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Returns true if the user has COMPANY_OWNER or ADMIN role.
 * Used to determine whether a user can view all records vs. only their own.
 */
export function isOwnerOrAdmin(user: { role: UserRole }): boolean {
  return [UserRole.COMPANY_OWNER, UserRole.ADMIN].includes(user.role);
}
