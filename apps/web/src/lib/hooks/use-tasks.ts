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


import { createExportHook } from './create-export-hook';
import { createMutationHook } from './create-mutation-hook';
import { CACHE_TIERS } from '../api/cache-config';
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
import { getApiErrorMessage } from '../utils/query-filters';

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

// Use shared cache tiers (frequent=30s/5m, standard=1m/10m, stable=5m/10m)
const TASK_LIST_CACHE = CACHE_TIERS.frequent;
const TASK_DETAIL_CACHE = CACHE_TIERS.standard;
const TASK_LOOKUP_CACHE = CACHE_TIERS.stable;

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
    queryKey: queryKeys.tasks.extendedStats.completionDuration(filters),
    queryFn: () => tasksApi.getCompletionDurationStats(filters),
  });
}

export function useEmployeeTaskRanking(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.tasks.extendedStats.employeeRanking(filters),
    queryFn: () => tasksApi.getEmployeeTaskRanking(filters),
  });
}

export function useTaskStatusDuration(
  status: string,
  filters?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: queryKeys.tasks.extendedStats.statusDuration(status, filters),
    queryFn: () => tasksApi.getStatusDurationRanking({ status, ...filters }),
  });
}

export const useCreateTask = createMutationHook<{ clientId?: string }, CreateTaskDto>({
  mutationFn: (taskData) => tasksApi.create(taskData),
  invalidatePredicate: isTaskViewQuery,
  onSuccess: (newTask, _variables, qc) => {
    if (newTask.clientId) {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.clientStatistics(newTask.clientId) });
    }
  },
  successMessage: 'Zadanie zostało utworzone',
  errorMessage: 'Nie udało się utworzyć zadania',
});

export const useUpdateTask = createMutationHook<void, { id: string; data: UpdateTaskDto }>({
  mutationFn: ({ id, data }) => tasksApi.update(id, data),
  invalidatePredicate: isTaskViewQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
    qc.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(variables.id) });
  },
  successMessage: 'Zadanie zostało zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować zadania',
});

export const useDeleteTask = createMutationHook<void, string>({
  mutationFn: (id) => tasksApi.delete(id),
  invalidatePredicate: isTaskViewQuery,
  onSuccess: (_, deletedId, qc) => {
    qc.removeQueries({ queryKey: queryKeys.tasks.detail(deletedId) });
  },
  successMessage: 'Zadanie zostało usunięte',
  errorMessage: 'Nie udało się usunąć zadania',
});

export const useReorderTasks = createMutationHook<void, ReorderTasksDto>({
  mutationFn: (reorderData) => tasksApi.reorderTasks(reorderData),
  invalidatePredicate: isTaskViewQuery,
  errorMessage: 'Nie udało się zmienić kolejności zadań',
});

export function useBulkUpdateTaskStatus() {
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
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować statusu zadań'),
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

export const useCreateTaskLabel = createMutationHook<void, CreateTaskLabelDto>({
  mutationFn: (labelData) => taskLabelsApi.create(labelData),
  invalidateKeys: [queryKeys.taskLabels.all],
  successMessage: 'Etykieta została utworzona',
  errorMessage: 'Nie udało się utworzyć etykiety',
});

export const useUpdateTaskLabel = createMutationHook<
  void,
  { id: string; data: UpdateTaskLabelDto }
>({
  mutationFn: ({ id, data }) => taskLabelsApi.update(id, data),
  invalidateKeys: [queryKeys.taskLabels.all],
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.taskLabels.detail(variables.id) });
  },
  successMessage: 'Etykieta została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować etykiety',
});

export const useDeleteTaskLabel = createMutationHook<void, string>({
  mutationFn: (id) => taskLabelsApi.delete(id),
  invalidateKeys: [queryKeys.taskLabels.all],
  successMessage: 'Etykieta została usunięta',
  errorMessage: 'Nie udało się usunąć etykiety',
});

export const useAssignTaskLabel = createMutationHook<void, { taskId: string; labelId: string }>({
  mutationFn: ({ taskId, labelId }) => taskLabelsApi.assignToTask(taskId, { labelId }),
  invalidatePredicate: isTaskViewQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
  },
  successMessage: 'Etykieta została przypisana',
  errorMessage: 'Nie udało się przypisać etykiety',
});

export const useUnassignTaskLabel = createMutationHook<void, { taskId: string; labelId: string }>({
  mutationFn: ({ taskId, labelId }) => taskLabelsApi.unassignFromTask(taskId, labelId),
  invalidatePredicate: isTaskViewQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
  },
  successMessage: 'Etykieta została usunięta z zadania',
  errorMessage: 'Nie udało się usunąć etykiety z zadania',
});

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

export const useCreateTaskComment = createMutationHook<
  void,
  { taskId: string; data: CreateTaskCommentDto }
>({
  mutationFn: ({ taskId, data }) => taskCommentsApi.create(taskId, data),
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
  },
  successMessage: 'Komentarz został dodany',
  errorMessage: 'Nie udało się dodać komentarza',
});

export const useUpdateTaskComment = createMutationHook<
  void,
  { commentId: string; taskId: string; data: UpdateTaskCommentDto }
>({
  mutationFn: ({ commentId, data }) => taskCommentsApi.update(commentId, data),
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
  },
  successMessage: 'Komentarz został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować komentarza',
});

export const useDeleteTaskComment = createMutationHook<void, { commentId: string; taskId: string }>(
  {
    mutationFn: ({ commentId }) => taskCommentsApi.delete(commentId),
    onSuccess: (_, variables, qc) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.comments(variables.taskId) });
    },
    successMessage: 'Komentarz został usunięty',
    errorMessage: 'Nie udało się usunąć komentarza',
  }
);

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
    queryKey: queryKeys.tasks.blockedBy(taskId),
    queryFn: () => taskDependenciesApi.getBlockedBy(taskId),
    enabled: !!taskId,
    ...TASK_DETAIL_CACHE,
  });
}

export function useTaskBlocking(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.blocking(taskId),
    queryFn: () => taskDependenciesApi.getBlocking(taskId),
    enabled: !!taskId,
    ...TASK_DETAIL_CACHE,
  });
}

export const useCreateTaskDependency = createMutationHook<
  void,
  { taskId: string; data: CreateTaskDependencyDto }
>({
  mutationFn: ({ taskId, data }) => taskDependenciesApi.create(taskId, data),
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
    qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    if (variables.data.dependsOnTaskId) {
      qc.invalidateQueries({
        queryKey: queryKeys.tasks.dependencies(variables.data.dependsOnTaskId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.tasks.detail(variables.data.dependsOnTaskId),
      });
    }
  },
  successMessage: 'Zależność została dodana',
  errorMessage: 'Nie udało się dodać zależności',
});

export const useDeleteTaskDependency = createMutationHook<
  void,
  { dependencyId: string; taskId: string }
>({
  mutationFn: ({ dependencyId }) => taskDependenciesApi.delete(dependencyId),
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
    qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
  },
  successMessage: 'Zależność została usunięta',
  errorMessage: 'Nie udało się usunąć zależności',
});

// ============================================
// Export Hooks
// ============================================

export const useExportTasks = createExportHook<TaskFiltersDto>(
  (filters) => tasksApi.exportCsv(filters),
  'zadania',
  'Nie udało się wyeksportować zadań'
);

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

export const useCreateTaskTemplate = createMutationHook<void, CreateTaskTemplateDto>({
  mutationFn: (dto) => taskTemplatesApi.create(dto),
  invalidateKeys: [queryKeys.taskTemplates.all],
  successMessage: 'Szablon zadania został utworzony',
  errorMessage: 'Nie udało się utworzyć szablonu',
});

export const useUpdateTaskTemplate = createMutationHook<
  void,
  { id: string; data: UpdateTaskTemplateDto }
>({
  mutationFn: ({ id, data }) => taskTemplatesApi.update(id, data),
  invalidateKeys: [queryKeys.taskTemplates.all],
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.taskTemplates.detail(variables.id) });
  },
  successMessage: 'Szablon zadania został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować szablonu',
});

export const useDeleteTaskTemplate = createMutationHook<void, string>({
  mutationFn: (id) => taskTemplatesApi.delete(id),
  invalidateKeys: [queryKeys.taskTemplates.all],
  successMessage: 'Szablon zadania został usunięty',
  errorMessage: 'Nie udało się usunąć szablonu',
});

export const useCreateTaskFromTemplate = createMutationHook<void, string>({
  mutationFn: (templateId) => taskTemplatesApi.createTaskFromTemplate(templateId),
  invalidatePredicate: isTaskViewQuery,
  successMessage: 'Zadanie zostało utworzone z szablonu',
  errorMessage: 'Nie udało się utworzyć zadania z szablonu',
});
