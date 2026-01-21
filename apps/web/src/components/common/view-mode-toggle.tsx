import { LayoutGrid, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type ViewMode } from '@/lib/hooks/use-table-preferences';
import { cn } from '@/lib/utils/cn';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ viewMode, onViewModeChange, className }: ViewModeToggleProps) {
  return (
    <div className={cn('inline-flex rounded-lg border border-apptax-soft-teal/50 p-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('table')}
        className={cn(
          'h-8 px-3 rounded-md transition-all',
          viewMode === 'table'
            ? 'bg-apptax-blue text-white hover:bg-apptax-blue/90'
            : 'hover:bg-apptax-soft-teal/30'
        )}
        aria-label="Widok tabeli"
        aria-pressed={viewMode === 'table'}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'h-8 px-3 rounded-md transition-all',
          viewMode === 'grid'
            ? 'bg-apptax-blue text-white hover:bg-apptax-blue/90'
            : 'hover:bg-apptax-soft-teal/30'
        )}
        aria-label="Widok siatki"
        aria-pressed={viewMode === 'grid'}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
