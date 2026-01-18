import { useState, useMemo, useCallback, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useBulkUpdateStatus,
} from '@/lib/hooks/use-tasks';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  MoreHorizontal,
  ArrowLeft,
  List,
  LayoutGrid,
  Calendar,
  GanttChartSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TaskResponseDto,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFiltersDto,
} from '@/types/dtos';
import {
  TaskStatus,
  TaskStatusLabels,
  UserRole,
} from '@/types/enums';
import {
  TaskStatusBadge,
  TaskPriorityBadge,
  TaskLabelList,
  TaskFormDialog,
} from '@/components/tasks';
import { TaskFilters } from '@/components/tasks/task-filters';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthContext } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function TasksListPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { hasWritePermission, hasDeletePermission } = useModulePermissions('tasks');

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

  const [filters, setFilters] = useState<TaskFiltersDto>({});
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { data: tasksResponse, isPending } = useTasks(filters);
  const tasks = tasksResponse?.data ?? [];

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdateStatus = useBulkUpdateStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponseDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskResponseDto | null>(null);

  // Handle taskId from URL (from calendar/timeline navigation)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        // Clear the URL param after opening the modal
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  const handleFiltersChange = useCallback((newFilters: TaskFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handleRowSelection = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks((prev) =>
      selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)
    );
  }, []);

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (selectedTasks.length === 0) return;
    await bulkUpdateStatus.mutateAsync({ taskIds: selectedTasks, status });
    setSelectedTasks([]);
  };

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
              if (value) {
                setSelectedTasks(tasks.map((t) => t.id));
              } else {
                setSelectedTasks([]);
              }
            }}
            aria-label="Zaznacz wszystkie"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedTasks.includes(row.original.id)}
            onCheckedChange={(value) =>
              handleRowSelection(row.original.id, !!value)
            }
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
              <TaskLabelList
                labels={row.original.labels.map((la) => la.label).filter(Boolean) as any}
                size="sm"
                maxVisible={2}
              />
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
        cell: ({ row }) => (
          <TaskPriorityBadge priority={row.original.priority} size="sm" />
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Termin',
        cell: ({ row }) => {
          const dueDate = row.original.dueDate;
          if (!dueDate) return <span className="text-muted-foreground">-</span>;

          const isOverdue =
            new Date(dueDate) < new Date() && row.original.status !== 'done';
          return (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
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
          <span className="text-sm truncate max-w-[150px] block">
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
    [selectedTasks, tasks, hasWritePermission, hasDeletePermission, handleRowSelection]
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
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="sm" className="bg-accent">
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/kanban`)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/calendar`)}
            >
              <Calendar className="h-4 w-4" />
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

      {/* Bulk actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">
              Zaznaczono {selectedTasks.length} zadań
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm mr-2">Zmień status na:</span>
              {Object.entries(TaskStatusLabels).map(([value, label]) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange(value as TaskStatus)}
                  disabled={bulkUpdateStatus.isPending}
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
          <TaskFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={async (data) => {
              await createTask.mutateAsync(data as CreateTaskDto);
            }}
            isLoading={createTask.isPending}
          />

          {editingTask && (
            <TaskFormDialog
              open={!!editingTask}
              onOpenChange={(open) => !open && setEditingTask(null)}
              task={editingTask}
              onSubmit={async (data) => {
                await updateTask.mutateAsync({
                  id: editingTask.id,
                  data: data as UpdateTaskDto,
                });
                setEditingTask(null);
              }}
              isLoading={updateTask.isPending}
            />
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
