import { useState, useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  differenceInDays,
  max,
  min,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckSquare,
  ArrowLeft,
  List,
  LayoutGrid,
  Calendar,
  GanttChartSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { TaskFormDialog, TaskStatusBadge } from '@/components/tasks';
import { TaskFilters } from '@/components/tasks/task-filters';
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
import { useTasks, useCreateTask } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import { type TaskResponseDto, type CreateTaskDto, type TaskFiltersDto } from '@/types/dtos';
import { TaskStatus, TaskStatusLabels, UserRole } from '@/types/enums';

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

  // Calculate task bar position
  const getTaskBarStyle = (task: TaskResponseDto) => {
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

    if (!taskStart || !taskEnd) return null;

    const rangeStart = timelineRange.start;
    const rangeEnd = timelineRange.end;

    // Check if task is visible in current range
    if (taskEnd < rangeStart || taskStart > rangeEnd) return null;

    const visibleStart = max([taskStart, rangeStart]);
    const visibleEnd = min([taskEnd, rangeEnd]);

    const startOffset = differenceInDays(visibleStart, rangeStart);
    const duration = differenceInDays(visibleEnd, visibleStart) + 1;

    const cellWidth = 100 / timelineRange.days;

    return {
      left: `${startOffset * cellWidth}%`,
      width: `${duration * cellWidth}%`,
    };
  };

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
          <div className="flex items-center gap-1 border rounded-lg p-1">
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
              <span className="text-sm font-medium ml-2">
                {format(timelineRange.start, 'd MMM', { locale: pl })} -{' '}
                {format(timelineRange.end, 'd MMM yyyy', { locale: pl })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Widok:</span>
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
        <CardContent className="p-0 overflow-x-auto">
          {isPending ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Timeline header */}
              <div className="flex border-b sticky top-0 bg-background z-10">
                <div className="w-64 min-w-64 p-3 border-r font-medium text-sm">Zadanie</div>
                <div className="flex-1 flex">
                  {timelineHeaders.map((header, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex-1 p-2 text-center text-xs border-r',
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
                <div className="p-8 text-center text-muted-foreground">
                  Brak zadań z datami do wyświetlenia
                </div>
              ) : (
                tasksWithDates.map((task) => {
                  const barStyle = getTaskBarStyle(task);

                  return (
                    <div
                      key={task.id}
                      className="flex border-b hover:bg-muted/30 transition-colors"
                    >
                      {/* Task info */}
                      <div className="w-64 min-w-64 p-3 border-r">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <TaskStatusBadge status={task.status} size="sm" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline bar */}
                      <div className="flex-1 relative h-16">
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
                            className="absolute top-3 h-10 rounded px-2 flex items-center cursor-pointer hover:opacity-80 transition-opacity"
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
                                'w-full h-full rounded flex items-center px-2',
                                getStatusColor(task.status)
                              )}
                            >
                              <span className="text-xs text-white font-medium truncate">
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
                  <div className={cn('w-3 h-3 rounded', getStatusColor(status as TaskStatus))} />
                  <span>{label}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {hasWritePermission && (
        <TaskFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (data) => {
            await createTask.mutateAsync(data as CreateTaskDto);
          }}
          isLoading={createTask.isPending}
        />
      )}
    </div>
  );
}
