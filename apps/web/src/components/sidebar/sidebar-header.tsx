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
        'flex items-center border-b border-white/10 p-4',
        isOpen ? 'justify-between' : 'justify-center'
      )}
    >
      {isOpen && (
        <div className="flex items-center gap-3">
          <img src="/apptax-logomark.svg" alt="AppTax" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              App<span className="text-apptax-light-blue">Tax</span>
            </span>
            <span className="text-[10px] tracking-wider text-white/60 uppercase">{title}</span>
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        className="rounded-lg p-2 transition-colors hover:bg-white/10"
        aria-label={isOpen ? 'Zwiń pasek boczny' : 'Rozwiń pasek boczny'}
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
