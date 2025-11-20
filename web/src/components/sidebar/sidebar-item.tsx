import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/navigation-context';
import { NavItem } from './types';
import { cn } from '@/lib/utils/cn';

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
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
        isActive ? 'bg-gray-700 text-white' : 'text-gray-700 hover:bg-gray-100',
        !isOpen && 'justify-center',
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {isOpen && <span className="font-medium">{item.label}</span>}
    </Link>
  );
}
