import { Link as RouterLink } from 'react-router-dom';

import { AlertTriangle, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type GlobalDashboardData } from '@/lib/hooks/use-global-dashboard';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';

interface DashboardActivitySectionProps {
  data: GlobalDashboardData;
  enabledModules: string[];
}

function TaskAlerts({
  overdue,
  dueSoon,
  tasksBasePath,
}: {
  overdue: number;
  dueSoon: number;
  tasksBasePath: string;
}) {
  if (overdue === 0 && dueSoon === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Brak zadań wymagających uwagi
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {overdue > 0 && (
        <RouterLink
          to={`${tasksBasePath}/list`}
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-950/30"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span className="flex-1 text-sm font-medium">Przeterminowane zadania</span>
          <Badge variant="destructive">{overdue}</Badge>
        </RouterLink>
      )}
      {dueSoon > 0 && (
        <RouterLink
          to={`${tasksBasePath}/list`}
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        >
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="flex-1 text-sm font-medium">Zadania do wykonania wkrótce</span>
          <Badge className="bg-amber-500">{dueSoon}</Badge>
        </RouterLink>
      )}
    </div>
  );
}

export function DashboardActivitySection({ data, enabledModules }: DashboardActivitySectionProps) {
  const hasModule = (slug: string) => enabledModules.includes(slug);
  const tasksBasePath = useModuleBasePath('tasks');

  const hasClients = hasModule('clients') && !!data.clientStats?.recentActivity?.length;
  const hasTasks = hasModule('tasks') && !!data.taskStats;

  if (!hasClients && !hasTasks) return null;

  const visibleCount = [hasClients, hasTasks].filter(Boolean).length;

  return (
    <div className={`grid grid-cols-1 gap-6 ${visibleCount > 1 ? 'lg:grid-cols-2' : ''}`}>
      {hasClients && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ostatnia aktywność klientów</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.clientStats!.recentActivity!.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-1">
                  <div className="bg-muted mt-1 h-2 w-2 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{activity.entityName}</p>
                    <p className="text-muted-foreground text-xs">
                      {activity.action}
                      {activity.changedByName && ` · ${activity.changedByName}`}
                    </p>
                  </div>
                  <time className="text-muted-foreground shrink-0 text-xs">
                    {new Date(activity.createdAt).toLocaleDateString('pl-PL')}
                  </time>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasTasks && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Zadania wymagające uwagi</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskAlerts
              overdue={data.taskStats!.overdue}
              dueSoon={data.taskStats!.dueSoon}
              tasksBasePath={tasksBasePath}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
