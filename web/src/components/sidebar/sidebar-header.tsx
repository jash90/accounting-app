import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '@/contexts/navigation-context';
import { cn } from '@/lib/utils/cn';

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className={cn(
      'flex items-center p-4 border-b border-white/10',
      isOpen ? 'justify-between' : 'justify-center'
    )}>
      {isOpen && (
        <div className="flex items-center gap-3">
          <img
            src="/apptax-logomark.svg"
            alt="AppTax"
            className="h-8 w-8"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              App<span className="text-apptax-light-blue">Tax</span>
            </span>
            <span className="text-[10px] text-white/60 uppercase tracking-wider">{title}</span>
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5 text-white/70" />
        ) : (
          <PanelLeftOpen className="h-5 w-5 text-white/70" />
        )}
      </button>
    </div>
  );
}
