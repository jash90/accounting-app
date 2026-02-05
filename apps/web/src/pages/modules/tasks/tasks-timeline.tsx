import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  endOfMonth,
  format,
  max,
  min,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GanttChartSquare,
  LayoutGrid,
  List,
  Plus,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { TaskFilters } from '@/components/tasks/task-filters';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { useCreateTask, useTasks } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import { type CreateTaskDto, type TaskFiltersDto, type UpdateTaskDto } from '@/types/dtos';
import { TaskStatus, TaskStatusLabels, UserRole } from '@/types/enums';


// Lazy-load heavy form dialog to reduce initial bundle size - direct import for tree-shaking
const TaskFormDialog = lazy(() =>
  import('@/components/tasks/task-form-dialog').then((m) => ({
    default: m.TaskFormDialog,
  }))
);

// Loading fallback for dialog
const DialogLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-background rounded-lg p-6 shadow-lg">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-96" />
    </div>
  </div>
);

type ViewMode = 'day' | 'week' | 'month';

export default function TasksTimelinePage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const { hasWritePermission } = useModulePermissions('tasks');

  const createTask = useCreateTask();
  const [createOpen, setCreateOpen] = useState(false);

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  };

  const basePath = getBasePath();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<TaskFiltersDto>({});

  const { data: tasksResponse, isPending } = useTasks(filters);
  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data]);

  const handleFiltersChange = useCallback((newFilters: TaskFiltersDto) => {
    setFilters(newFilters);
  }, []);

  // Memoized submit handler to avoid recreating on each render
  const handleCreateSubmit = useCallback(
    async (data: CreateTaskDto | UpdateTaskDto) => {
      await createTask.mutateAsync(data as CreateTaskDto);
    },
    [createTask]
  );

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    let start: Date;
    let end: Date;
    let days: number;

    switch (viewMode) {
      case 'day':
        start = currentDate;
        end = addDays(currentDate, 13);
        days = 14;
        break;
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = addWeeks(start, 3);
        days = 28;
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(addMonths(currentDate, 2));
        days = differenceInDays(end, start) + 1;
        break;
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = addWeeks(start, 3);
        days = 28;
    }

    return { start, end, days };
  }, [currentDate, viewMode]);

  // Generate timeline headers
  const timelineHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isWeekend: boolean }[] = [];
    let current = timelineRange.start;

    for (let i = 0; i < timelineRange.days; i++) {
      const dayOfWeek = current.getDay();
      headers.push({
        date: current,
        label:
          viewMode === 'month'
            ? format(current, 'd', { locale: pl })
            : format(current, 'EEE d', { locale: pl }),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
      current = addDays(current, 1);
    }

    return headers;
  }, [timelineRange, viewMode]);

  // Filter tasks that have dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter((task) => task.dueDate || task.startDate);
  }, [tasks]);

  // Memoize task bar styles to prevent recalculation during render
  const taskBarStyles = useMemo(() => {
    const styles = new Map<string, { left: string; width: string } | null>();
    const rangeStart = timelineRange.start;
    const rangeEnd = timelineRange.end;
    const cellWidth = 100 / timelineRange.days;

    for (const task of tasksWithDates) {
      const taskStart = task.startDate
        ? new Date(task.startDate)
        : task.dueDate
          ? new Date(task.dueDate)
          : null;
      const taskEnd = task.dueDate
        ? new Date(task.dueDate)
        : task.startDate
          ? new Date(task.startDate)
          : null;

      if (!taskStart || !taskEnd) {
        styles.set(task.id, null);
        continue;
      }

      // Check if task is visible in current range
      if (taskEnd < rangeStart || taskStart > rangeEnd) {
        styles.set(task.id, null);
        continue;
      }

      const visibleStart = max([taskStart, rangeStart]);
      const visibleEnd = min([taskEnd, rangeEnd]);

      const startOffset = differenceInDays(visibleStart, rangeStart);
      const duration = differenceInDays(visibleEnd, visibleStart) + 1;

      styles.set(task.id, {
        left: `${startOffset * cellWidth}%`,
        width: `${duration * cellWidth}%`,
      });
    }

    return styles;
  }, [tasksWithDates, timelineRange]);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return 'bg-green-500';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-500';
      case TaskStatus.IN_REVIEW:
        return 'bg-purple-500';
      case TaskStatus.TODO:
        return 'bg-yellow-500';
      case TaskStatus.BACKLOG:
        return 'bg-slate-400';
      case TaskStatus.CANCELLED:
        return 'bg-red-300';
      default:
        return 'bg-gray-400';
    }
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    switch (direction) {
      case 'prev':
        switch (viewMode) {
          case 'day':
            setCurrentDate(addDays(currentDate, -7));
            break;
          case 'week':
            setCurrentDate(subWeeks(currentDate, 2));
            break;
          case 'month':
            setCurrentDate(subMonths(currentDate, 1));
            break;
        }
        break;
      case 'next':
        switch (viewMode) {
          case 'day':
            setCurrentDate(addDays(currentDate, 7));
            break;
          case 'week':
            setCurrentDate(addWeeks(currentDate, 2));
            break;
          case 'month':
            setCurrentDate(addMonths(currentDate, 1));
            break;
        }
        break;
      case 'today':
        setCurrentDate(new Date());
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Zadania"
        description="Zarządzaj zadaniami - widok osi czasu"
        icon={<CheckSquare className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/list`)}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/kanban`)}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/calendar`)}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="bg-accent">
              <GanttChartSquare className="h-4 w-4" />
            </Button>
          </div>
        }
        action={
          hasWritePermission ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nowe zadanie
            </Button>
          ) : undefined
        }
      />

      <TaskFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Timeline controls */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('today')}>
                Dziś
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleNavigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleNavigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 text-sm font-medium">
                {format(timelineRange.start, 'd MMM', { locale: pl })} -{' '}
                {format(timelineRange.end, 'd MMM yyyy', { locale: pl })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Widok:</span>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dzień</SelectItem>
                  <SelectItem value="week">Tydzień</SelectItem>
                  <SelectItem value="month">Miesiąc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isPending ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Timeline header */}
              <div className="bg-background sticky top-0 z-10 flex border-b">
                <div className="w-64 min-w-64 border-r p-3 text-sm font-medium">Zadanie</div>
                <div className="flex flex-1">
                  {timelineHeaders.map((header, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex-1 border-r p-2 text-center text-xs',
                        header.isWeekend && 'bg-muted/50'
                      )}
                    >
                      {header.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks rows */}
              {tasksWithDates.length === 0 ? (
                <div className="text-muted-foreground p-8 text-center">
                  Brak zadań z datami do wyświetlenia
                </div>
              ) : (
                tasksWithDates.map((task) => {
                  const barStyle = taskBarStyles.get(task.id);

                  return (
                    <div
                      key={task.id}
                      className="hover:bg-muted/30 flex border-b transition-colors"
                    >
                      {/* Task info */}
                      <div className="w-64 min-w-64 border-r p-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <TaskStatusBadge status={task.status} size="sm" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline bar */}
                      <div className="relative h-16 flex-1">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {timelineHeaders.map((header, index) => (
                            <div
                              key={index}
                              className={cn('flex-1 border-r', header.isWeekend && 'bg-muted/30')}
                            />
                          ))}
                        </div>

                        {/* Task bar */}
                        {barStyle && (
                          <div
                            role="button"
                            tabIndex={0}
                            className="absolute top-3 flex h-10 cursor-pointer items-center rounded px-2 transition-opacity hover:opacity-80"
                            style={{
                              left: barStyle.left,
                              width: barStyle.width,
                              minWidth: '24px',
                            }}
                            onClick={() => navigate(`${basePath}/list?taskId=${task.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`${basePath}/list?taskId=${task.id}`);
                              }
                            }}
                          >
                            <div
                              className={cn(
                                'flex h-full w-full items-center rounded px-2',
                                getStatusColor(task.status)
                              )}
                            >
                              <span className="truncate text-xs font-medium text-white">
                                {task.title}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">Legenda:</span>
            {Object.entries(TaskStatusLabels)
              .filter(([key]) => key !== TaskStatus.CANCELLED)
              .map(([status, label]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded', getStatusColor(status as TaskStatus))} />
                  <span>{label}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {hasWritePermission && createOpen && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <TaskFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateSubmit}
            isLoading={createTask.isPending}
          />
        </Suspense>
      )}
    </div>
  );
}
