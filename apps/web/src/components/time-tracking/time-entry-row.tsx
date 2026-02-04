import { memo, useEffect, useState } from 'react';

import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/time';
import { type TimeEntryResponseDto } from '@/types/dtos';
import { TimeEntryStatus } from '@/types/enums';

import { TimeEntryStatusBadge } from './time-entry-status-badge';

interface TimeEntryRowProps {
  entry: TimeEntryResponseDto;
  onEdit: (entry: TimeEntryResponseDto) => void;
  onDelete: (entry: TimeEntryResponseDto) => void;
  onSubmit: (entry: TimeEntryResponseDto) => void;
  onApprove: (entry: TimeEntryResponseDto) => void;
  onReject: (entry: TimeEntryResponseDto) => void;
}

export const TimeEntryRow = memo(function TimeEntryRow({
  entry,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
}: TimeEntryRowProps) {
  // State for real-time running timer display
  const [elapsedTime, setElapsedTime] = useState<string>('');

  // Update elapsed time every second for running timers
  useEffect(() => {
    if (!entry.isRunning) {
      return; // State not reset because elapsedTime isn't displayed when not running
    }

    const updateElapsedTime = () => {
      setElapsedTime(
        formatDistanceToNow(new Date(entry.startTime), {
          locale: pl,
          includeSeconds: true,
        })
      );
    };

    // Initial update
    updateElapsedTime();

    // Update every second for smooth real-time display
    const intervalId = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(intervalId);
  }, [entry.isRunning, entry.startTime]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Wpis czasu: ${entry.description || 'Bez opisu'}. ${entry.isRunning ? 'W trakcie' : formatDuration(entry.durationMinutes)}. ${entry.status === TimeEntryStatus.DRAFT ? 'Naciśnij Enter aby edytować.' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (entry.status === TimeEntryStatus.DRAFT) {
            onEdit(entry);
          }
        }
      }}
      onClick={() => {
        if (entry.status === TimeEntryStatus.DRAFT) {
          onEdit(entry);
        }
      }}
      className={cn(
        'flex cursor-pointer items-center justify-between rounded-lg border p-3',
        'hover:bg-muted/50 transition-colors',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
        entry.isRunning && 'border-green-300 bg-green-50/50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {entry.isRunning && <Play className="h-4 w-4 animate-pulse text-green-600" />}
          <h4 className="truncate text-sm font-medium">{entry.description || 'Bez opisu'}</h4>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <TimeEntryStatusBadge status={entry.status} />
          {entry.client && (
            <span className="text-muted-foreground text-xs">{entry.client.name}</span>
          )}
          {entry.isBillable && (
            <Badge variant="secondary" className="text-xs">
              Rozliczalny
            </Badge>
          )}
        </div>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-sm font-semibold">
            {entry.isRunning ? (
              <span className="text-green-600" aria-live="polite" aria-atomic="true">
                {elapsedTime}
              </span>
            ) : (
              formatDuration(entry.durationMinutes)
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            {format(new Date(entry.startTime), 'd MMM yyyy', {
              locale: pl,
            })}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Więcej opcji">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {entry.status === TimeEntryStatus.DRAFT && (
              <>
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSubmit(entry)}>
                  <Send className="mr-2 h-4 w-4" />
                  Wyślij do zatwierdzenia
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </>
            )}
            {entry.status === TimeEntryStatus.SUBMITTED && (
              <>
                <DropdownMenuItem onClick={() => onApprove(entry)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zatwierdź
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(entry)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Odrzuć
                </DropdownMenuItem>
              </>
            )}
            {entry.status === TimeEntryStatus.APPROVED && (
              <DropdownMenuItem disabled>
                <CheckCircle className="mr-2 h-4 w-4" />
                Zatwierdzony
              </DropdownMenuItem>
            )}
            {entry.status === TimeEntryStatus.REJECTED && (
              <>
                <DropdownMenuItem disabled>
                  <XCircle className="mr-2 h-4 w-4" />
                  Odrzucony: {entry.rejectionNote}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj i wyślij ponownie
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
