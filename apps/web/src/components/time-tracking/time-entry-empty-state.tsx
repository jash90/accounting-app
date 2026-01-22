import { Clock } from 'lucide-react';

interface TimeEntryEmptyStateProps {
  hasActiveFilters: boolean;
}

export function TimeEntryEmptyState({ hasActiveFilters }: TimeEntryEmptyStateProps) {
  return (
    <div className="py-6 text-center">
      <Clock className="text-muted-foreground/50 mx-auto mb-2 h-12 w-12" />
      <p className="text-muted-foreground text-sm">
        {hasActiveFilters ? 'Brak wpisów spełniających kryteria filtrowania' : 'Brak wpisów czasu'}
      </p>
    </div>
  );
}
