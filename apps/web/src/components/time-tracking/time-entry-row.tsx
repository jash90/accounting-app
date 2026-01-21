import { useState, useEffect } from 'react';

import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Play,
  Pencil,
  Trash2,
  MoreHorizontal,
  Calendar,
  Send,
  CheckCircle,
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

export function TimeEntryRow({
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
      setElapsedTime('');
      return;
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
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (entry.status === TimeEntryStatus.DRAFT) {
            onEdit(entry);
          }
        }
      }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        'hover:bg-muted/50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        entry.isRunning && 'border-green-300 bg-green-50/50'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {entry.isRunning && <Play className="h-4 w-4 text-green-600 animate-pulse" />}
          <h4 className="font-medium text-sm truncate">{entry.description || 'Bez opisu'}</h4>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TimeEntryStatusBadge status={entry.status} />
          {entry.client && (
            <span className="text-xs text-muted-foreground">{entry.client.name}</span>
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
              <span className="text-green-600" aria-live="polite" aria-atomic="true">
                {elapsedTime}
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
            <Button variant="ghost" size="sm" aria-label="Więcej opcji">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {entry.status === TimeEntryStatus.DRAFT && (
              <>
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSubmit(entry)}>
                  <Send className="h-4 w-4 mr-2" />
                  Wyślij do zatwierdzenia
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </DropdownMenuItem>
              </>
            )}
            {entry.status === TimeEntryStatus.SUBMITTED && (
              <>
                <DropdownMenuItem onClick={() => onApprove(entry)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Zatwierdź
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(entry)}>
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
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edytuj i wyślij ponownie
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
