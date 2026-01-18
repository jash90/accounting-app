import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useAuthContext } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { CheckSquare, Plus, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';
import { UserRole } from '@/types/enums';
import { QuickAddTaskDialog } from './quick-add-task-dialog';

interface ClientTasksListProps {
  clientId: string;
  clientName: string;
}

export function ClientTasksList({ clientId, clientName }: ClientTasksListProps) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const { data: tasksData, isPending, error } = useTasks({ clientId, limit: 10 });

  const getTasksBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  };

  const tasksBasePath = getTasksBasePath();

  const handleTaskClick = (taskId: string) => {
    navigate(`${tasksBasePath}/${taskId}`);
  };

  if (isPending) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Zadania klienta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Zadania klienta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Nie udało się załadować zadań
          </p>
        </CardContent>
      </Card>
    );
  }

  const tasks = tasksData?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Zadania klienta
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTaskOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Dodaj zadanie
          </Button>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Brak zadań przypisanych do tego klienta
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => setAddTaskOpen(true)}
              >
                Dodaj pierwsze zadanie
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'done';

                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer',
                      'hover:bg-muted/50 transition-colors',
                      isOverdue && 'border-red-300 bg-red-50/50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <TaskStatusBadge status={task.status} size="sm" />
                        <TaskPriorityBadge
                          priority={task.priority}
                          size="sm"
                          showLabel={false}
                        />
                        {task.dueDate && (
                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              isOverdue
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                            )}
                          >
                            <Calendar size={12} />
                            {format(new Date(task.dueDate), 'd MMM', {
                              locale: pl,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                );
              })}

              {(tasksData?.total ?? 0) > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate(`${tasksBasePath}?clientId=${clientId}`)}
                >
                  Zobacz wszystkie zadania ({tasksData?.total})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickAddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}
