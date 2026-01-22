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
        'bg-apptax-navy shadow-apptax-lg flex flex-col transition-all duration-300',
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
      <div className={cn('border-t border-white/10 p-4', !isOpen && 'p-2')}>
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="bg-apptax-teal ai-glow h-2 w-2 rounded-full" />
            <span className="text-xs text-white/50">Zasilany AI</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <img src="/apptax-logomark.svg" alt="AppTax" className="h-8 w-8" />
          </div>
        )}
      </div>
    </aside>
  );
}
