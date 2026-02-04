import { lazy, Suspense, useCallback, useMemo, useState, useTransition } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Edit,
  GanttChartSquare,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { TaskFilters } from '@/components/tasks/task-filters';
import { TaskLabelList } from '@/components/tasks/task-label-badge';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useBulkUpdateStatus,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from '@/lib/hooks/use-tasks';
import { mapTaskLabels } from '@/lib/utils/task-label-mapper';
import {
  type CreateTaskDto,
  type TaskFiltersDto,
  type TaskResponseDto,
  type UpdateTaskDto,
} from '@/types/dtos';
import { TaskStatusLabels, UserRole, type TaskStatus } from '@/types/enums';

// Lazy-load heavy form dialog (547 lines) - direct import for tree-shaking
const TaskFormDialog = lazy(() =>
  import('@/components/tasks/task-form-dialog').then((m) => ({
    default: m.TaskFormDialog,
  }))
);
export default function TasksListPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { hasWritePermission, hasDeletePermission } = useModulePermissions('tasks');

  // Memoize basePath to prevent recalculation on every render
  const basePath = useMemo(() => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  }, [user?.role]);

  const [filters, setFilters] = useState<TaskFiltersDto>({});
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { data: tasksResponse, isPending } = useTasks(filters);
  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdateStatus = useBulkUpdateStatus();
  const [isBulkPending, startBulkTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponseDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskResponseDto | null>(null);

  // Handle taskId from URL (from calendar/timeline navigation)
  // Derive the task to edit from URL param
  const taskIdFromUrl = searchParams.get('taskId');
  const taskFromUrl = useMemo(() => {
    if (!taskIdFromUrl || tasks.length === 0) return null;
    return tasks.find((t) => t.id === taskIdFromUrl) || null;
  }, [taskIdFromUrl, tasks]);

  // The active editing task is either from local state or derived from URL
  const activeEditingTask = editingTask || taskFromUrl;

  const handleFiltersChange = useCallback((newFilters: TaskFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handleRowSelection = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks((prev) => (selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)));
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedTasks(tasks.map((t) => t.id));
      } else {
        setSelectedTasks([]);
      }
    },
    [tasks]
  );

  // Memoized submit handlers to avoid recreating on each render
  const handleCreateSubmit = useCallback(
    async (data: CreateTaskDto) => {
      await createTask.mutateAsync(data);
    },
    [createTask]
  );

  const handleUpdateSubmit = useCallback(
    async (data: UpdateTaskDto) => {
      if (!activeEditingTask) return;
      await updateTask.mutateAsync({
        id: activeEditingTask.id,
        data,
      });
      setEditingTask(null);
      if (taskIdFromUrl) {
        setSearchParams({}, { replace: true });
      }
    },
    [updateTask, activeEditingTask, taskIdFromUrl, setSearchParams]
  );

  const handleBulkStatusChange = useCallback(
    (status: TaskStatus) => {
      if (selectedTasks.length === 0) return;
      startBulkTransition(() => {
        bulkUpdateStatus.mutate(
          { taskIds: selectedTasks, status },
          { onSuccess: () => setSelectedTasks([]) }
        );
      });
    },
    [selectedTasks, bulkUpdateStatus]
  );

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const columns: ColumnDef<TaskResponseDto>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
              handleSelectAll(!!value);
            }}
            aria-label="Zaznacz wszystkie"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
              handleRowSelection(row.original.id, !!value);
            }}
            aria-label="Zaznacz wiersz"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'title',
        header: 'Tytuł',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.original.title}</span>
            {row.original.labels && row.original.labels.length > 0 && (
              <TaskLabelList labels={mapTaskLabels(row.original.labels)} size="sm" maxVisible={2} />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <TaskStatusBadge status={row.original.status} size="sm" />,
      },
      {
        accessorKey: 'priority',
        header: 'Priorytet',
        cell: ({ row }) => <TaskPriorityBadge priority={row.original.priority} size="sm" />,
      },
      {
        accessorKey: 'dueDate',
        header: 'Termin',
        cell: ({ row }) => {
          const dueDate = row.original.dueDate;
          if (!dueDate) return <span className="text-muted-foreground">-</span>;

          const isOverdue = new Date(dueDate) < new Date() && row.original.status !== 'done';
          return (
            <span className={isOverdue ? 'font-medium text-red-600' : ''}>
              {format(new Date(dueDate), 'd MMM yyyy', { locale: pl })}
            </span>
          );
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Przypisany',
        cell: ({ row }) => {
          const assignee = row.original.assignee;
          if (!assignee) return <span className="text-muted-foreground">-</span>;

          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getInitials(assignee.firstName, assignee.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {assignee.firstName} {assignee.lastName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'client',
        header: 'Klient',
        cell: ({ row }) => (
          <span className="block max-w-[150px] truncate text-sm">
            {row.original.client?.name || '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Akcje',
        cell: ({ row }) => {
          const task = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasWritePermission && task.isActive && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTask(task);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {hasDeletePermission && task.isActive && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingTask(task);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [hasWritePermission, hasDeletePermission, handleRowSelection, handleSelectAll]
  );

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
        description="Zarządzaj zadaniami - widok listy"
        icon={<CheckSquare className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="sm" className="bg-accent">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/kanban`)}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/calendar`)}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/timeline`)}>
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

      {/* Bulk actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-muted-foreground text-sm">
              Zaznaczono {selectedTasks.length} zadań
            </span>
            <div className="flex items-center gap-2">
              <span className="mr-2 text-sm">Zmień status na:</span>
              {Object.entries(TaskStatusLabels).map(([value, label]) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange(value as TaskStatus)}
                  disabled={bulkUpdateStatus.isPending || isBulkPending}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={tasks}
            isLoading={isPending}
            onRowClick={(task) => setEditingTask(task)}
          />
        </CardContent>
      </Card>

      {hasWritePermission && (
        <>
          {createOpen && (
            <Suspense
              fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                </div>
              }
            >
              <TaskFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreateSubmit}
                isLoading={createTask.isPending}
              />
            </Suspense>
          )}

          {activeEditingTask && (
            <Suspense
              fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                </div>
              }
            >
              <TaskFormDialog
                open={!!activeEditingTask}
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingTask(null);
                    // Clear URL param if present
                    if (taskIdFromUrl) {
                      setSearchParams({}, { replace: true });
                    }
                  }
                }}
                task={activeEditingTask}
                onSubmit={handleUpdateSubmit}
                isLoading={updateTask.isPending}
              />
            </Suspense>
          )}
        </>
      )}

      {hasDeletePermission && deletingTask && (
        <ConfirmDialog
          open={!!deletingTask}
          onOpenChange={(open) => !open && setDeletingTask(null)}
          title="Usuń zadanie"
          description={`Czy na pewno chcesz usunąć zadanie "${deletingTask.title}"?`}
          variant="destructive"
          onConfirm={() => {
            deleteTask.mutate(deletingTask.id, {
              onSuccess: () => setDeletingTask(null),
              onSettled: () => setDeletingTask(null),
            });
          }}
          isLoading={deleteTask.isPending}
        />
      )}
    </div>
  );
}
