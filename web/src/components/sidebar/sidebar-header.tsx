import { Menu } from 'lucide-react';
import { useSidebar } from '@/contexts/navigation-context';

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      {isOpen && (
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      )}
      <button
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
