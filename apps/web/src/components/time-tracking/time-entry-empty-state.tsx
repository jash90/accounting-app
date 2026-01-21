import { Clock } from 'lucide-react';

interface TimeEntryEmptyStateProps {
  hasActiveFilters: boolean;
}

export function TimeEntryEmptyState({ hasActiveFilters }: TimeEntryEmptyStateProps) {
  return (
    <div className="text-center py-6">
      <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">
        {hasActiveFilters ? 'Brak wpisów spełniających kryteria filtrowania' : 'Brak wpisów czasu'}
      </p>
    </div>
  );
}
