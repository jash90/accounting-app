import { useSidebar } from '@/contexts/navigation-context';
import { SidebarHeader } from './sidebar-header';
import { SidebarItem } from './sidebar-item';
import { SidebarProps } from './types';
import { cn } from '@/lib/utils/cn';

export function Sidebar({ title, navItems, className }: SidebarProps) {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn(
        'bg-apptax-navy flex flex-col transition-all duration-300 shadow-apptax-lg',
        isOpen ? 'w-64' : 'w-16',
        className
      )}
    >
      <SidebarHeader title={title} />
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>

      {/* AppTax Footer Branding */}
      <div className={cn(
        'p-4 border-t border-white/10',
        !isOpen && 'p-2'
      )}>
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
            <span className="text-xs text-white/50">AI-Powered</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src="/apptax-logomark.svg"
              alt="AppTax"
              className="h-8 w-8"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
