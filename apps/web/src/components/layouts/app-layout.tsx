import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/common/app-header';
import { Sidebar } from '@/components/sidebar';
import { useAuthContext } from '@/contexts/auth-context';
import { useNavigationItems } from '@/hooks/use-navigation-items';

interface AppLayoutProps {
  sidebarTitle: string;
}

/**
 * Unified layout component for all user roles.
 * Consolidates AdminLayout, CompanyLayout, and EmployeeLayout into a single reusable component.
 */
export function AppLayout({ sidebarTitle }: AppLayoutProps) {
  const { user } = useAuthContext();
  const navItems = useNavigationItems(user);

  return (
    <div className="bg-muted flex h-screen overflow-hidden">
      <Sidebar title={sidebarTitle} navItems={navItems} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
