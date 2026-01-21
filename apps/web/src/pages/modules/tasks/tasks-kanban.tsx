import { useState, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Plus,
  CheckSquare,
  ArrowLeft,
  List,
  LayoutGrid,
  Calendar,
  GanttChartSquare,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { KanbanBoard, TaskFormDialog } from '@/components/tasks';
import { TaskFilters } from '@/components/tasks/task-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useKanbanBoard,
  useCreateTask,
  useUpdateTask,
  useReorderTasks,
} from '@/lib/hooks/use-tasks';
import {
  type TaskResponseDto,
  type CreateTaskDto,
  type UpdateTaskDto,
  type TaskFiltersDto,
} from '@/types/dtos';
import { TaskStatus, UserRole } from '@/types/enums';

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
          <div className="flex items-center gap-1 border rounded-lg p-1">
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
            <Button onClick={() => handleAddTask(TaskStatus.TODO)}>
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
            <div key={i} className="flex flex-col w-[300px] min-w-[300px] bg-muted/50 rounded-lg">
              <div className="p-3 border-b bg-background/50 rounded-t-lg">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="p-2 space-y-2">
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
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Brak danych do wyświetlenia
        </div>
      )}

      {hasWritePermission && (
        <>
          <TaskFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={async (data) => {
              await createTask.mutateAsync({
                ...data,
                status: createDefaultStatus,
              } as CreateTaskDto);
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
    </div>
  );
}
