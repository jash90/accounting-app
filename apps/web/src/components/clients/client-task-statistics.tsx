import { useClientTaskStatistics } from '@/lib/hooks/use-tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Clock, Target } from 'lucide-react';
import { TaskStatus, TaskStatusLabels } from '@/types/enums';

interface ClientTaskStatisticsProps {
  clientId: string;
}

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  [TaskStatus.TODO]: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  [TaskStatus.IN_REVIEW]: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  [TaskStatus.DONE]: 'bg-green-100 text-green-700 hover:bg-green-100',
  [TaskStatus.CANCELLED]: 'bg-red-100 text-red-700 hover:bg-red-100',
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
          <p className="text-sm text-muted-foreground">
            Nie udało się załadować statystyk
          </p>
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
          <p className="text-sm text-muted-foreground">
            Brak zadań do wyświetlenia
          </p>
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
          <span className="text-sm text-muted-foreground">Wszystkie</span>
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
                <span className="text-sm text-muted-foreground">
                  {TaskStatusLabels[status]}
                </span>
                <Badge className={statusColors[status]}>{count}</Badge>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        {statistics.totalEstimatedMinutes > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
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
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Story points
            </span>
            <span className="text-sm font-medium">
              {statistics.totalStoryPoints}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
