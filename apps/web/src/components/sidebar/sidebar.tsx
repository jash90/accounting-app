import { useSidebar } from '@/contexts/navigation-context';
import { cn } from '@/lib/utils/cn';

import { SidebarHeader } from './sidebar-header';
import { SidebarItem } from './sidebar-item';
import { type SidebarProps } from './types';

export function Sidebar({ title, navItems, className }: SidebarProps) {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn(
        'bg-sidebar shadow-lg flex flex-col transition-all duration-300',
        isOpen ? 'w-64' : 'w-16',
        className
      )}
    >
      <SidebarHeader title={title} />
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>

      {/* AppTax Footer Branding */}
      <div
        className={cn(
          'border-t border-sidebar-border transition-all duration-300',
          isOpen ? 'p-4' : 'p-2'
        )}
      >
        <div className="relative flex items-center justify-center">
          {/* AI indicator - fade out when closed */}
          <div
            className={cn(
              'flex items-center gap-2 transition-opacity duration-200 absolute left-0',
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <div className="bg-sidebar-accent ai-glow h-2 w-2 rounded-full" />
            <span className="text-xs text-sidebar-foreground/50 whitespace-nowrap">
              Zasilany AI
            </span>
          </div>

          {/* Logo - fade in when closed */}
          <img
            src="/apptax-logomark.svg"
            alt="AppTax"
            className={cn(
              'h-8 w-8 transition-opacity duration-200',
              isOpen ? 'opacity-0' : 'opacity-100'
            )}
          />
        </div>
      </div>
    </aside>
  );
}
