import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarTasks, useCreateTask } from '@/lib/hooks/use-tasks';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckSquare,
  ArrowLeft,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  GanttChartSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { CalendarTaskDto, CreateTaskDto, TaskFiltersDto } from '@/types/dtos';
import {
  TaskPriority,
  UserRole,
} from '@/types/enums';
import { TaskFormDialog } from '@/components/tasks';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/tasks';
import { TaskFilters } from '@/components/tasks/task-filters';
import { useAuthContext } from '@/contexts/auth-context';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';

export default function TasksCalendarPage() {
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

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState<TaskFiltersDto>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const dateFrom = startOfMonth(currentMonth);
  const dateTo = endOfMonth(currentMonth);

  const { data: calendarTasks, isPending } = useCalendarTasks({
    startDate: dateFrom.toISOString(),
    endDate: dateTo.toISOString(),
    ...filters,
  });

  const handleFiltersChange = useCallback((newFilters: TaskFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTaskDto[]>();
    if (calendarTasks) {
      calendarTasks.forEach((task) => {
        if (task.dueDate) {
          const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
          const existing = map.get(dateKey) || [];
          map.set(dateKey, [...existing, task]);
        }
      });
    }
    return map;
  }, [calendarTasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  }, [selectedDate, tasksByDate]);

  // Custom day content for calendar
  const getDayContent = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const tasks = tasksByDate.get(dateKey) || [];

    if (tasks.length === 0) return null;

    const urgentCount = tasks.filter(
      (t) => t.priority === TaskPriority.URGENT
    ).length;
    const highCount = tasks.filter(
      (t) => t.priority === TaskPriority.HIGH
    ).length;
    const otherCount = tasks.length - urgentCount - highCount;

    return (
      <div className="flex gap-0.5 mt-1">
        {urgentCount > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
        )}
        {highCount > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        )}
        {otherCount > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </div>
    );
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'border-l-red-500';
      case TaskPriority.HIGH:
        return 'border-l-orange-500';
      case TaskPriority.MEDIUM:
        return 'border-l-yellow-500';
      case TaskPriority.LOW:
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
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
        description="Zarządzaj zadaniami - widok kalendarza"
        icon={<CheckSquare className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/list`)}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/kanban`)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="bg-accent">
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timeline`)}
            >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              {format(currentMonth, 'LLLL yyyy', { locale: pl })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Dziś
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => setSelectedDate(date || null)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={pl}
                className="rounded-md border w-full"
                classNames={{
                  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                  month: 'space-y-4 w-full',
                  caption: 'hidden',
                  nav: 'hidden',
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex',
                  head_cell:
                    'text-muted-foreground rounded-md w-full font-normal text-[0.8rem]',
                  row: 'flex w-full mt-2',
                  cell: cn(
                    'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full',
                    '[&:has([aria-selected])]:bg-accent'
                  ),
                  day: cn(
                    'h-12 w-full p-0 font-normal flex flex-col items-center justify-start pt-1',
                    'aria-selected:opacity-100'
                  ),
                  day_selected:
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                  day_today: 'bg-accent text-accent-foreground',
                  day_outside: 'text-muted-foreground opacity-50',
                  day_disabled: 'text-muted-foreground opacity-50',
                }}
                components={{
                  DayContent: ({ date }) => (
                    <div className="flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {getDayContent(date)}
                    </div>
                  ),
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Selected date tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {selectedDate
                ? format(selectedDate, 'd MMMM yyyy', { locale: pl })
                : 'Wybierz dzień'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                Kliknij na dzień w kalendarzu, aby zobaczyć zadania
              </p>
            ) : selectedDateTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak zadań na ten dzień
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'p-3 rounded-lg border border-l-4 cursor-pointer hover:bg-muted/50 transition-colors',
                      getPriorityColor(task.priority)
                    )}
                    onClick={() => navigate(`${basePath}/list?taskId=${task.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm line-clamp-2">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <TaskStatusBadge status={task.status} size="sm" />
                      <TaskPriorityBadge priority={task.priority} size="sm" />
                    </div>
                    {task.assignee && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Pilne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Wysokie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Inne</span>
            </div>
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
