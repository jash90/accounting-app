import { useState, useEffect, useCallback, useRef } from 'react';

import { Play, Square, Trash2, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTaskClients } from '@/lib/hooks/use-tasks';
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useUpdateTimer,
  useDiscardTimer,
} from '@/lib/hooks/use-time-tracking';
import { cn } from '@/lib/utils/cn';
import { formatDurationSeconds } from '@/lib/utils/time';

interface Client {
  id: string;
  name: string;
}

interface ActiveTimer {
  id: string;
  description?: string;
  clientId?: string;
  isBillable: boolean;
  isRunning: boolean;
  startTime?: string | Date;
}

interface TimerFormProps {
  initialDescription: string;
  initialClientId: string;
  initialIsBillable: boolean;
  activeTimer: ActiveTimer | null | undefined;
  clients: Client[];
  compact: boolean;
  className?: string;
}

function TimerForm({
  initialDescription,
  initialClientId,
  initialIsBillable,
  activeTimer,
  clients,
  compact,
  className,
}: TimerFormProps) {
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const updateTimer = useUpdateTimer();
  const discardTimer = useDiscardTimer();

  // Form state - initialized from props (no useEffect needed due to key prop in parent)
  const [description, setDescription] = useState(initialDescription);
  const [clientId, setClientId] = useState(initialClientId);
  const [isBillable, setIsBillable] = useState(initialIsBillable);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ref to track component mount state to prevent memory leaks
  const mountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Extract only the properties needed for the interval effect to avoid unnecessary re-runs
  const timerIsRunning = activeTimer?.isRunning ?? false;
  const timerStartTime = activeTimer?.startTime;

  // Calculate elapsed time with unmount race condition guard
  useEffect(() => {
    if (!timerIsRunning || !timerStartTime) {
      return; // Elapsed seconds derived as 0 in display when not running
    }

    const updateElapsed = () => {
      // Guard against unmount race conditions
      if (!mountedRef.current) return;
      const start = new Date(timerStartTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [timerIsRunning, timerStartTime]);

  // Derive formatted time - show 0 when not running since we don't reset state
  const formattedTime = formatDurationSeconds(timerIsRunning ? elapsedSeconds : 0);

  const handleStart = useCallback(() => {
    startTimer.mutate({
      description: description || undefined,
      clientId: clientId || undefined,
      isBillable,
    });
  }, [startTimer, description, clientId, isBillable]);

  const handleStop = useCallback(() => {
    stopTimer.mutate(
      { description: description || undefined },
      {
        onSuccess: () => {
          // Only clear form state on successful stop
          setDescription('');
          setClientId('');
          setIsBillable(true);
        },
        // On error, keep the current state so user can retry
      }
    );
  }, [stopTimer, description]);

  const handleDiscard = useCallback(() => {
    discardTimer.mutate(undefined, {
      onSuccess: () => {
        setDescription('');
        setClientId('');
        setIsBillable(true);
      },
      // On error, keep the current state so user can retry
    });
  }, [discardTimer]);

  const handleDescriptionBlur = useCallback(() => {
    if (activeTimer?.isRunning && description !== activeTimer.description) {
      updateTimer.mutate(
        {
          description: description || undefined,
          clientId: clientId || undefined,
          isBillable,
        },
        {
          onError: () => {
            // Restore the original description on error
            setDescription(activeTimer.description || '');
          },
        }
      );
    }
  }, [activeTimer, description, clientId, isBillable, updateTimer]);

  const handleClientChange = useCallback(
    (value: string) => {
      const actualValue = value === '__none__' ? '' : value;
      const previousClientId = clientId;
      setClientId(actualValue);
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: actualValue || undefined,
            isBillable,
          },
          {
            onError: () => {
              // Restore the original client on error
              setClientId(previousClientId);
            },
          }
        );
      }
    },
    [activeTimer?.isRunning, clientId, description, isBillable, updateTimer]
  );

  const handleBillableChange = useCallback(
    (checked: boolean) => {
      const previousBillable = isBillable;
      setIsBillable(checked);
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: clientId || undefined,
            isBillable: checked,
          },
          {
            onError: () => {
              // Restore the original billable state on error
              setIsBillable(previousBillable);
            },
          }
        );
      }
    },
    [activeTimer?.isRunning, description, clientId, isBillable, updateTimer]
  );

  const isRunning = activeTimer?.isRunning;

  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'text-xl font-mono font-semibold tabular-nums flex items-center gap-2',
                isRunning && 'text-green-600'
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              {formattedTime}
              {isRunning && (
                <span
                  className="text-xs font-normal bg-green-100 text-green-700 px-1.5 py-0.5 rounded"
                  aria-label="Timer aktywny"
                >
                  Aktywny
                </span>
              )}
            </div>
            <Input
              placeholder="Co robisz?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              className="flex-1 h-9"
              disabled={startTimer.isPending || stopTimer.isPending}
            />
            {isRunning ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStop}
                  disabled={stopTimer.isPending}
                  aria-label="Zatrzymaj timer"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  disabled={discardTimer.isPending}
                  aria-label="Odrzuć timer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={startTimer.isPending}
                className="bg-green-600 hover:bg-green-700"
                aria-label="Rozpocznij timer"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'text-3xl font-mono font-semibold tabular-nums min-w-[140px]',
                isRunning && 'text-green-600'
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              {formattedTime}
            </div>
            {isRunning && (
              <span
                className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded"
                aria-label="Timer aktywny"
              >
                Aktywny
              </span>
            )}
          </div>
          <Input
            placeholder="Nad czym pracujesz?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            className="flex-1"
            disabled={startTimer.isPending || stopTimer.isPending}
          />
          {isRunning ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleStop}
                disabled={stopTimer.isPending}
                aria-label="Zatrzymaj timer"
              >
                <Square className="h-4 w-4 mr-2" aria-hidden="true" />
                Stop
              </Button>
              <Button
                variant="ghost"
                onClick={handleDiscard}
                disabled={discardTimer.isPending}
                aria-label="Odrzuć timer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStart}
              disabled={startTimer.isPending}
              className="bg-green-600 hover:bg-green-700"
              aria-label="Rozpocznij timer"
            >
              <Play className="h-4 w-4 mr-2" aria-hidden="true" />
              Start
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select
              value={clientId || '__none__'}
              onValueChange={handleClientChange}
              disabled={startTimer.isPending || stopTimer.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz klienta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Brak klienta</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="billable"
              checked={isBillable}
              onCheckedChange={handleBillableChange}
              disabled={startTimer.isPending || stopTimer.isPending}
            />
            <Label htmlFor="billable" className="text-sm">
              Rozliczalny
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimerWidgetProps {
  className?: string;
  compact?: boolean;
}

export function TimerWidget({ className, compact = false }: TimerWidgetProps) {
  const { data: activeTimer, isLoading } = useActiveTimer();
  const { data: clientsData } = useTaskClients();

  const clients = clientsData || [];

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Key to reset form when active timer changes
  const formKey = activeTimer?.id ?? 'no-timer';

  return (
    <TimerForm
      key={formKey}
      initialDescription={activeTimer?.description || ''}
      initialClientId={activeTimer?.clientId || ''}
      initialIsBillable={activeTimer?.isBillable ?? true}
      activeTimer={activeTimer}
      clients={clients}
      compact={compact}
      className={className}
    />
  );
}
