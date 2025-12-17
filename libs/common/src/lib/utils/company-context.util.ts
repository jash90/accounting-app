import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Get the effective company ID for a user.
 * For ADMIN users with an activeCompanyId set, returns the activeCompanyId.
 * For all other cases, returns the user's default companyId.
 *
 * This allows ADMIN users to switch context to a test company
 * (analogous to how COMPANY_OWNER has both personal and company email config).
 */
export function getEffectiveCompanyId(user: User): string | null {
  if (user.role === UserRole.ADMIN && user.activeCompanyId) {
    return user.activeCompanyId;
  }
  return user.companyId;
}
