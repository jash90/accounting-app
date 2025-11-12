import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { UserMenu } from '@/components/common/user-menu';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  {
    href: '/admin',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/admin/users',
    icon: Users,
    label: 'Users',
  },
  {
    href: '/admin/companies',
    icon: Building2,
    label: 'Companies',
  },
  {
    href: '/admin/modules',
    icon: Package,
    label: 'Modules',
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold">Admin Panel</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-accent"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav role="navigation" className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

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

