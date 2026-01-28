import { useMemo } from 'react';

import { LayoutDashboard, Users, Building2, Package } from 'lucide-react';

import { type NavItem } from '@/components/sidebar';
import { useModules } from '@/lib/hooks/use-modules';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { getModuleIcon } from '@/lib/utils/module-icons';
import { type UserDto } from '@/types/dtos';
import { UserRole } from '@/types/enums';

export function useNavigationItems(user: UserDto | null): NavItem[] {
  // Fetch modules based on user role
  const { data: allModules } = useModules();
  const { data: companyModules } = useCompanyModules();

  return useMemo(() => {
    if (!user) return [];

    const baseItems: NavItem[] = [];

    switch (user.role) {
      case UserRole.ADMIN:
        // Admin base navigation
        baseItems.push(
          { label: 'Pulpit', href: '/admin', icon: LayoutDashboard },
          { label: 'Użytkownicy', href: '/admin/users', icon: Users },
          { label: 'Firmy', href: '/admin/companies', icon: Building2 },
          { label: 'Moduły', href: '/admin/modules', icon: Package }
        );

        // Add all modules for admin
        if (allModules) {
          allModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name,
                href: `/admin/modules/${module.slug}`,
                icon: getModuleIcon(module.icon),
              });
            }
          });
        }
        break;

      case UserRole.COMPANY_OWNER:
        // Company owner base navigation
        baseItems.push(
          { label: 'Pulpit', href: '/company', icon: LayoutDashboard },
          { label: 'Pracownicy', href: '/company/employees', icon: Users },
          { label: 'Moduły', href: '/company/modules', icon: Package }
        );

        // Add company modules for company owner
        if (companyModules) {
          companyModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name,
                href: `/company/modules/${module.slug}`,
                icon: getModuleIcon(module.icon),
              });
            }
          });
        }
        break;

      case UserRole.EMPLOYEE:
        // Employee base navigation
        baseItems.push({ label: 'Pulpit', href: '/modules', icon: LayoutDashboard });

        // Add company modules for employee
        if (companyModules) {
          companyModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name,
                href: `/modules/${module.slug}`,
                icon: getModuleIcon(module.icon),
              });
            }
          });
        }
        break;
    }

    return baseItems;
  }, [user, allModules, companyModules]);
}
