import { Link, useLocation } from 'react-router-dom';

import { useSidebar } from '@/contexts/navigation-context';
import { cn } from '@/lib/utils/cn';

import { type NavItem } from './types';

interface SidebarItemProps {
  item: NavItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const { isOpen } = useSidebar();
  const location = useLocation();
  const isActive = location.pathname === item.href;

  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
        isActive
          ? 'bg-sidebar-primary shadow-sm text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        !isOpen && 'justify-center px-2'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {isOpen && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );
}
