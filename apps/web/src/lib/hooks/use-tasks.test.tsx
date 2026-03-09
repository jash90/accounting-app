import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  taskCommentsApi,
  taskDependenciesApi,
  taskLabelsApi,
  tasksApi,
  taskTemplatesApi,
} from '../api/endpoints/tasks';
import {
  useAssignTaskLabel,
  useBulkUpdateTaskStatus,
  useCalendarTasks,
  useClientTaskStatistics,
  useCreateTask,
  useCreateTaskComment,
  useCreateTaskDependency,
  useCreateTaskFromTemplate,
  useCreateTaskLabel,
  useCreateTaskTemplate,
  useDeleteTask,
  useDeleteTaskComment,
  useDeleteTaskDependency,
  useDeleteTaskLabel,
  useDeleteTaskTemplate,
  useEmployeeTaskRanking,
  useExportTasks,
  useGlobalTaskStatistics,
  useKanbanBoard,
  useReorderTasks,
  useSubtasks,
  useTask,
  useTaskAssignees,
  useTaskBlockedBy,
  useTaskBlocking,
  useTaskClients,
  useTaskComments,
  useTaskCompletionStats,
  useTaskDependencies,
  useTaskLabel,
  useTaskLabels,
  useTasks,
  useTaskStatusDuration,
  useTaskTemplate,
  useTaskTemplates,
  useUnassignTaskLabel,
  useUpdateTask,
  useUpdateTaskComment,
  useUpdateTaskLabel,
  useUpdateTaskTemplate,
} from './use-tasks';

// Mock the API modules
vi.mock('../api/endpoints/tasks');
vi.mock('@/components/ui/use-toast');
vi.mock('../utils/download', () => ({
  downloadBlob: vi.fn(),
}));

const mockToast = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockTask = {
  id: 'task-123',
  title: 'Test task',
  description: 'Test description',
  status: 'TODO',
  priority: 'MEDIUM',
  companyId: 'company-123',
  createdById: 'user-123',
  isActive: true,
};

const mockPaginatedResponse = {
  data: [mockTask],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockKanbanBoard = {
  TODO: [mockTask],
  IN_PROGRESS: [],
  DONE: [],
};

const mockCalendarTask = {
  id: 'task-123',
  title: 'Test task',
  startDate: '2024-01-15',
  endDate: '2024-01-16',
  status: 'TODO',
};

const mockLabel = {
  id: 'label-123',
  name: 'Bug',
  color: '#ff0000',
  companyId: 'company-123',
};

const mockComment = {
  id: 'comment-123',
  content: 'Test comment',
  taskId: 'task-123',
  userId: 'user-123',
};

const mockDependency = {
  id: 'dep-123',
  taskId: 'task-123',
  dependsOnTaskId: 'task-456',
};

const mockTemplate = {
  id: 'template-123',
  title: 'Template task',
  companyId: 'company-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockError = {
  response: { data: { message: 'Server error' } },
};

describe('use-tasks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Task Query Hooks
  // ========================================

  describe('useTasks', () => {
    it('should fetch tasks', async () => {
      vi.mocked(tasksApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(tasksApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to API', async () => {
      vi.mocked(tasksApi.getAll).mockResolvedValue(mockPaginatedResponse);
      const filters = { status: 'TODO' as const, page: 2 };

      const { result } = renderHook(() => useTasks(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useTask', () => {
    it('should fetch single task', async () => {
      vi.mocked(tasksApi.getById).mockResolvedValue(mockTask);

      const { result } = renderHook(() => useTask('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTask);
      expect(tasksApi.getById).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useTask(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(tasksApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useKanbanBoard', () => {
    it('should fetch kanban board', async () => {
      vi.mocked(tasksApi.getKanbanBoard).mockResolvedValue(mockKanbanBoard);

      const { result } = renderHook(() => useKanbanBoard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockKanbanBoard);
      expect(tasksApi.getKanbanBoard).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to kanban API', async () => {
      vi.mocked(tasksApi.getKanbanBoard).mockResolvedValue(mockKanbanBoard);
      const filters = { assigneeId: 'user-123' };

      const { result } = renderHook(() => useKanbanBoard(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.getKanbanBoard).toHaveBeenCalledWith(filters);
    });
  });

  describe('useCalendarTasks', () => {
    it('should fetch calendar tasks when dates are provided', async () => {
      vi.mocked(tasksApi.getCalendarTasks).mockResolvedValue([mockCalendarTask]);
      const params = { startDate: '2024-01-01', endDate: '2024-01-31' };

      const { result } = renderHook(() => useCalendarTasks(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockCalendarTask]);
      expect(tasksApi.getCalendarTasks).toHaveBeenCalledWith(params);
    });

    it('should not fetch when startDate is empty', async () => {
      const { result } = renderHook(
        () => useCalendarTasks({ startDate: '', endDate: '2024-01-31' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(tasksApi.getCalendarTasks).not.toHaveBeenCalled();
    });

    it('should not fetch when endDate is empty', async () => {
      const { result } = renderHook(
        () => useCalendarTasks({ startDate: '2024-01-01', endDate: '' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(tasksApi.getCalendarTasks).not.toHaveBeenCalled();
    });
  });

  describe('useSubtasks', () => {
    it('should fetch subtasks', async () => {
      vi.mocked(tasksApi.getSubtasks).mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useSubtasks('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockTask]);
      expect(tasksApi.getSubtasks).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useSubtasks(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(tasksApi.getSubtasks).not.toHaveBeenCalled();
    });
  });

  describe('useTaskAssignees', () => {
    it('should fetch task assignees', async () => {
      const mockAssignees = [
        { id: 'user-1', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' },
      ];
      vi.mocked(tasksApi.getAssignees).mockResolvedValue(mockAssignees);

      const { result } = renderHook(() => useTaskAssignees(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAssignees);
    });
  });

  describe('useTaskClients', () => {
    it('should fetch task clients', async () => {
      const mockClients = [{ id: 'client-1', name: 'Test Client' }];
      vi.mocked(tasksApi.getClients).mockResolvedValue(mockClients);

      const { result } = renderHook(() => useTaskClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClients);
    });
  });

  describe('useClientTaskStatistics', () => {
    it('should fetch client task statistics', async () => {
      const mockStats = {
        clientId: 'client-123',
        byStatus: { TODO: 5 },
        totalCount: 5,
        totalEstimatedMinutes: 300,
        totalStoryPoints: 10,
      };
      vi.mocked(tasksApi.getClientStatistics).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useClientTaskStatistics('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(tasksApi.getClientStatistics).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useClientTaskStatistics(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(tasksApi.getClientStatistics).not.toHaveBeenCalled();
    });
  });

  describe('useGlobalTaskStatistics', () => {
    it('should fetch global task statistics', async () => {
      const mockStats = {
        byStatus: { TODO: 10 },
        total: 10,
        overdue: 2,
        dueSoon: 3,
        unassigned: 1,
      };
      vi.mocked(tasksApi.getGlobalStatistics).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useGlobalTaskStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useTaskCompletionStats', () => {
    it('should fetch completion stats', async () => {
      const mockStats = { avgDays: 5 };
      vi.mocked(tasksApi.getCompletionDurationStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useTaskCompletionStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useEmployeeTaskRanking', () => {
    it('should fetch employee task ranking', async () => {
      const mockRanking = [{ employeeId: 'user-1', completedTasks: 10 }];
      vi.mocked(tasksApi.getEmployeeTaskRanking).mockResolvedValue(mockRanking);

      const { result } = renderHook(() => useEmployeeTaskRanking(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRanking);
    });
  });

  describe('useTaskStatusDuration', () => {
    it('should fetch status duration ranking', async () => {
      const mockDuration = [{ taskId: 'task-1', durationDays: 3 }];
      vi.mocked(tasksApi.getStatusDurationRanking).mockResolvedValue(mockDuration);

      const { result } = renderHook(() => useTaskStatusDuration('blocked'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.getStatusDurationRanking).toHaveBeenCalledWith({ status: 'blocked' });
    });
  });

  // ========================================
  // Task Mutation Hooks
  // ========================================

  describe('useCreateTask', () => {
    it('should create task and show success toast', async () => {
      vi.mocked(tasksApi.create).mockResolvedValue(mockTask);

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New task' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(tasksApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New task' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateTask', () => {
    it('should update task and show success toast', async () => {
      vi.mocked(tasksApi.update).mockResolvedValue({ ...mockTask, title: 'Updated' });

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'task-123', data: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.update).toHaveBeenCalledWith('task-123', { title: 'Updated' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(tasksApi.update).mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'task-123', data: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useDeleteTask', () => {
    it('should delete task and show success toast', async () => {
      vi.mocked(tasksApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('task-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.delete).toHaveBeenCalledWith('task-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(tasksApi.delete).mockRejectedValue(mockError);

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('task-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useReorderTasks', () => {
    it('should reorder tasks', async () => {
      vi.mocked(tasksApi.reorderTasks).mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useReorderTasks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskIds: ['task-1', 'task-2'] } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.reorderTasks).toHaveBeenCalled();
    });

    it('should show error toast on failure', async () => {
      vi.mocked(tasksApi.reorderTasks).mockRejectedValue(mockError);

      const { result } = renderHook(() => useReorderTasks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskIds: ['task-1'] } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useBulkUpdateTaskStatus', () => {
    it('should bulk update status and show success toast', async () => {
      vi.mocked(tasksApi.bulkUpdateStatus).mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useBulkUpdateTaskStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskIds: ['task-1', 'task-2'], status: 'DONE' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.bulkUpdateStatus).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(tasksApi.bulkUpdateStatus).mockRejectedValue(mockError);

      const { result } = renderHook(() => useBulkUpdateTaskStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskIds: ['task-1'], status: 'DONE' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  // ========================================
  // Task Label Hooks
  // ========================================

  describe('useTaskLabels', () => {
    it('should fetch task labels', async () => {
      vi.mocked(taskLabelsApi.getAll).mockResolvedValue({
        data: [mockLabel],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { result } = renderHook(() => useTaskLabels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskLabelsApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useTaskLabel', () => {
    it('should fetch single label', async () => {
      vi.mocked(taskLabelsApi.getById).mockResolvedValue(mockLabel);

      const { result } = renderHook(() => useTaskLabel('label-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLabel);
      expect(taskLabelsApi.getById).toHaveBeenCalledWith('label-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useTaskLabel(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(taskLabelsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTaskLabel', () => {
    it('should create label and show success toast', async () => {
      vi.mocked(taskLabelsApi.create).mockResolvedValue(mockLabel);

      const { result } = renderHook(() => useCreateTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New label', color: '#00ff00' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(taskLabelsApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New label', color: '#00ff00' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateTaskLabel', () => {
    it('should update label and show success toast', async () => {
      vi.mocked(taskLabelsApi.update).mockResolvedValue({ ...mockLabel, name: 'Updated' });

      const { result } = renderHook(() => useUpdateTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'label-123', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteTaskLabel', () => {
    it('should delete label and show success toast', async () => {
      vi.mocked(taskLabelsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('label-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useAssignTaskLabel', () => {
    it('should assign label to task and show success toast', async () => {
      vi.mocked(taskLabelsApi.assignToTask).mockResolvedValue({ message: 'ok' });

      const { result } = renderHook(() => useAssignTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskId: 'task-123', labelId: 'label-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUnassignTaskLabel', () => {
    it('should unassign label from task and show success toast', async () => {
      vi.mocked(taskLabelsApi.unassignFromTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUnassignTaskLabel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskId: 'task-123', labelId: 'label-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Task Comment Hooks
  // ========================================

  describe('useTaskComments', () => {
    it('should fetch task comments', async () => {
      vi.mocked(taskCommentsApi.getByTaskId).mockResolvedValue([mockComment]);

      const { result } = renderHook(() => useTaskComments('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockComment]);
      expect(taskCommentsApi.getByTaskId).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useTaskComments(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(taskCommentsApi.getByTaskId).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTaskComment', () => {
    it('should create comment and show success toast', async () => {
      vi.mocked(taskCommentsApi.create).mockResolvedValue(mockComment);

      const { result } = renderHook(() => useCreateTaskComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskId: 'task-123', data: { content: 'New comment' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(taskCommentsApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTaskComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ taskId: 'task-123', data: { content: 'New comment' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateTaskComment', () => {
    it('should update comment and show success toast', async () => {
      vi.mocked(taskCommentsApi.update).mockResolvedValue({ ...mockComment, content: 'Updated' });

      const { result } = renderHook(() => useUpdateTaskComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          commentId: 'comment-123',
          taskId: 'task-123',
          data: { content: 'Updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteTaskComment', () => {
    it('should delete comment and show success toast', async () => {
      vi.mocked(taskCommentsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTaskComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ commentId: 'comment-123', taskId: 'task-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Task Dependency Hooks
  // ========================================

  describe('useTaskDependencies', () => {
    it('should fetch task dependencies', async () => {
      vi.mocked(taskDependenciesApi.getByTaskId).mockResolvedValue([mockDependency]);

      const { result } = renderHook(() => useTaskDependencies('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockDependency]);
      expect(taskDependenciesApi.getByTaskId).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useTaskDependencies(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(taskDependenciesApi.getByTaskId).not.toHaveBeenCalled();
    });
  });

  describe('useTaskBlockedBy', () => {
    it('should fetch blocked-by dependencies', async () => {
      vi.mocked(taskDependenciesApi.getBlockedBy).mockResolvedValue([mockDependency]);

      const { result } = renderHook(() => useTaskBlockedBy('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskDependenciesApi.getBlockedBy).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useTaskBlockedBy(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useTaskBlocking', () => {
    it('should fetch blocking dependencies', async () => {
      vi.mocked(taskDependenciesApi.getBlocking).mockResolvedValue([mockDependency]);

      const { result } = renderHook(() => useTaskBlocking('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskDependenciesApi.getBlocking).toHaveBeenCalledWith('task-123');
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useTaskBlocking(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCreateTaskDependency', () => {
    it('should create dependency and show success toast', async () => {
      vi.mocked(taskDependenciesApi.create).mockResolvedValue(mockDependency);

      const { result } = renderHook(() => useCreateTaskDependency(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          taskId: 'task-123',
          data: { dependsOnTaskId: 'task-456' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(taskDependenciesApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTaskDependency(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          taskId: 'task-123',
          data: { dependsOnTaskId: 'task-456' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useDeleteTaskDependency', () => {
    it('should delete dependency and show success toast', async () => {
      vi.mocked(taskDependenciesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTaskDependency(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ dependencyId: 'dep-123', taskId: 'task-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Export Hooks
  // ========================================

  describe('useExportTasks', () => {
    it('should export tasks and show success toast', async () => {
      const mockBlob = new Blob(['csv-data'], { type: 'text/csv' });
      vi.mocked(tasksApi.exportCsv).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportTasks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tasksApi.exportCsv).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on export failure', async () => {
      vi.mocked(tasksApi.exportCsv).mockRejectedValue(mockError);

      const { result } = renderHook(() => useExportTasks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  // ========================================
  // Task Template Hooks
  // ========================================

  describe('useTaskTemplates', () => {
    it('should fetch task templates', async () => {
      vi.mocked(taskTemplatesApi.getAll).mockResolvedValue({
        data: [mockTemplate],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { result } = renderHook(() => useTaskTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskTemplatesApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useTaskTemplate', () => {
    it('should fetch single template', async () => {
      vi.mocked(taskTemplatesApi.getById).mockResolvedValue(mockTemplate);

      const { result } = renderHook(() => useTaskTemplate('template-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplate);
      expect(taskTemplatesApi.getById).toHaveBeenCalledWith('template-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useTaskTemplate(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(taskTemplatesApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTaskTemplate', () => {
    it('should create template and show success toast', async () => {
      vi.mocked(taskTemplatesApi.create).mockResolvedValue(mockTemplate);

      const { result } = renderHook(() => useCreateTaskTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New template' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(taskTemplatesApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTaskTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New template' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateTaskTemplate', () => {
    it('should update template and show success toast', async () => {
      vi.mocked(taskTemplatesApi.update).mockResolvedValue({ ...mockTemplate, title: 'Updated' });

      const { result } = renderHook(() => useUpdateTaskTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'template-123', data: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteTaskTemplate', () => {
    it('should delete template and show success toast', async () => {
      vi.mocked(taskTemplatesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTaskTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('template-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useCreateTaskFromTemplate', () => {
    it('should create task from template and show success toast', async () => {
      vi.mocked(taskTemplatesApi.createTaskFromTemplate).mockResolvedValue(mockTemplate);

      const { result } = renderHook(() => useCreateTaskFromTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('template-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskTemplatesApi.createTaskFromTemplate).toHaveBeenCalledWith('template-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(taskTemplatesApi.createTaskFromTemplate).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTaskFromTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('template-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should show generic error message when API error has no message', async () => {
      vi.mocked(tasksApi.create).mockRejectedValue({});

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New task' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się utworzyć zadania',
        })
      );
    });

    it('should handle network errors on queries', async () => {
      vi.mocked(tasksApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
