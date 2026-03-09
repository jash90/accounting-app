import {
  type AssignLabelDto,
  type BulkUpdateStatusDto,
  type CalendarTaskDto,
  type CreateTaskCommentDto,
  type CreateTaskDependencyDto,
  type CreateTaskDto,
  type CreateTaskLabelDto,
  type KanbanBoardDto,
  type ReorderTasksDto,
  type TaskCommentResponseDto,
  type TaskDependencyResponseDto,
  type TaskFiltersDto,
  type TaskLabelResponseDto,
  type TaskResponseDto,
  type UpdateTaskCommentDto,
  type UpdateTaskDto,
  type UpdateTaskLabelDto,
} from '@/types/dtos';

import apiClient from '../client';
import { createBlobExport, createCrudApi } from '../crud-factory';

const BASE_URL = '/api/modules/tasks';

// Lookup types for task assignees and clients
export interface TaskAssigneeDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TaskClientDto {
  id: string;
  name: string;
}

// Client task statistics
export interface ClientTaskStatisticsDto {
  clientId: string;
  byStatus: Record<string, number>;
  totalCount: number;
  totalEstimatedMinutes: number;
  totalStoryPoints: number;
}

// Global task statistics
export interface GlobalTaskStatisticsDto {
  byStatus: Record<string, number>;
  total: number;
  overdue: number;
  dueSoon: number;
  unassigned: number;
}

// Tasks API
export const tasksApi = {
  ...createCrudApi<TaskResponseDto, CreateTaskDto, UpdateTaskDto, TaskFiltersDto>(BASE_URL),

  // Kanban view
  getKanbanBoard: async (
    filters?: Omit<TaskFiltersDto, 'page' | 'limit'>
  ): Promise<KanbanBoardDto> => {
    const { data } = await apiClient.get<{
      columns: Array<{
        status: string;
        label: string;
        tasks: TaskResponseDto[];
        count: number;
      }>;
    }>(`${BASE_URL}/kanban`, {
      params: filters,
    });
    // Transform API response (columns array) to KanbanBoardDto format (object by status)
    const board: KanbanBoardDto = {};
    data.columns.forEach((column) => {
      board[column.status] = column.tasks;
    });
    return board;
  },

  // Calendar view
  getCalendarTasks: async (params: {
    startDate: string;
    endDate: string;
    assigneeId?: string;
    clientId?: string;
  }): Promise<CalendarTaskDto[]> => {
    const { data } = await apiClient.get<CalendarTaskDto[]>(`${BASE_URL}/calendar`, {
      params,
    });
    return data;
  },

  // Reorder tasks (for drag & drop)
  reorderTasks: async (reorderData: ReorderTasksDto): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.patch<TaskResponseDto[]>(`${BASE_URL}/reorder`, reorderData);
    return data;
  },

  // Bulk status update
  bulkUpdateStatus: async (bulkData: BulkUpdateStatusDto): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.patch<TaskResponseDto[]>(`${BASE_URL}/bulk-status`, bulkData);
    return data;
  },

  // Subtasks
  getSubtasks: async (taskId: string): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.get<TaskResponseDto[]>(`${BASE_URL}/${taskId}/subtasks`);
    return data;
  },

  // Lookup endpoints for assignees and clients
  getAssignees: async (): Promise<TaskAssigneeDto[]> => {
    const { data } = await apiClient.get<TaskAssigneeDto[]>(`${BASE_URL}/lookup/assignees`);
    return data;
  },

  getClients: async (): Promise<TaskClientDto[]> => {
    const { data } = await apiClient.get<TaskClientDto[]>(`${BASE_URL}/lookup/clients`);
    return data;
  },

  // Client statistics
  getClientStatistics: async (clientId: string): Promise<ClientTaskStatisticsDto> => {
    const { data } = await apiClient.get<ClientTaskStatisticsDto>(
      `${BASE_URL}/statistics/client/${clientId}`
    );
    return data;
  },

  // Global statistics
  getGlobalStatistics: async (): Promise<GlobalTaskStatisticsDto> => {
    const { data } = await apiClient.get<GlobalTaskStatisticsDto>(`${BASE_URL}/statistics`);
    return data;
  },

  // CSV export
  exportCsv: createBlobExport<TaskFiltersDto>(`${BASE_URL}/export`),

  // Extended statistics
  getCompletionDurationStats: (params?: { startDate?: string; endDate?: string }) =>
    apiClient
      .get(`${BASE_URL}/statistics/extended/completion-duration`, { params })
      .then((r) => r.data),

  getEmployeeTaskRanking: (params?: { startDate?: string; endDate?: string }) =>
    apiClient
      .get(`${BASE_URL}/statistics/extended/employee-ranking`, { params })
      .then((r) => r.data),

  getStatusDurationRanking: (params: { status: string; startDate?: string; endDate?: string }) =>
    apiClient
      .get(`${BASE_URL}/statistics/extended/status-duration`, { params })
      .then((r) => r.data),
};

// ============================================
// Task Templates API
// ============================================

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrencePatternDto {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
}

export interface TaskTemplateResponseDto {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  assignee?: { id: string; firstName?: string; lastName?: string; email: string };
  clientId?: string;
  client?: { id: string; name: string };
  estimatedMinutes?: number;
  recurrencePattern?: RecurrencePatternDto | null;
  recurrenceEndDate?: string | null;
  lastRecurrenceDate?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskTemplateDto {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  clientId?: string;
  estimatedMinutes?: number;
  recurrencePattern?: RecurrencePatternDto;
  recurrenceEndDate?: string;
}

export interface UpdateTaskTemplateDto {
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  clientId?: string;
  estimatedMinutes?: number;
  recurrencePattern?: RecurrencePatternDto | null;
  recurrenceEndDate?: string | null;
}

export interface TaskTemplateFiltersDto {
  search?: string;
  page?: number;
  limit?: number;
}

const TEMPLATES_URL = `${BASE_URL}/templates`;

export const taskTemplatesApi = {
  ...createCrudApi<
    TaskTemplateResponseDto,
    CreateTaskTemplateDto,
    UpdateTaskTemplateDto,
    TaskTemplateFiltersDto
  >(TEMPLATES_URL),

  createTaskFromTemplate: async (templateId: string): Promise<TaskTemplateResponseDto> => {
    const { data } = await apiClient.post<TaskTemplateResponseDto>(
      `${TEMPLATES_URL}/${templateId}/create-task`
    );
    return data;
  },
};

// Task Labels API
const LABELS_URL = `${BASE_URL}/labels`;

export interface TaskLabelQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const taskLabelsApi = {
  ...createCrudApi<TaskLabelResponseDto, CreateTaskLabelDto, UpdateTaskLabelDto, TaskLabelQueryDto>(
    LABELS_URL
  ),

  // Assign label to task
  assignToTask: async (
    taskId: string,
    assignData: AssignLabelDto
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(
      `${BASE_URL}/${taskId}/labels`,
      assignData
    );
    return data;
  },

  // Unassign label from task
  unassignFromTask: async (taskId: string, labelId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${taskId}/labels/${labelId}`);
  },
};

// Task Comments API
export const taskCommentsApi = {
  getByTaskId: async (taskId: string): Promise<TaskCommentResponseDto[]> => {
    const { data } = await apiClient.get<TaskCommentResponseDto[]>(
      `${BASE_URL}/${taskId}/comments`
    );
    return data;
  },

  create: async (
    taskId: string,
    commentData: CreateTaskCommentDto
  ): Promise<TaskCommentResponseDto> => {
    const { data } = await apiClient.post<TaskCommentResponseDto>(
      `${BASE_URL}/${taskId}/comments`,
      commentData
    );
    return data;
  },

  update: async (
    commentId: string,
    commentData: UpdateTaskCommentDto
  ): Promise<TaskCommentResponseDto> => {
    const { data } = await apiClient.patch<TaskCommentResponseDto>(
      `${BASE_URL}/comments/${commentId}`,
      commentData
    );
    return data;
  },

  delete: async (commentId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/comments/${commentId}`);
  },
};

// Task Dependencies API
export const taskDependenciesApi = {
  getByTaskId: async (taskId: string): Promise<TaskDependencyResponseDto[]> => {
    const { data } = await apiClient.get<TaskDependencyResponseDto[]>(
      `${BASE_URL}/${taskId}/dependencies`
    );
    return data;
  },

  getBlockedBy: async (taskId: string): Promise<TaskDependencyResponseDto[]> => {
    const { data } = await apiClient.get<TaskDependencyResponseDto[]>(
      `${BASE_URL}/${taskId}/dependencies/blocked-by`
    );
    return data;
  },

  getBlocking: async (taskId: string): Promise<TaskDependencyResponseDto[]> => {
    const { data } = await apiClient.get<TaskDependencyResponseDto[]>(
      `${BASE_URL}/${taskId}/dependencies/blocking`
    );
    return data;
  },

  create: async (
    taskId: string,
    dependencyData: CreateTaskDependencyDto
  ): Promise<TaskDependencyResponseDto> => {
    const { data } = await apiClient.post<TaskDependencyResponseDto>(
      `${BASE_URL}/${taskId}/dependencies`,
      dependencyData
    );
    return data;
  },

  delete: async (dependencyId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/dependencies/${dependencyId}`);
  },
};
