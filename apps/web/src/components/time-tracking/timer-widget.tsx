import { useState, useEffect, useMemo } from 'react';
import { Play, Square, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useUpdateTimer,
  useDiscardTimer,
} from '@/lib/hooks/use-time-tracking';
import { useTaskClients } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';

interface TimerWidgetProps {
  className?: string;
  compact?: boolean;
}

export function TimerWidget({ className, compact = false }: TimerWidgetProps) {
  const { data: activeTimer, isLoading } = useActiveTimer();
  const { data: clientsData } = useTaskClients();

  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const updateTimer = useUpdateTimer();
  const discardTimer = useDiscardTimer();

  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [isBillable, setIsBillable] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const clients = clientsData || [];

  // Calculate elapsed time
  useEffect(() => {
    if (activeTimer?.isRunning && activeTimer?.startTime) {
      const updateElapsed = () => {
        const start = new Date(activeTimer.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeTimer?.isRunning, activeTimer?.startTime]);

  // Sync form state with active timer
  useEffect(() => {
    if (activeTimer) {
      setDescription(activeTimer.description || '');
      setClientId(activeTimer.clientId || '');
      setIsBillable(activeTimer.isBillable);
    }
  }, [activeTimer]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  const handleStart = () => {
    startTimer.mutate({
      description: description || undefined,
      clientId: clientId || undefined,
      isBillable,
    });
  };

  const handleStop = () => {
    stopTimer.mutate({
      description: description || undefined,
    });
    setDescription('');
    setClientId('');
    setIsBillable(true);
  };

  const handleDiscard = () => {
    discardTimer.mutate();
    setDescription('');
    setClientId('');
    setIsBillable(true);
  };

  const handleDescriptionBlur = () => {
    if (activeTimer?.isRunning && description !== activeTimer.description) {
      updateTimer.mutate({
        description: description || undefined,
        clientId: clientId || undefined,
        isBillable,
      });
    }
  };

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

  const isRunning = activeTimer?.isRunning;

  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'text-xl font-mono font-semibold tabular-nums',
              isRunning && 'text-green-600'
            )}>
              {formattedTime}
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
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  disabled={discardTimer.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={startTimer.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
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
          <div className={cn(
            'text-3xl font-mono font-semibold tabular-nums min-w-[140px]',
            isRunning && 'text-green-600'
          )}>
            {formattedTime}
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
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button
                variant="ghost"
                onClick={handleDiscard}
                disabled={discardTimer.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStart}
              disabled={startTimer.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select
              value={clientId || '__none__'}
              onValueChange={(value) => {
                const actualValue = value === '__none__' ? '' : value;
                setClientId(actualValue);
                if (isRunning) {
                  updateTimer.mutate({
                    description: description || undefined,
                    clientId: actualValue || undefined,
                    isBillable,
                  });
                }
              }}
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
              onCheckedChange={(checked) => {
                setIsBillable(checked);
                if (isRunning) {
                  updateTimer.mutate({
                    description: description || undefined,
                    clientId: clientId || undefined,
                    isBillable: checked,
                  });
                }
              }}
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
