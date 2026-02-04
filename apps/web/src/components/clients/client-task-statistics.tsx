import { TaskStatus, TaskStatusLabels } from '@/types/enums';
import { BarChart3, Clock, Target } from 'lucide-react';

import { useClientTaskStatistics } from '@/lib/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientTaskStatisticsProps {
  clientId: string;
}

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [TaskStatus.TODO]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  [TaskStatus.IN_REVIEW]: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  [TaskStatus.DONE]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  [TaskStatus.CANCELLED]: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

function formatTime(minutes: number): string {
  if (minutes === 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} godz`;
  return `${hours} godz ${mins} min`;
}

export function ClientTaskStatistics({ clientId }: ClientTaskStatisticsProps) {
  const { data: statistics, isPending, error } = useClientTaskStatistics(clientId);

  if (isPending) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Statystyki zadań
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !statistics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Statystyki zadań
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Nie udało się załadować statystyk</p>
        </CardContent>
      </Card>
    );
  }

  // Check if there are any tasks
  if (statistics.totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Statystyki zadań
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Brak zadań do wyświetlenia</p>
        </CardContent>
      </Card>
    );
  }

  const orderedStatuses: TaskStatus[] = [
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
    TaskStatus.CANCELLED,
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Statystyki zadań
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total count */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Wszystkie</span>
          <Badge variant="secondary" className="font-semibold">
            {statistics.totalCount}
          </Badge>
        </div>

        {/* Status breakdown */}
        <div className="space-y-2">
          {orderedStatuses.map((status) => {
            const count = statistics.byStatus[status] || 0;
            if (count === 0) return null;

            return (
              <div key={status} className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{TaskStatusLabels[status]}</span>
                <Badge className={statusColors[status]}>{count}</Badge>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        {statistics.totalEstimatedMinutes > 0 && (
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              Estymowany czas
            </span>
            <span className="text-sm font-medium">
              {formatTime(statistics.totalEstimatedMinutes)}
            </span>
          </div>
        )}

        {/* Story points */}
        {statistics.totalStoryPoints > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Target className="h-3 w-3" />
              Story points
            </span>
            <span className="text-sm font-medium">{statistics.totalStoryPoints}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
