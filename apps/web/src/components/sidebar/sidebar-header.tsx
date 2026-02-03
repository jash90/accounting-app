import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useSidebar } from '@/contexts/navigation-context';
import { cn } from '@/lib/utils/cn';

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <div
      className={cn(
        'flex h-16 items-center border-b border-sidebar-border',
        isOpen ? 'justify-between px-4' : 'justify-center px-2'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 transition-all duration-300 overflow-hidden',
          isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'
        )}
      >
        <img src="/apptax-logomark.svg" alt="AppTax" className="h-8 w-8 flex-shrink-0" />
        <div className="flex flex-col whitespace-nowrap">
          <span className="text-sm font-bold text-sidebar-foreground">
            App<span className="text-sidebar-primary">Tax</span>
          </span>
          <span className="text-[10px] tracking-wider text-sidebar-foreground/60 uppercase">
            {title}
          </span>
        </div>
      </div>
      <button
        onClick={toggle}
        className="rounded-lg p-2 transition-colors hover:bg-sidebar-accent"
        aria-label={isOpen ? 'Zwiń pasek boczny' : 'Rozwiń pasek boczny'}
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5 text-sidebar-foreground/70" />
        ) : (
          <PanelLeftOpen className="h-5 w-5 text-sidebar-foreground/70" />
        )}
      </button>
    </div>
  );
}
