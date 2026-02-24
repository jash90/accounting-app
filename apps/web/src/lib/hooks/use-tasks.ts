import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';

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
  taskTemplatesApi,
  type CreateTaskTemplateDto,
  type TaskLabelQueryDto,
  type TaskTemplateFiltersDto,
  type UpdateTaskTemplateDto,
} from '../api/endpoints/tasks';
import { queryKeys } from '../api/query-client';

export type { GlobalTaskStatisticsDto, TaskTemplateResponseDto } from '../api/endpoints/tasks';

// ============================================
// Helper Functions
// ============================================

/**
 * Predicate to invalidate task list/view queries (list, kanban, calendar) but not detail queries.
 * This consolidates the common invalidation pattern and prevents unnecessary refetches.
 */
const isTaskViewQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return (
    Array.isArray(key) &&
    key[0] === 'tasks' &&
    (key[1] === 'list' || key[1] === 'kanban' || key[1] === 'calendar')
  );
};

// ============================================
// Cache Time Constants
// ============================================

/** Cache times for task list and kanban views - data changes frequently */
const TASK_LIST_CACHE = {
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for task detail views - slightly longer */
const TASK_DETAIL_CACHE = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 10 * 60 * 1000, // 10 minutes
};

/** Cache times for lookup data - changes infrequently */
const TASK_LOOKUP_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
};

// ============================================
// Task Hooks
// ============================================

export function useTasks(filters?: TaskFiltersDto) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => tasksApi.getAll(filters),
    ...TASK_LIST_CACHE,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
    ...TASK_DETAIL_CACHE,
  });
}

export function useKanbanBoard(filters?: Omit<TaskFiltersDto, 'page' | 'limit'>) {
  return useQuery({
    queryKey: queryKeys.tasks.kanban(filters),
    queryFn: () => tasksApi.getKanbanBoard(filters),
    ...TASK_LIST_CACHE,
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
    ...TASK_LIST_CACHE,
  });
}

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.subtasks(taskId),
    queryFn: () => tasksApi.getSubtasks(taskId),
    enabled: !!taskId,
    ...TASK_DETAIL_CACHE,
  });
}

// Task lookup hooks for assignees and clients
// These use staleTime to prevent refetches on window focus for data that changes infrequently
export function useTaskAssignees() {
  return useQuery({
    queryKey: queryKeys.tasks.lookupAssignees,
    queryFn: () => tasksApi.getAssignees(),
    ...TASK_LOOKUP_CACHE,
  });
}

export function useTaskClients() {
  return useQuery({
    queryKey: queryKeys.tasks.lookupClients,
    queryFn: () => tasksApi.getClients(),
    retry: false, // Don't retry on 403 (module not accessible)
    throwOnError: false, // Don't throw on error, handle gracefully
    ...TASK_LOOKUP_CACHE,
  });
}

export function useClientTaskStatistics(clientId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.clientStatistics(clientId),
    queryFn: () => tasksApi.getClientStatistics(clientId),
    enabled: !!clientId,
    ...TASK_DETAIL_CACHE,
  });
}

export function useGlobalTaskStatistics() {
  return useQuery({
    queryKey: queryKeys.tasks.globalStatistics,
    queryFn: () => tasksApi.getGlobalStatistics(),
    staleTime: 30 * 1000,
  });
}

export function useTaskCompletionStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['tasks', 'stats', 'completion-duration', filters],
    queryFn: () => tasksApi.getCompletionDurationStats(filters),
  });
}

export function useEmployeeTaskRanking(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['tasks', 'stats', 'employee-ranking', filters],
    queryFn: () => tasksApi.getEmployeeTaskRanking(filters),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskData: CreateTaskDto) => tasksApi.create(taskData),
    onSuccess: (newTask) => {
      // Invalidate all task view queries (list, kanban, calendar) in one predicate call
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
      // Invalidate the specific task detail and subtasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(variables.id) });
      // Invalidate all task view queries (list, kanban, calendar) in one predicate call
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(deletedId) });
      // Invalidate all task view queries (list, kanban, calendar) in one predicate call
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
      // Invalidate all task view queries (list, kanban, calendar) in one predicate call
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
      // Batch invalidation using Set predicate - O(1) vs O(n) individual calls
      // This single predicate call replaces the previous forEach loop
      const affectedTaskIds = new Set(variables.taskIds);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'tasks' &&
            key[1] === 'detail' &&
            typeof key[2] === 'string' &&
            affectedTaskIds.has(key[2])
          );
        },
      });
      // Invalidate all task view queries (list, kanban, calendar) in one predicate call
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
  let stableQuery: TaskLabelQueryDto | undefined;
  if (query) {
    const stable: Partial<TaskLabelQueryDto> = {};
    if (query.search !== undefined) stable.search = query.search;
    if (query.isActive !== undefined) stable.isActive = query.isActive;
    stableQuery = Object.keys(stable).length > 0 ? (stable as TaskLabelQueryDto) : undefined;
  }

  return useQuery({
    queryKey: queryKeys.taskLabels.list(stableQuery),
    queryFn: () => taskLabelsApi.getAll(stableQuery),
    ...TASK_LOOKUP_CACHE,
  });
}

export function useTaskLabel(id: string) {
  return useQuery({
    queryKey: queryKeys.taskLabels.detail(id),
    queryFn: () => taskLabelsApi.getById(id),
    enabled: !!id,
    ...TASK_LOOKUP_CACHE,
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
      // Invalidate the specific task detail and all task view queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
      // Invalidate the specific task detail and all task view queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
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
    ...TASK_DETAIL_CACHE,
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
    ...TASK_DETAIL_CACHE,
  });
}

export function useTaskBlockedBy(taskId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.dependencies(taskId), 'blocked-by'],
    queryFn: () => taskDependenciesApi.getBlockedBy(taskId),
    enabled: !!taskId,
    ...TASK_DETAIL_CACHE,
  });
}

export function useTaskBlocking(taskId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.dependencies(taskId), 'blocking'],
    queryFn: () => taskDependenciesApi.getBlocking(taskId),
    enabled: !!taskId,
    ...TASK_DETAIL_CACHE,
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

// ============================================
// Export Hooks
// ============================================

export function useExportTasks() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (filters?: TaskFiltersDto) => tasksApi.exportCsv(filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = `zadania-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Sukces', description: 'Plik CSV został pobrany' });
      } finally {
        window.URL.revokeObjectURL(url);
      }
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wyeksportować zadań',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Task Template Hooks
// ============================================

export function useTaskTemplates(filters?: TaskTemplateFiltersDto) {
  return useQuery({
    queryKey: queryKeys.taskTemplates.list(filters),
    queryFn: () => taskTemplatesApi.getAll(filters),
    ...TASK_LOOKUP_CACHE,
  });
}

export function useTaskTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.taskTemplates.detail(id),
    queryFn: () => taskTemplatesApi.getById(id),
    enabled: !!id,
    ...TASK_LOOKUP_CACHE,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateTaskTemplateDto) => taskTemplatesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskTemplates.all });
      toast({ title: 'Sukces', description: 'Szablon zadania został utworzony' });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć szablonu',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskTemplateDto }) =>
      taskTemplatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskTemplates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskTemplates.detail(variables.id) });
      toast({ title: 'Sukces', description: 'Szablon zadania został zaktualizowany' });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować szablonu',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => taskTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskTemplates.all });
      toast({ title: 'Sukces', description: 'Szablon zadania został usunięty' });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć szablonu',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateId: string) => taskTemplatesApi.createTaskFromTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: isTaskViewQuery });
      toast({ title: 'Sukces', description: 'Zadanie zostało utworzone z szablonu' });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć zadania z szablonu',
        variant: 'destructive',
      });
    },
  });
}
