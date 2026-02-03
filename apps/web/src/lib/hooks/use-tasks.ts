import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import {
  type BulkUpdateStatusDto,
  type CreateTaskCommentDto,
  type CreateTaskDependencyDto,
  type CreateTaskDto,
  type CreateTaskLabelDto,
  type ReorderTasksDto,
  type TaskFiltersDto,
  type UpdateTaskCommentDto,
  type UpdateTaskDto,
  type UpdateTaskLabelDto,
} from '@/types/dtos';


import {
  taskCommentsApi,
  taskDependenciesApi,
  taskLabelsApi,
  tasksApi,
  type TaskLabelQueryDto,
} from '../api/endpoints/tasks';
import { queryKeys } from '../api/query-client';

// ============================================
// Task Hooks
// ============================================

export function useTasks(filters?: TaskFiltersDto) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => tasksApi.getAll(filters),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  });
}

export function useKanbanBoard(filters?: Omit<TaskFiltersDto, 'page' | 'limit'>) {
  return useQuery({
    queryKey: queryKeys.tasks.kanban(filters),
    queryFn: () => tasksApi.getKanbanBoard(filters),
  });
}

export function useCalendarTasks(params: {
  startDate: string;
  endDate: string;
  assigneeId?: string;
  clientId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.tasks.calendar(params),
    queryFn: () => tasksApi.getCalendarTasks(params),
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.subtasks(taskId),
    queryFn: () => tasksApi.getSubtasks(taskId),
    enabled: !!taskId,
  });
}

// Task lookup hooks for assignees and clients
export function useTaskAssignees() {
  return useQuery({
    queryKey: queryKeys.tasks.lookupAssignees,
    queryFn: () => tasksApi.getAssignees(),
  });
}

export function useTaskClients() {
  return useQuery({
    queryKey: queryKeys.tasks.lookupClients,
    queryFn: () => tasksApi.getClients(),
    retry: false, // Don't retry on 403 (module not accessible)
    throwOnError: false, // Don't throw on error, handle gracefully
  });
}

export function useClientTaskStatistics(clientId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.clientStatistics(clientId),
    queryFn: () => tasksApi.getClientStatistics(clientId),
    enabled: !!clientId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskData: CreateTaskDto) => tasksApi.create(taskData),
    onSuccess: (newTask) => {
      // Invalidate list views that need to show the new task
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'calendar'], exact: false });
      // Invalidate statistics if client was assigned
      if (newTask.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.clientStatistics(newTask.clientId),
        });
      }
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało utworzone',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć zadania',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) => tasksApi.update(id, data),
    onSuccess: (_updatedTask, variables) => {
      // Invalidate the specific task detail
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      // Invalidate list views (status/assignee/client might have changed)
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'calendar'], exact: false });
      // Invalidate subtasks if parent changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować zadania',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate list views
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'calendar'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało usunięte',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć zadania',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (reorderData: ReorderTasksDto) => tasksApi.reorderTasks(reorderData),
    onSuccess: () => {
      // Only invalidate views that show task order
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zmienić kolejności zadań',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (bulkData: BulkUpdateStatusDto) => tasksApi.bulkUpdateStatus(bulkData),
    onSuccess: (_, variables) => {
      // Invalidate detail queries for affected tasks
      variables.taskIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      });
      // Invalidate list views
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'calendar'], exact: false });
      toast({
        title: 'Sukces',
        description: `Zaktualizowano status ${variables.taskIds.length} zadań`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować statusu zadań',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Task Label Hooks
// ============================================

export function useTaskLabels(query?: TaskLabelQueryDto) {
  return useQuery({
    queryKey: [...queryKeys.taskLabels.all, query],
    queryFn: () => taskLabelsApi.getAll(query),
  });
}

export function useTaskLabel(id: string) {
  return useQuery({
    queryKey: queryKeys.taskLabels.detail(id),
    queryFn: () => taskLabelsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTaskLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (labelData: CreateTaskLabelDto) => taskLabelsApi.create(labelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.all });
      toast({
        title: 'Sukces',
        description: 'Etykieta została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć etykiety',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaskLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskLabelDto }) =>
      taskLabelsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Etykieta została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować etykiety',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => taskLabelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.all });
      toast({
        title: 'Sukces',
        description: 'Etykieta została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć etykiety',
        variant: 'destructive',
      });
    },
  });
}

export function useAssignTaskLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskLabelsApi.assignToTask(taskId, { labelId }),
    onSuccess: (_, variables) => {
      // Only invalidate the specific task and list views showing labels
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Etykieta została przypisana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przypisać etykiety',
        variant: 'destructive',
      });
    },
  });
}

export function useUnassignTaskLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskLabelsApi.unassignFromTask(taskId, labelId),
    onSuccess: (_, variables) => {
      // Only invalidate the specific task and list views showing labels
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'kanban'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Etykieta została usunięta z zadania',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć etykiety z zadania',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Task Comment Hooks
// ============================================

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.comments(taskId),
    queryFn: () => taskCommentsApi.getByTaskId(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateTaskCommentDto }) =>
      taskCommentsApi.create(taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
      toast({
        title: 'Sukces',
        description: 'Komentarz został dodany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się dodać komentarza',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      commentId,
      taskId: _taskId,
      data,
    }: {
      commentId: string;
      taskId: string;
      data: UpdateTaskCommentDto;
    }) => taskCommentsApi.update(commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
      toast({
        title: 'Sukces',
        description: 'Komentarz został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować komentarza',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ commentId, taskId: _taskId }: { commentId: string; taskId: string }) =>
      taskCommentsApi.delete(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
      toast({
        title: 'Sukces',
        description: 'Komentarz został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć komentarza',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Task Dependency Hooks
// ============================================

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.dependencies(taskId),
    queryFn: () => taskDependenciesApi.getByTaskId(taskId),
    enabled: !!taskId,
  });
}

export function useTaskBlockedBy(taskId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.dependencies(taskId), 'blocked-by'],
    queryFn: () => taskDependenciesApi.getBlockedBy(taskId),
    enabled: !!taskId,
  });
}

export function useTaskBlocking(taskId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.dependencies(taskId), 'blocking'],
    queryFn: () => taskDependenciesApi.getBlocking(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTaskDependency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateTaskDependencyDto }) =>
      taskDependenciesApi.create(taskId, data),
    onSuccess: (_, variables) => {
      // Invalidate dependencies and detail for affected tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      // Also invalidate the dependent task
      if (variables.data.dependsOnTaskId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.dependencies(variables.data.dependsOnTaskId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(variables.data.dependsOnTaskId),
        });
      }
      toast({
        title: 'Sukces',
        description: 'Zależność została dodana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się dodać zależności',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskDependency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ dependencyId, taskId: _taskId }: { dependencyId: string; taskId: string }) =>
      taskDependenciesApi.delete(dependencyId),
    onSuccess: (_, variables) => {
      // Invalidate dependencies for the task
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      toast({
        title: 'Sukces',
        description: 'Zależność została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć zależności',
        variant: 'destructive',
      });
    },
  });
}
