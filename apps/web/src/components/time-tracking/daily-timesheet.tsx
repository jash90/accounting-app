import { useState, useMemo, memo } from 'react';
import { format, addDays, subDays, startOfDay, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyTimesheet } from '@/lib/hooks/use-time-tracking';
import { TimeEntryStatusBadge } from './time-entry-status-badge';
import { TimeEntryFormDialog } from './time-entry-form-dialog';
import { TimeEntryResponseDto } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/time';

// Constants
const SKELETON_ITEM_COUNT = 3;

interface DailyTimesheetProps {
  className?: string;
  initialDate?: Date;
  onEntryClick?: (entry: TimeEntryResponseDto) => void;
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

// Discriminated union for dialog state to prevent impossible states
type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; entry: TimeEntryResponseDto };

export function DailyTimesheet({ className, initialDate, onEntryClick }: DailyTimesheetProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(initialDate ?? new Date()));
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'closed' });

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const { data: timesheet, isPending, error } = useDailyTimesheet(dateString);

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const isToday = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }, [selectedDate]);

  if (isPending) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet dzienny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: SKELETON_ITEM_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet dzienny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Nie udało się załadować danych timesheet
          </p>
        </CardContent>
      </Card>
    );
  }

  const entries = timesheet?.entries || [];

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet dzienny
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateDay('prev')} aria-label="Poprzedni dzień">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant={isToday ? 'default' : 'outline'}
              size="sm"
              onClick={goToToday}
              className="min-w-[140px]"
            >
              {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigateDay('next')} aria-label="Następny dzień">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary */}
          {timesheet && (
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Czas całkowity</span>
                </div>
                <p className="text-2xl font-mono font-semibold">
                  {formatDuration(timesheet.summary?.totalMinutes ?? 0)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Rozliczalny</span>
                </div>
                <p className="text-2xl font-mono font-semibold">
                  {formatDuration(timesheet.summary?.billableMinutes ?? 0)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Kwota</span>
                </div>
                <p className="text-2xl font-semibold">
                  {(timesheet.summary?.totalAmount ?? 0).toLocaleString('pl-PL')} PLN
                </p>
              </div>
            </div>
          )}

          {/* Entries */}
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Brak wpisów czasu na ten dzień
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogState({ mode: 'create' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj wpis
              </Button>
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label="Wpisy czasu z dnia">
              {entries.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => {
                    if (onEntryClick) {
                      onEntryClick(entry);
                    } else {
                      setDialogState({ mode: 'edit', entry });
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border text-left',
                    'hover:bg-muted/50 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    entry.isRunning && 'border-green-300 bg-green-50/50'
                  )}
                  aria-label={`Wpis: ${entry.description || 'Bez opisu'}${entry.isRunning ? ' - w trakcie' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[80px]">
                      <div className="text-sm font-mono">
                        {formatTime(entry.startTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.endTime ? formatTime(entry.endTime) : '...'}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <div className="flex items-center gap-2">
                        {entry.project?.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.project.color }}
                            role="img"
                            aria-label={`Kolor projektu: ${entry.project.name}`}
                          />
                        )}
                        <span className="font-medium text-sm">
                          {entry.description || 'Bez opisu'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.project && (
                          <Badge variant="outline" className="text-xs">
                            {entry.project.name}
                          </Badge>
                        )}
                        {entry.client && (
                          <span className="text-xs text-muted-foreground">
                            {entry.client.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <TimeEntryStatusBadge status={entry.status} />
                    <div className="text-right">
                      <div className="font-mono font-semibold text-sm">
                        {entry.isRunning ? (
                          <span className="text-green-600">Trwa...</span>
                        ) : (
                          formatDuration(entry.durationMinutes || 0)
                        )}
                      </div>
                      {entry.isBillable && entry.totalAmount != null && (
                        <div className="text-xs text-muted-foreground">
                          {parseFloat(String(entry.totalAmount)).toLocaleString('pl-PL')} PLN
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogState({ mode: 'create' })}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj wpis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        open={dialogState.mode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ mode: 'closed' });
          }
        }}
        entry={dialogState.mode === 'edit' ? dialogState.entry : null}
      />
    </>
  );
}
