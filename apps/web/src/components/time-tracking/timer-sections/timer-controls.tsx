import { Play, Square, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export interface TimerFullViewControlsProps {
  formattedTime: string;
  isRunning: boolean | undefined;
  description: string;
  onDescriptionChange: (v: string) => void;
  onDescriptionBlur: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onStart: () => void;
  isStopPending: boolean;
  isDiscardPending: boolean;
  isStartPending: boolean;
  canStart: boolean;
}

export function TimerFullViewControls({
  formattedTime,
  isRunning,
  description,
  onDescriptionChange,
  onDescriptionBlur,
  onStop,
  onDiscard,
  onStart,
  isStopPending,
  isDiscardPending,
  isStartPending,
  canStart,
}: TimerFullViewControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'min-w-[140px] font-mono text-3xl font-semibold tabular-nums',
            isRunning && 'text-green-600 dark:text-green-400'
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {formattedTime}
        </div>
        {isRunning && (
          <span
            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300"
            aria-label="Timer aktywny"
          >
            Aktywny
          </span>
        )}
      </div>
      <Input
        placeholder="Nad czym pracujesz?"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onBlur={onDescriptionBlur}
        className="flex-1"
        disabled={isStartPending || isStopPending}
      />
      {isRunning ? (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={onStop}
            disabled={isStopPending}
            aria-label="Zatrzymaj timer"
          >
            <Square className="mr-2 h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
          <Button
            variant="ghost"
            onClick={onDiscard}
            disabled={isDiscardPending}
            aria-label="Odrzuć timer"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={onStart}
          disabled={isStartPending || !canStart}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          aria-label="Rozpocznij timer"
        >
          <Play className="mr-2 h-4 w-4" aria-hidden="true" />
          Start
        </Button>
      )}
    </div>
  );
}
