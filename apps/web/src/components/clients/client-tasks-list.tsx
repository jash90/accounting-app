import { useState, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckSquare,
  Plus,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Filter,
  X,
} from 'lucide-react';

import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthContext } from '@/contexts/auth-context';
import { useTasks, useTaskAssignees } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import { type TaskFiltersDto } from '@/types/dtos';
import { UserRole, TaskStatus, TaskPriority } from '@/types/enums';

import { QuickAddTaskDialog } from './quick-add-task-dialog';

interface ClientTasksListProps {
  clientId: string;
  clientName: string;
}

const PAGE_SIZE = 10;

const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'Do zrobienia',
  [TaskStatus.IN_PROGRESS]: 'W trakcie',
  [TaskStatus.REVIEW]: 'Do przeglądu',
  [TaskStatus.DONE]: 'Zakończone',
};

const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Niski',
  [TaskPriority.MEDIUM]: 'Średni',
  [TaskPriority.HIGH]: 'Wysoki',
  [TaskPriority.URGENT]: 'Pilny',
};

export function ClientTasksList({ clientId, clientName }: ClientTasksListProps) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFiltersDto>({
    clientId,
    page: 1,
    limit: PAGE_SIZE,
  });

  const { data: tasksData, isPending, error } = useTasks(filters);
  const { data: assignees } = useTaskAssignees();

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

  const handleViewKanban = () => {
    navigate(`${tasksBasePath}/kanban?clientId=${clientId}`);
  };

  const handleFilterChange = useCallback((key: keyof TaskFiltersDto, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset page when filters change
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      clientId,
      page: 1,
      limit: PAGE_SIZE,
    });
  }, [clientId]);

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId;

  const totalPages = tasksData ? Math.ceil(tasksData.total / PAGE_SIZE) : 0;
  const currentPage = filters.page || 1;

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
          <p className="text-sm text-destructive">Nie udało się załadować zadań</p>
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
            {tasksData?.total !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {tasksData.total}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && 'text-apptax-blue')}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtry
              {hasActiveFilters && (
                <Badge
                  variant="default"
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  !
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleViewKanban}>
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj zadanie
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="px-6 pb-4 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filters.status || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'status',
                    value === '__all__' ? undefined : (value as TaskStatus)
                  )
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszystkie</SelectItem>
                  {Object.entries(TaskStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.priority || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'priority',
                    value === '__all__' ? undefined : (value as TaskPriority)
                  )
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priorytet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszystkie</SelectItem>
                  {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.assigneeId || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange('assigneeId', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Przypisany do" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszyscy</SelectItem>
                  {assignees?.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.firstName} {assignee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Wyczyść
                </Button>
              )}
            </div>
          </div>
        )}

        <CardContent className={cn(!showFilters && 'pt-4')}>
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Brak zadań spełniających kryteria filtrowania'
                  : 'Brak zadań przypisanych do tego klienta'}
              </p>
              {!hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddTaskOpen(true)}
                >
                  Dodaj pierwsze zadanie
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isOverdue =
                  task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

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
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <TaskStatusBadge status={task.status} size="sm" />
                        <TaskPriorityBadge priority={task.priority} size="sm" showLabel={false} />
                        {task.dueDate && (
                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              isOverdue ? 'text-red-600' : 'text-muted-foreground'
                            )}
                          >
                            <Calendar size={12} />
                            {format(new Date(task.dueDate), 'd MMM', {
                              locale: pl,
                            })}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-xs text-muted-foreground">
                            • {task.assignee.firstName} {task.assignee.lastName?.[0]}.
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Strona {currentPage} z {totalPages} ({tasksData?.total} zadań)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Następna
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
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
