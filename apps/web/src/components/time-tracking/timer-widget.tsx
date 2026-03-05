import { useCallback, useEffect, useRef, useState } from 'react';

import { Clock, Play, Square, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuthContext } from '@/contexts/auth-context';
import { useSettlements } from '@/lib/hooks/use-settlements';
import { useTasks } from '@/lib/hooks/use-tasks';
import {
  useActiveTimer,
  useDiscardTimer,
  useStartTimer,
  useStopTimer,
  useUpdateTimer,
} from '@/lib/hooks/use-time-tracking';
import { cn } from '@/lib/utils/cn';
import { formatDurationSeconds } from '@/lib/utils/time';

interface ActiveTimer {
  id: string;
  description?: string;
  clientId?: string;
  taskId?: string;
  settlementId?: string;
  isBillable: boolean;
  isRunning: boolean;
  startTime?: string | Date;
}

interface TimerFullViewControlsProps {
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

function TimerFullViewControls({
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

interface TimerFormProps {
  initialDescription: string;
  initialWorkType: 'task' | 'settlement';
  initialTaskId: string;
  initialSettlementId: string;
  initialIsBillable: boolean;
  activeTimer: ActiveTimer | null | undefined;
  compact: boolean;
  className?: string;
}

function TimerForm({
  initialDescription,
  initialWorkType,
  initialTaskId,
  initialSettlementId,
  initialIsBillable,
  activeTimer,
  compact,
  className,
}: TimerFormProps) {
  const { user } = useAuthContext();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const updateTimer = useUpdateTimer();
  const discardTimer = useDiscardTimer();

  // Form state - initialized from props (no useEffect needed due to key prop in parent)
  const [description, setDescription] = useState(() => initialDescription);
  const [workType, setWorkType] = useState<'task' | 'settlement'>(() => initialWorkType);
  const [taskId, setTaskId] = useState(() => initialTaskId);
  const [settlementId, setSettlementId] = useState(() => initialSettlementId);
  const [isBillable, setIsBillable] = useState(() => initialIsBillable);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { data: tasksData } = useTasks({ limit: 100, assigneeId: user?.id });
  const { data: settlementsData } = useSettlements({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 100,
  });

  const tasks = tasksData?.data ?? [];
  const settlements = settlementsData?.data ?? [];

  // Derive clientId from selected task or settlement
  const derivedClientId =
    workType === 'task' && taskId
      ? tasks.find((t) => t.id === taskId)?.clientId
      : workType === 'settlement' && settlementId
        ? settlements.find((s) => s.id === settlementId)?.clientId
        : undefined;

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

  // Can start only when a task or settlement is selected
  const canStart =
    workType === 'task'
      ? !!taskId && taskId !== '__none__'
      : !!settlementId && settlementId !== '__none__';

  const handleStart = useCallback(() => {
    startTimer.mutate({
      description: description || undefined,
      clientId: derivedClientId,
      taskId: workType === 'task' && taskId ? taskId : undefined,
      settlementId: workType === 'settlement' && settlementId ? settlementId : undefined,
      isBillable,
    });
  }, [startTimer, description, derivedClientId, workType, taskId, settlementId, isBillable]);

  const handleStop = useCallback(() => {
    stopTimer.mutate(
      { description: description || undefined },
      {
        onSuccess: () => {
          // Only clear form state on successful stop
          setDescription('');
          setWorkType('task');
          setTaskId('');
          setSettlementId('');
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
        setWorkType('task');
        setTaskId('');
        setSettlementId('');
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
          clientId: derivedClientId,
          taskId: workType === 'task' && taskId ? taskId : null,
          settlementId: workType === 'settlement' && settlementId ? settlementId : null,
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
  }, [
    activeTimer,
    description,
    derivedClientId,
    workType,
    taskId,
    settlementId,
    isBillable,
    updateTimer,
  ]);

  const handleWorkTypeChange = useCallback(
    (value: 'task' | 'settlement') => {
      const previousWorkType = workType;
      const previousTaskId = taskId;
      const previousSettlementId = settlementId;
      setWorkType(value);
      // Clear the other field
      if (value === 'task') {
        setSettlementId('');
      } else {
        setTaskId('');
      }
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: null,
            taskId: value === 'task' ? taskId || null : null,
            settlementId: value === 'settlement' ? settlementId || null : null,
            isBillable,
          },
          {
            onError: () => {
              setWorkType(previousWorkType);
              setTaskId(previousTaskId);
              setSettlementId(previousSettlementId);
            },
          }
        );
      }
    },
    [activeTimer?.isRunning, workType, taskId, settlementId, description, isBillable, updateTimer]
  );

  const handleTaskChange = useCallback(
    (value: string) => {
      const actualValue = value === '__none__' ? '' : value;
      const previousTaskId = taskId;
      setTaskId(actualValue);
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: tasks.find((t) => t.id === actualValue)?.clientId ?? null,
            taskId: actualValue || null,
            settlementId: null,
            isBillable,
          },
          {
            onError: () => {
              setTaskId(previousTaskId);
            },
          }
        );
      }
    },
    [activeTimer?.isRunning, taskId, description, tasks, isBillable, updateTimer]
  );

  const handleSettlementChange = useCallback(
    (value: string) => {
      const actualValue = value === '__none__' ? '' : value;
      const previousSettlementId = settlementId;
      setSettlementId(actualValue);
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: settlements.find((s) => s.id === actualValue)?.clientId ?? null,
            taskId: null,
            settlementId: actualValue || null,
            isBillable,
          },
          {
            onError: () => {
              setSettlementId(previousSettlementId);
            },
          }
        );
      }
    },
    [activeTimer?.isRunning, settlementId, description, settlements, isBillable, updateTimer]
  );

  const handleBillableChange = useCallback(
    (checked: boolean) => {
      const previousBillable = isBillable;
      setIsBillable(checked);
      if (activeTimer?.isRunning) {
        updateTimer.mutate(
          {
            description: description || undefined,
            clientId: derivedClientId,
            taskId: workType === 'task' && taskId ? taskId : null,
            settlementId: workType === 'settlement' && settlementId ? settlementId : null,
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
    [
      activeTimer?.isRunning,
      description,
      derivedClientId,
      workType,
      taskId,
      settlementId,
      isBillable,
      updateTimer,
    ]
  );

  const isRunning = activeTimer?.isRunning;

  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-2 font-mono text-xl font-semibold tabular-nums',
                isRunning && 'text-green-600 dark:text-green-400'
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              {formattedTime}
              {isRunning && (
                <span
                  className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-normal text-green-700 dark:bg-green-900 dark:text-green-300"
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
              className="h-9 flex-1"
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
                disabled={startTimer.isPending || !canStart}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
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
      <CardContent className="space-y-4 p-4">
        <TimerFullViewControls
          formattedTime={formattedTime}
          isRunning={isRunning}
          description={description}
          onDescriptionChange={setDescription}
          onDescriptionBlur={handleDescriptionBlur}
          onStop={handleStop}
          onDiscard={handleDiscard}
          onStart={handleStart}
          isStopPending={stopTimer.isPending}
          isDiscardPending={discardTimer.isPending}
          isStartPending={startTimer.isPending}
          canStart={canStart}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex w-full items-center gap-4">
            <RadioGroup
              value={workType}
              onValueChange={(v) => handleWorkTypeChange(v as 'task' | 'settlement')}
              className="flex gap-4"
              disabled={startTimer.isPending || stopTimer.isPending}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="task" id="timer-workType-task" />
                <label htmlFor="timer-workType-task" className="cursor-pointer text-sm">
                  Zadanie
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="settlement" id="timer-workType-settlement" />
                <label htmlFor="timer-workType-settlement" className="cursor-pointer text-sm">
                  Rozliczenie
                </label>
              </div>
            </RadioGroup>

            {workType === 'task' && (
              <div className="min-w-[200px] flex-1">
                <Select
                  value={taskId || '__none__'}
                  onValueChange={handleTaskChange}
                  disabled={startTimer.isPending || stopTimer.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz zadanie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Wybierz zadanie</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {workType === 'settlement' && (
              <div className="min-w-[200px] flex-1">
                <Select
                  value={settlementId || '__none__'}
                  onValueChange={handleSettlementChange}
                  disabled={startTimer.isPending || stopTimer.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz rozliczenie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Wybierz rozliczenie</SelectItem>
                    {settlements.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.client?.name ? `${s.client.name} — ` : ''}
                        {s.month}/{s.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Clock className="text-muted-foreground h-5 w-5 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Key to reset form when active timer changes
  const formKey = activeTimer?.id ?? 'no-timer';

  // Derive workType from active timer
  const initialWorkType: 'task' | 'settlement' = activeTimer?.settlementId ? 'settlement' : 'task';

  return (
    <TimerForm
      key={formKey}
      initialDescription={activeTimer?.description || ''}
      initialWorkType={initialWorkType}
      initialTaskId={activeTimer?.taskId || ''}
      initialSettlementId={activeTimer?.settlementId || ''}
      initialIsBillable={activeTimer?.isBillable ?? true}
      activeTimer={activeTimer}
      compact={compact}
      className={className}
    />
  );
}
