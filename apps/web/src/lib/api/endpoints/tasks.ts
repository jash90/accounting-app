import { type PaginatedResponse } from '@/types/api';
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

// Tasks API
export const tasksApi = {
  getAll: async (filters?: TaskFiltersDto): Promise<PaginatedResponse<TaskResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<TaskResponseDto>>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<TaskResponseDto> => {
    const { data } = await apiClient.get<TaskResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  create: async (taskData: CreateTaskDto): Promise<TaskResponseDto> => {
    const { data } = await apiClient.post<TaskResponseDto>(BASE_URL, taskData);
    return data;
  },

  update: async (id: string, taskData: UpdateTaskDto): Promise<TaskResponseDto> => {
    const { data } = await apiClient.patch<TaskResponseDto>(`${BASE_URL}/${id}`, taskData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

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
};

// Task Labels API
const LABELS_URL = `${BASE_URL}/labels`;

export interface TaskLabelQueryDto {
  page?: number;
  limit?: number;
}

export const taskLabelsApi = {
  getAll: async (query?: TaskLabelQueryDto): Promise<PaginatedResponse<TaskLabelResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<TaskLabelResponseDto>>(LABELS_URL, {
      params: query,
    });
    return data;
  },

  getById: async (id: string): Promise<TaskLabelResponseDto> => {
    const { data } = await apiClient.get<TaskLabelResponseDto>(`${LABELS_URL}/${id}`);
    return data;
  },

  create: async (labelData: CreateTaskLabelDto): Promise<TaskLabelResponseDto> => {
    const { data } = await apiClient.post<TaskLabelResponseDto>(LABELS_URL, labelData);
    return data;
  },

  update: async (id: string, labelData: UpdateTaskLabelDto): Promise<TaskLabelResponseDto> => {
    const { data } = await apiClient.patch<TaskLabelResponseDto>(`${LABELS_URL}/${id}`, labelData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${LABELS_URL}/${id}`);
  },

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
