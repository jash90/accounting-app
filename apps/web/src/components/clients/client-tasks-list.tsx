import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { useAuthContext } from '@/contexts/auth-context';
import { cn } from '@/lib/utils/cn';
import { type TaskFiltersDto } from '@/types/dtos';
import { TaskPriority, TaskStatus as TaskStatusEnum, UserRole } from '@/types/enums';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  Plus,
  X,
} from 'lucide-react';

import { useTaskAssignees, useTasks } from '@/lib/hooks/use-tasks';
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

import { QuickAddTaskDialog } from './quick-add-task-dialog';

interface ClientTasksListProps {
  clientId: string;
  clientName: string;
}

const PAGE_SIZE = 10;

const TaskStatusLabels: Record<TaskStatusEnum, string> = {
  [TaskStatusEnum.BACKLOG]: 'Backlog',
  [TaskStatusEnum.TODO]: 'Do zrobienia',
  [TaskStatusEnum.IN_PROGRESS]: 'W trakcie',
  [TaskStatusEnum.IN_REVIEW]: 'Do przeglądu',
  [TaskStatusEnum.DONE]: 'Zakończone',
  [TaskStatusEnum.CANCELLED]: 'Anulowane',
};

const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.NONE]: 'Brak',
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

  const totalPages = tasksData ? Math.ceil(tasksData.meta.total / PAGE_SIZE) : 0;
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
          <p className="text-destructive text-sm">Nie udało się załadować zadań</p>
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
            {tasksData?.meta.total !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {tasksData.meta.total}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && 'text-primary')}
            >
              <Filter className="mr-1 h-4 w-4" />
              Filtry
              {hasActiveFilters && (
                <Badge
                  variant="default"
                  className="ml-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                >
                  !
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleViewKanban}>
              <LayoutGrid className="mr-1 h-4 w-4" />
              Kanban
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddTaskOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Dodaj zadanie
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="border-b px-6 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filters.status || '__all__'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'status',
                    value === '__all__' ? undefined : (value as TaskStatusEnum)
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
                  <X className="mr-1 h-4 w-4" />
                  Wyczyść
                </Button>
              )}
            </div>
          </div>
        )}

        <CardContent className={cn(!showFilters && 'pt-4')}>
          {tasks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckSquare className="text-muted-foreground/50 mx-auto mb-2 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
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
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== TaskStatusEnum.DONE;

                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTaskClick(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTaskClick(task.id);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg border p-3',
                      'hover:bg-muted/50 transition-colors',
                      isOverdue && 'border-red-300 bg-red-50/50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium">{task.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
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
                          <span className="text-muted-foreground text-xs">
                            • {task.assignee.firstName} {task.assignee.lastName?.[0]}.
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="text-muted-foreground ml-2 h-4 w-4 flex-shrink-0" />
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-muted-foreground text-sm">
                    Strona {currentPage} z {totalPages} ({tasksData?.meta.total} zadań)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Następna
                      <ChevronRight className="ml-1 h-4 w-4" />
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
