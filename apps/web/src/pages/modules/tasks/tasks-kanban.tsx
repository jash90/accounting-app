import { lazy, Suspense, useCallback, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  GanttChartSquare,
  LayoutGrid,
  List,
  Plus,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskFilters } from '@/components/tasks/task-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useCreateTask,
  useKanbanBoard,
  useReorderTasks,
  useUpdateTask,
} from '@/lib/hooks/use-tasks';
import {
  type CreateTaskDto,
  type TaskFiltersDto,
  type TaskResponseDto,
  type UpdateTaskDto,
} from '@/types/dtos';
import { TaskStatus, UserRole } from '@/types/enums';


// Lazy-load heavy form dialog to reduce initial bundle size - direct import for tree-shaking
const TaskFormDialog = lazy(() =>
  import('@/components/tasks/task-form-dialog').then((m) => ({
    default: m.TaskFormDialog,
  }))
);

// Preload function for form dialog - triggered on mouse enter
const preloadTaskFormDialog = () => {
  import('@/components/tasks/task-form-dialog');
};

// Loading fallback for dialog
const DialogLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-background rounded-lg p-6 shadow-lg">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-96" />
    </div>
  </div>
);

export default function TasksKanbanPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const { hasWritePermission } = useModulePermissions('tasks');

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
  const { data: kanbanData, isPending } = useKanbanBoard(filters);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [editingTask, setEditingTask] = useState<TaskResponseDto | null>(null);

  const handleFiltersChange = useCallback((newFilters: TaskFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handleTaskClick = useCallback((task: TaskResponseDto) => {
    setEditingTask(task);
  }, []);

  const handleTaskMove = useCallback(
    async (taskId: string, newStatus: TaskStatus, newIndex: number) => {
      // Update task status
      await updateTask.mutateAsync({
        id: taskId,
        data: { status: newStatus },
      });

      // Reorder tasks if needed
      if (kanbanData) {
        const columnTasks = kanbanData[newStatus] || [];
        const taskIds = columnTasks.map((t) => t.id);

        // Move task to new position
        const currentIndex = taskIds.indexOf(taskId);
        if (currentIndex !== -1 && currentIndex !== newIndex) {
          taskIds.splice(currentIndex, 1);
          taskIds.splice(newIndex, 0, taskId);

          await reorderTasks.mutateAsync({
            taskIds,
            status: newStatus,
          });
        }
      }
    },
    [kanbanData, updateTask, reorderTasks]
  );

  const handleAddTask = useCallback((status: TaskStatus) => {
    setCreateDefaultStatus(status);
    setCreateOpen(true);
  }, []);

  // Memoized submit handlers to avoid recreating on each render
  const handleCreateSubmit = useCallback(
    async (data: CreateTaskDto | UpdateTaskDto) => {
      await createTask.mutateAsync({
        ...(data as CreateTaskDto),
        status: createDefaultStatus,
      });
    },
    [createTask, createDefaultStatus]
  );

  const handleUpdateSubmit = useCallback(
    async (data: UpdateTaskDto) => {
      if (!editingTask) return;
      await updateTask.mutateAsync({
        id: editingTask.id,
        data,
      });
      setEditingTask(null);
    },
    [updateTask, editingTask]
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
        description="Zarządzaj zadaniami - widok Kanban"
        icon={<CheckSquare className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/list`)}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="bg-accent">
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
            <Button
              onClick={() => handleAddTask(TaskStatus.TODO)}
              onMouseEnter={preloadTaskFormDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nowe zadanie
            </Button>
          ) : undefined
        }
      />

      <TaskFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {isPending ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-muted/50 flex w-[300px] min-w-[300px] flex-col rounded-lg">
              <div className="bg-background/50 rounded-t-lg border-b p-3">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : kanbanData ? (
        <KanbanBoard
          data={kanbanData}
          onTaskClick={handleTaskClick}
          onTaskMove={handleTaskMove}
          onAddTask={hasWritePermission ? handleAddTask : undefined}
        />
      ) : (
        <div className="text-muted-foreground flex h-64 items-center justify-center">
          Brak danych do wyświetlenia
        </div>
      )}

      {hasWritePermission && (
        <>
          {createOpen && (
            <Suspense fallback={<DialogLoadingFallback />}>
              <TaskFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreateSubmit}
                isLoading={createTask.isPending}
              />
            </Suspense>
          )}

          {editingTask && (
            <Suspense fallback={<DialogLoadingFallback />}>
              <TaskFormDialog
                open={!!editingTask}
                onOpenChange={(open) => !open && setEditingTask(null)}
                task={editingTask}
                onSubmit={handleUpdateSubmit}
                isLoading={updateTask.isPending}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
