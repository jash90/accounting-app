import { Outlet } from 'react-router-dom';

import { UserMenu } from '@/components/common/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { useAuthContext } from '@/contexts/auth-context';
import { useNavigationItems } from '@/hooks/use-navigation-items';

export default function AdminLayout() {
  const { user } = useAuthContext();
  const navItems = useNavigationItems(user);

  return (
    <div className="bg-muted flex h-screen overflow-hidden">
      <Sidebar title="Panel Admina" navItems={navItems} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="shadow-sm border-b border-border bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>

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
