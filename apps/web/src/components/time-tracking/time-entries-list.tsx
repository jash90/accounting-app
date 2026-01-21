import { useState, useCallback, useMemo } from 'react';

import { Clock, Filter } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskClients } from '@/lib/hooks/use-tasks';
import {
  useTimeEntries,
  useDeleteTimeEntry,
  useSubmitTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
} from '@/lib/hooks/use-time-tracking';
import { cn } from '@/lib/utils/cn';
import { type TimeEntryResponseDto, type TimeEntryFiltersDto } from '@/types/dtos';

import { TimeEntryDeleteDialog, TimeEntryRejectDialog } from './time-entry-dialogs';
import { TimeEntryEmptyState } from './time-entry-empty-state';
import { TimeEntryFilters } from './time-entry-filters';
import { TimeEntryFormDialog } from './time-entry-form-dialog';
import { TimeEntryPagination } from './time-entry-pagination';
import { TimeEntryRow } from './time-entry-row';

interface TimeEntriesListProps {
  className?: string;
  showHeader?: boolean;
  initialFilters?: Partial<TimeEntryFiltersDto>;
}

const PAGE_SIZE = 20;

export function TimeEntriesList({
  className,
  showHeader = true,
  initialFilters,
}: TimeEntriesListProps) {
  const [filters, setFilters] = useState<TimeEntryFiltersDto>({
    page: 1,
    limit: PAGE_SIZE,
    ...initialFilters,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntryResponseDto | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntryResponseDto | null>(null);
  const [rejectEntry, setRejectEntry] = useState<TimeEntryResponseDto | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const { data: entriesData, isPending, error } = useTimeEntries(filters);
  const { data: clientsData } = useTaskClients();
  const deleteEntryMutation = useDeleteTimeEntry();
  const submitEntryMutation = useSubmitTimeEntry();
  const approveEntryMutation = useApproveTimeEntry();
  const rejectEntryMutation = useRejectTimeEntry();

  const clients = clientsData || [];

  const handleFilterChange = useCallback(
    <K extends keyof TimeEntryFiltersDto>(key: K, value: TimeEntryFiltersDto[K] | null) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value ?? undefined,
        page: 1,
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      ...initialFilters,
    });
  }, [initialFilters]);

  const handleDelete = useCallback(() => {
    if (deleteEntry) {
      deleteEntryMutation.mutate(deleteEntry.id, {
        onSuccess: () => setDeleteEntry(null),
        onError: () => {
          // Keep dialog open on error so user can see error state or retry
          // Error toast is handled by the mutation's global error handler
        },
      });
    }
  }, [deleteEntry, deleteEntryMutation]);

  const handleSubmit = useCallback(
    (entry: TimeEntryResponseDto) => {
      submitEntryMutation.mutate(entry.id);
    },
    [submitEntryMutation]
  );

  const handleApprove = useCallback(
    (entry: TimeEntryResponseDto) => {
      approveEntryMutation.mutate(entry.id);
    },
    [approveEntryMutation]
  );

  const handleReject = useCallback(() => {
    if (rejectEntry) {
      rejectEntryMutation.mutate(
        { id: rejectEntry.id, data: { rejectionNote } },
        {
          onSuccess: () => {
            setRejectEntry(null);
            setRejectionNote('');
          },
        }
      );
    }
  }, [rejectEntry, rejectionNote, rejectEntryMutation]);

  const handleCloseRejectDialog = useCallback(() => {
    setRejectEntry(null);
    setRejectionNote('');
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      handleFilterChange('page', page);
    },
    [handleFilterChange]
  );

  const hasActiveFilters = useMemo(
    () =>
      !!(
        filters.status ||
        filters.clientId ||
        filters.isBillable !== undefined ||
        filters.startDate ||
        filters.endDate
      ),
    [filters.status, filters.clientId, filters.isBillable, filters.startDate, filters.endDate]
  );

  const entries = entriesData?.data || [];
  const totalPages = entriesData?.meta ? Math.ceil(entriesData.meta.total / PAGE_SIZE) : 0;
  const currentPage = filters.page || 1;

  if (isPending) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wpisy czasu
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wpisy czasu
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-destructive">Nie udało się załadować wpisów czasu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showHeader && (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wpisy czasu
              {entriesData?.meta?.total !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {entriesData.meta.total}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(hasActiveFilters && 'text-primary')}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtry
                {hasActiveFilters && (
                  <Badge
                    variant="default"
                    className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    !
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
        )}

        {showFilters && (
          <TimeEntryFilters
            filters={filters}
            clients={clients}
            hasActiveFilters={hasActiveFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />
        )}

        <CardContent className={cn(!showFilters && showHeader && 'pt-4')}>
          {entries.length === 0 ? (
            <TimeEntryEmptyState hasActiveFilters={hasActiveFilters} />
          ) : (
            <div className="space-y-2" role="list" aria-label="Lista wpisów czasu">
              {entries.map((entry) => (
                <TimeEntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={setEditEntry}
                  onDelete={setDeleteEntry}
                  onSubmit={handleSubmit}
                  onApprove={handleApprove}
                  onReject={setRejectEntry}
                />
              ))}

              <TimeEntryPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={entriesData?.meta?.total || 0}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
        entry={editEntry}
      />

      <TimeEntryDeleteDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
      />

      <TimeEntryRejectDialog
        entry={rejectEntry}
        rejectionNote={rejectionNote}
        onRejectionNoteChange={setRejectionNote}
        onClose={handleCloseRejectDialog}
        onConfirm={handleReject}
      />
    </>
  );
}
