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
        'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
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
    </aside>
  );
}
