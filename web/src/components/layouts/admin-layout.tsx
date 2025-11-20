import { Outlet } from 'react-router-dom';
import { UserMenu } from '@/components/common/user-menu';
import { Sidebar } from '@/components/sidebar';
import { useNavigationItems } from '@/hooks/use-navigation-items';
import { useAuthContext } from '@/contexts/auth-context';

export default function AdminLayout() {
  const { user } = useAuthContext();
  const navItems = useNavigationItems(user);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar title="Admin Panel" navItems={navItems} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex-1" />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

