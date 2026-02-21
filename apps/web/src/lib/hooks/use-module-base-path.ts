import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';

/**
 * Hook to get the base path for a module based on the current user's role.
 * This ensures consistent navigation paths across the application.
 *
 * @param moduleName - The name/slug of the module (e.g., 'clients', 'time-tracking')
 * @returns The full base path for the module based on user role
 *
 * @example
 * ```tsx
 * const basePath = useModuleBasePath('clients');
 * // Returns '/admin/modules/clients' for ADMIN
 * // Returns '/company/modules/clients' for COMPANY_OWNER
 * // Returns '/modules/clients' for EMPLOYEE
 * ```
 */
export function useModuleBasePath(moduleName: string): string {
  const { user } = useAuthContext();

  switch (user?.role) {
    case UserRole.ADMIN:
      return `/admin/modules/${moduleName}`;
    case UserRole.COMPANY_OWNER:
      return `/company/modules/${moduleName}`;
    default:
      return `/modules/${moduleName}`;
  }
}

/**
 * Hook to get the create path for a module based on the current user's role.
 *
 * @param moduleName - The name/slug of the module
 * @returns The full create path for the module
 */
export function useModuleCreatePath(moduleName: string): string {
  const basePath = useModuleBasePath(moduleName);
  return `${basePath}/create`;
}
