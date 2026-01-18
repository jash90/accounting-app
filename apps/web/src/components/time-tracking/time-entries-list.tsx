import { useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Clock,
  Play,
  Pencil,
  Trash2,
  MoreHorizontal,
  Calendar,
  Filter,
  X,
  Send,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  useTimeEntries,
  useDeleteTimeEntry,
  useSubmitTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
} from '@/lib/hooks/use-time-tracking';
import { useTaskClients } from '@/lib/hooks/use-tasks';
import { TimeEntryStatusBadge } from './time-entry-status-badge';
import { TimeEntryFormDialog } from './time-entry-form-dialog';
import { TimeEntryResponseDto, TimeEntryFiltersDto } from '@/types/dtos';
import { TimeEntryStatus, TimeEntryStatusLabels } from '@/types/enums';
import { cn } from '@/lib/utils/cn';

interface TimeEntriesListProps {
  className?: string;
  showHeader?: boolean;
  initialFilters?: Partial<TimeEntryFiltersDto>;
}

const PAGE_SIZE = 20;

function formatDuration(minutes?: number): string {
  if (!minutes) return '0:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

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
    (key: keyof TimeEntryFiltersDto, value: unknown) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value || undefined,
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

  const handleDelete = () => {
    if (deleteEntry) {
      deleteEntryMutation.mutate(deleteEntry.id, {
        onSuccess: () => setDeleteEntry(null),
      });
    }
  };

  const handleSubmit = (entry: TimeEntryResponseDto) => {
    submitEntryMutation.mutate(entry.id);
  };

  const handleApprove = (entry: TimeEntryResponseDto) => {
    approveEntryMutation.mutate(entry.id);
  };

  const handleReject = () => {
    if (rejectEntry) {
      rejectEntryMutation.mutate(
        { id: rejectEntry.id, rejectionNote },
        {
          onSuccess: () => {
            setRejectEntry(null);
            setRejectionNote('');
          },
        }
      );
    }
  };

  const hasActiveFilters =
    filters.status ||
    filters.clientId ||
    filters.isBillable !== undefined ||
    filters.startDate ||
    filters.endDate;

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
          <p className="text-sm text-destructive">
            Nie udało się załadować wpisów czasu
          </p>
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
          <div className="px-6 pb-4 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filters.status || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'status',
                    value === '__all__' ? undefined : (value as TimeEntryStatus)
                  )
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszystkie</SelectItem>
                  {Object.entries(TimeEntryStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.clientId || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange('clientId', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Klient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszyscy klienci</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={
                  filters.isBillable === undefined
                    ? '__all__'
                    : filters.isBillable
                      ? 'true'
                      : 'false'
                }
                onValueChange={(value) =>
                  handleFilterChange(
                    'isBillable',
                    value === '__all__' ? undefined : value === 'true'
                  )
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rozliczalność" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszystkie</SelectItem>
                  <SelectItem value="true">Rozliczalne</SelectItem>
                  <SelectItem value="false">Nierozliczalne</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Od"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-[150px]"
              />

              <Input
                type="date"
                placeholder="Do"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-[150px]"
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Wyczyść
                </Button>
              )}
            </div>
          </div>
        )}

        <CardContent className={cn(!showFilters && showHeader && 'pt-4')}>
          {entries.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Brak wpisów spełniających kryteria filtrowania'
                  : 'Brak wpisów czasu'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    'hover:bg-muted/50 transition-colors',
                    entry.isRunning && 'border-green-300 bg-green-50/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.isRunning && (
                        <Play className="h-4 w-4 text-green-600 animate-pulse" />
                      )}
                      <h4 className="font-medium text-sm truncate">
                        {entry.description || 'Bez opisu'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <TimeEntryStatusBadge status={entry.status} />
                      {entry.client && (
                        <span className="text-xs text-muted-foreground">
                          {entry.client.name}
                        </span>
                      )}
                      {entry.isBillable && (
                        <Badge variant="secondary" className="text-xs">
                          Rozliczalny
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="font-mono font-semibold text-sm">
                        {entry.isRunning ? (
                          <span className="text-green-600">
                            {formatDistanceToNow(new Date(entry.startTime), {
                              locale: pl,
                              includeSeconds: true,
                            })}
                          </span>
                        ) : (
                          formatDuration(entry.durationMinutes)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(entry.startTime), 'd MMM yyyy', {
                          locale: pl,
                        })}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {entry.status === TimeEntryStatus.DRAFT && (
                          <>
                            <DropdownMenuItem onClick={() => setEditEntry(entry)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSubmit(entry)}>
                              <Send className="h-4 w-4 mr-2" />
                              Wyślij do zatwierdzenia
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteEntry(entry)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Usuń
                            </DropdownMenuItem>
                          </>
                        )}
                        {entry.status === TimeEntryStatus.SUBMITTED && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(entry)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Zatwierdź
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectEntry(entry)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Odrzuć
                            </DropdownMenuItem>
                          </>
                        )}
                        {entry.status === TimeEntryStatus.APPROVED && (
                          <DropdownMenuItem disabled>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Zatwierdzony
                          </DropdownMenuItem>
                        )}
                        {entry.status === TimeEntryStatus.REJECTED && (
                          <>
                            <DropdownMenuItem disabled>
                              <XCircle className="h-4 w-4 mr-2" />
                              Odrzucony: {entry.rejectionNote}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditEntry(entry)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edytuj i wyślij ponownie
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Strona {currentPage} z {totalPages} ({entriesData?.meta?.total} wpisów)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Następna
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
        entry={editEntry}
      />

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wpis czasu?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Wpis czasu zostanie trwale usunięty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectEntry}
        onOpenChange={(open) => {
          if (!open) {
            setRejectEntry(null);
            setRejectionNote('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzuć wpis czasu</AlertDialogTitle>
            <AlertDialogDescription>
              Podaj powód odrzucenia wpisu &quot;{rejectEntry?.description || 'Bez opisu'}&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Powód odrzucenia..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionNote.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Odrzuć
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
