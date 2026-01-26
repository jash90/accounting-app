import { Outlet } from 'react-router-dom';

import { Menu } from 'lucide-react';

import { UserMenu } from '@/components/common/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/auth-context';
import { useMobileMenu } from '@/contexts/navigation-context';
import { useNavigationItems } from '@/hooks/use-navigation-items';

import { MobileNavigation } from './mobile-navigation';

export default function AdminLayout() {
  const { user } = useAuthContext();
  const navItems = useNavigationItems(user);
  const { open: openMobileMenu } = useMobileMenu();

  return (
    <div className="bg-apptax-warm-gray flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar title="Panel Admina" navItems={navItems} />
      </div>

      {/* Mobile Navigation Sheet */}
      <MobileNavigation title="Panel Admina" navItems={navItems} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="shadow-apptax-sm border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
            {/* Mobile menu button */}
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={openMobileMenu}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Otwórz menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Spacer for desktop */}
            <div className="hidden flex-1 lg:block" />

            {/* Right side actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
