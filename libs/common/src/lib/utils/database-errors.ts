/**
 * Database-agnostic error handling utilities.
 * Provides helpers to identify database constraint violations without
 * hardcoding database-specific error codes.
 */

/**
 * Error codes for different database systems that indicate a foreign key constraint violation.
 */
const FOREIGN_KEY_CONSTRAINT_CODES: ReadonlySet<string> = new Set([
  '23503', // PostgreSQL: foreign_key_violation
  'ER_ROW_IS_REFERENCED_2', // MySQL
  'SQLITE_CONSTRAINT_FOREIGNKEY', // SQLite
  '1451', // MySQL: Cannot delete or update a parent row
]);

/**
 * Error codes for different database systems that indicate a unique constraint violation.
 */
const UNIQUE_CONSTRAINT_CODES: ReadonlySet<string> = new Set([
  '23505', // PostgreSQL: unique_violation
  'ER_DUP_ENTRY', // MySQL
  'SQLITE_CONSTRAINT_UNIQUE', // SQLite
  '1062', // MySQL: Duplicate entry
]);

/**
 * Represents a database error with code and optional constraint name.
 */
interface DatabaseError {
  code?: string;
  constraint?: string;
  message?: string;
}

/**
 * Type guard to check if an unknown value is a database error object.
 */
function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'constraint' in error);
}

/**
 * Checks if an error is a foreign key constraint violation.
 * Works across PostgreSQL, MySQL, and SQLite.
 *
 * @param error - The error to check
 * @param constraintNamePattern - Optional constraint name substring to match (e.g., 'FK_lead_offers')
 * @returns true if the error is a foreign key constraint violation
 *
 * @example
 * ```ts
 * try {
 *   await repository.remove(entity);
 * } catch (error) {
 *   if (isForeignKeyViolation(error, 'FK_lead_offers')) {
 *     throw new LeadHasOffersException(id);
 *   }
 *   throw error;
 * }
 * ```
 */
export function isForeignKeyViolation(error: unknown, constraintNamePattern?: string): boolean {
  if (!isDatabaseError(error)) {
    return false;
  }

  const hasConstraintCode =
    error.code !== undefined && FOREIGN_KEY_CONSTRAINT_CODES.has(error.code);

  if (!hasConstraintCode) {
    return false;
  }

  // If no constraint pattern specified, just check the error code
  if (!constraintNamePattern) {
    return true;
  }

  // Check if the constraint name or message contains the pattern
  const constraintMatch =
    error.constraint?.includes(constraintNamePattern) ||
    error.message?.includes(constraintNamePattern);

  return constraintMatch ?? false;
}

/**
 * Checks if an error is a unique constraint violation.
 * Works across PostgreSQL, MySQL, and SQLite.
 *
 * @param error - The error to check
 * @param constraintNamePattern - Optional constraint name substring to match (e.g., 'UQ_user_email')
 * @returns true if the error is a unique constraint violation
 *
 * @example
 * ```ts
 * try {
 *   await repository.save(entity);
 * } catch (error) {
 *   if (isUniqueConstraintViolation(error, 'UQ_user_email')) {
 *     throw new DuplicateEmailException();
 *   }
 *   throw error;
 * }
 * ```
 */
export function isUniqueConstraintViolation(
  error: unknown,
  constraintNamePattern?: string
): boolean {
  if (!isDatabaseError(error)) {
    return false;
  }

  const hasConstraintCode = error.code !== undefined && UNIQUE_CONSTRAINT_CODES.has(error.code);

  if (!hasConstraintCode) {
    return false;
  }

  // If no constraint pattern specified, just check the error code
  if (!constraintNamePattern) {
    return true;
  }

  // Check if the constraint name or message contains the pattern
  const constraintMatch =
    error.constraint?.includes(constraintNamePattern) ||
    error.message?.includes(constraintNamePattern);

  return constraintMatch ?? false;
}

/**
 * Checks if an error is any type of database constraint violation.
 *
 * @param error - The error to check
 * @returns true if the error is a constraint violation
 */
export function isConstraintViolation(error: unknown): boolean {
  return isForeignKeyViolation(error) || isUniqueConstraintViolation(error);
}
