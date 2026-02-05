import { useMemo, useState } from 'react';

import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Clock, DollarSign, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyTimesheet } from '@/lib/hooks/use-time-tracking';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/time';
import { type TimeEntryResponseDto } from '@/types/dtos';

import { TimeEntryFormDialog } from './time-entry-form-dialog';
import { TimeEntryStatusBadge } from './time-entry-status-badge';

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
    setSelectedDate((prev) => (direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)));
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
          <p className="text-destructive text-sm">Nie udało się załadować danych timesheet</p>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDay('prev')}
              aria-label="Poprzedni dzień"
            >
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDay('next')}
              aria-label="Następny dzień"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary */}
          {timesheet && (
            <div className="bg-muted/50 mb-6 grid grid-cols-3 gap-4 rounded-lg p-4">
              <div className="text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Czas całkowity</span>
                </div>
                <p className="font-mono text-2xl font-semibold">
                  {formatDuration(timesheet.summary?.totalMinutes ?? 0)}
                </p>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Rozliczalny</span>
                </div>
                <p className="font-mono text-2xl font-semibold">
                  {formatDuration(timesheet.summary?.billableMinutes ?? 0)}
                </p>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
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
            <div className="py-8 text-center">
              <Clock className="text-muted-foreground/50 mx-auto mb-2 h-12 w-12" />
              <p className="text-muted-foreground mb-4 text-sm">Brak wpisów czasu na ten dzień</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogState({ mode: 'create' })}
              >
                <Plus className="mr-1 h-4 w-4" />
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
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left',
                    'hover:bg-muted/50 transition-colors',
                    'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
                    entry.isRunning && 'border-green-300 bg-green-50/50'
                  )}
                  aria-label={`Wpis: ${entry.description || 'Bez opisu'}${entry.isRunning ? ' - w trakcie' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-[80px] text-center">
                      <div className="font-mono text-sm">{formatTime(entry.startTime)}</div>
                      <div className="text-muted-foreground text-xs">
                        {entry.endTime ? formatTime(entry.endTime) : '...'}
                      </div>
                    </div>
                    <div className="bg-border h-10 w-px" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {entry.description || 'Bez opisu'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {entry.task && (
                          <Badge variant="outline" className="text-xs">
                            {entry.task.title}
                          </Badge>
                        )}
                        {entry.client && (
                          <span className="text-muted-foreground text-xs">{entry.client.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <TimeEntryStatusBadge status={entry.status} />
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">
                        {entry.isRunning ? (
                          <span className="text-green-600">Trwa...</span>
                        ) : (
                          formatDuration(entry.durationMinutes || 0)
                        )}
                      </div>
                      {entry.isBillable && entry.totalAmount != null && (
                        <div className="text-muted-foreground text-xs">
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
                className="mt-2 w-full"
              >
                <Plus className="mr-1 h-4 w-4" />
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
