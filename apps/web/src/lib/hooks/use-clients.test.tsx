import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useAssignClientIcon,
  useBulkDeleteClients,
  useBulkEditClients,
  useBulkRestoreClients,
  useCheckClientDuplicates,
  useClient,
  useClientChangelog,
  useClientFieldDefinition,
  useClientFieldDefinitions,
  useClientIcon,
  useClientIcons,
  useClientNotificationSettings,
  useClients,
  useClientStatistics,
  useClientTaskTimeStats,
  useCreateClient,
  useCreateClientFieldDefinition,
  useCreateClientIcon,
  useCreateNotificationSettings,
  useDeleteClient,
  useDeleteClientFieldDefinition,
  useDeleteClientIcon,
  useDeleteNotificationSettings,
  useDownloadClientImportTemplate,
  useExportClients,
  useIconsForClient,
  useImportClients,
  useReorderClientFieldDefinitions,
  useRestoreClient,
  useSetClientCustomFields,
  useUnassignClientIcon,
  useUpdateClient,
  useUpdateClientFieldDefinition,
  useUpdateClientIcon,
  useUpdateNotificationSettings,
} from './use-clients';
import {
  clientIconsApi,
  clientsApi,
  fieldDefinitionsApi,
  notificationSettingsApi,
} from '../api/endpoints/clients';

// Mock the API modules
vi.mock('../api/endpoints/clients');
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

const mockClient = {
  id: 'client-123',
  name: 'Test Client',
  nip: '1234567890',
  email: 'test@client.pl',
  companyId: 'company-123',
  isActive: true,
  employmentType: 'UOP',
};

const mockPaginatedResponse = {
  data: [mockClient],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockFieldDefinition = {
  id: 'field-123',
  name: 'Custom Field',
  fieldType: 'TEXT',
  companyId: 'company-123',
};

const mockIcon = {
  id: 'icon-123',
  name: 'Test Icon',
  iconType: 'emoji',
  iconValue: '🏢',
  companyId: 'company-123',
};

const mockNotificationSettings = {
  id: 'settings-123',
  userId: 'user-123',
  emailNotifications: true,
  pushNotifications: false,
};

const mockError = {
  response: { data: { message: 'Server error' } },
};

describe('use-clients hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Client Query Hooks
  // ========================================

  describe('useClients', () => {
    it('should fetch clients', async () => {
      vi.mocked(clientsApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(clientsApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to API', async () => {
      vi.mocked(clientsApi.getAll).mockResolvedValue(mockPaginatedResponse);
      const filters = { search: 'test', page: 2 };

      const { result } = renderHook(() => useClients(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useClient', () => {
    it('should fetch single client', async () => {
      vi.mocked(clientsApi.getById).mockResolvedValue(mockClient);

      const { result } = renderHook(() => useClient('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClient);
      expect(clientsApi.getById).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useClient(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(clientsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useClientStatistics', () => {
    it('should fetch client statistics', async () => {
      const mockStats = {
        total: 50,
        active: 45,
        inactive: 5,
        byEmploymentType: {},
        byVatStatus: {},
        byTaxScheme: {},
        byZusStatus: {},
        addedThisMonth: 3,
        addedLast30Days: 5,
      };
      vi.mocked(clientsApi.getStatistics).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useClientStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useClientTaskTimeStats', () => {
    it('should fetch client task time stats', async () => {
      const mockStats = [
        {
          clientId: 'client-123',
          clientName: 'Test',
          totalTasks: 5,
          completedTasks: 3,
          totalMinutes: 600,
          totalHours: 10,
        },
      ];
      vi.mocked(clientsApi.getClientTaskTimeStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useClientTaskTimeStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useClientChangelog', () => {
    it('should fetch client changelog', async () => {
      const mockChangelog = [
        { id: 'log-1', entityType: 'client', entityId: 'client-123', action: 'update' },
      ];
      vi.mocked(clientsApi.getChangelog).mockResolvedValue(mockChangelog);

      const { result } = renderHook(() => useClientChangelog('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockChangelog);
      expect(clientsApi.getChangelog).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useClientChangelog(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(clientsApi.getChangelog).not.toHaveBeenCalled();
    });
  });

  describe('useIconsForClient', () => {
    it('should fetch icons for a client', async () => {
      vi.mocked(clientIconsApi.getClientIcons).mockResolvedValue([mockIcon]);

      const { result } = renderHook(() => useIconsForClient('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockIcon]);
      expect(clientIconsApi.getClientIcons).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useIconsForClient(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(clientIconsApi.getClientIcons).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Client Mutation Hooks
  // ========================================

  describe('useCreateClient', () => {
    it('should create client and show success toast', async () => {
      vi.mocked(clientsApi.create).mockResolvedValue(mockClient);

      const { result } = renderHook(() => useCreateClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Client' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Client' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateClient', () => {
    it('should update client and show success toast', async () => {
      vi.mocked(clientsApi.update).mockResolvedValue({ ...mockClient, name: 'Updated' });

      const { result } = renderHook(() => useUpdateClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'client-123', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.update).toHaveBeenCalledWith('client-123', { name: 'Updated' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.update).mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'client-123', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useDeleteClient', () => {
    it('should delete client and show success toast', async () => {
      vi.mocked(clientsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('client-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.delete).toHaveBeenCalledWith('client-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.delete).mockRejectedValue(mockError);

      const { result } = renderHook(() => useDeleteClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('client-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useRestoreClient', () => {
    it('should restore client and show success toast', async () => {
      vi.mocked(clientsApi.restore).mockResolvedValue(mockClient);

      const { result } = renderHook(() => useRestoreClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('client-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.restore).toHaveBeenCalledWith('client-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.restore).mockRejectedValue(mockError);

      const { result } = renderHook(() => useRestoreClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('client-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useAssignClientIcon', () => {
    it('should assign icon and show success toast', async () => {
      vi.mocked(clientIconsApi.assignIcon).mockResolvedValue({
        id: '1',
        clientId: 'client-123',
        iconId: 'icon-123',
        isAutoAssigned: false,
        createdAt: new Date(),
      });

      const { result } = renderHook(() => useAssignClientIcon(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientId: 'client-123', iconId: 'icon-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUnassignClientIcon', () => {
    it('should unassign icon and show success toast', async () => {
      vi.mocked(clientIconsApi.unassignIcon).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUnassignClientIcon(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientId: 'client-123', iconId: 'icon-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useSetClientCustomFields', () => {
    it('should set custom fields and show success toast', async () => {
      vi.mocked(clientsApi.setCustomFieldValues).mockResolvedValue(mockClient);

      const { result } = renderHook(() => useSetClientCustomFields(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'client-123',
          data: { values: [{ fieldId: 'field-1', value: 'test' }] } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Duplicate Detection
  // ========================================

  describe('useCheckClientDuplicates', () => {
    it('should check for duplicates', async () => {
      const mockResult = { hasDuplicates: false, byNip: [], byEmail: [] };
      vi.mocked(clientsApi.checkDuplicates).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckClientDuplicates(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ nip: '1234567890' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResult);
      expect(clientsApi.checkDuplicates).toHaveBeenCalledWith({ nip: '1234567890' });
    });
  });

  // ========================================
  // Bulk Operations
  // ========================================

  describe('useBulkDeleteClients', () => {
    it('should bulk delete and show success toast', async () => {
      vi.mocked(clientsApi.bulkDelete).mockResolvedValue({ affected: 3, message: 'ok' });

      const { result } = renderHook(() => useBulkDeleteClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientIds: ['c1', 'c2', 'c3'] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.bulkDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.bulkDelete).mockRejectedValue(mockError);

      const { result } = renderHook(() => useBulkDeleteClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientIds: ['c1'] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useBulkRestoreClients', () => {
    it('should bulk restore and show success toast', async () => {
      vi.mocked(clientsApi.bulkRestore).mockResolvedValue({ affected: 2, message: 'ok' });

      const { result } = renderHook(() => useBulkRestoreClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientIds: ['c1', 'c2'] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.bulkRestore).mockRejectedValue(mockError);

      const { result } = renderHook(() => useBulkRestoreClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientIds: ['c1'] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useBulkEditClients', () => {
    it('should bulk edit and show success toast', async () => {
      vi.mocked(clientsApi.bulkEdit).mockResolvedValue({ affected: 4, message: 'ok' });

      const { result } = renderHook(() => useBulkEditClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientIds: ['c1', 'c2', 'c3', 'c4'],
          employmentType: 'UOP' as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.bulkEdit).mockRejectedValue(mockError);

      const { result } = renderHook(() => useBulkEditClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ clientIds: ['c1'], employmentType: 'UOP' as any });
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
  // Export/Import Hooks
  // ========================================

  describe('useExportClients', () => {
    it('should export clients and show success toast', async () => {
      const mockBlob = new Blob(['csv-data'], { type: 'text/csv' });
      vi.mocked(clientsApi.exportCsv).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportClients(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.exportCsv).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on export failure', async () => {
      vi.mocked(clientsApi.exportCsv).mockRejectedValue(mockError);

      const { result } = renderHook(() => useExportClients(), {
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

  describe('useDownloadClientImportTemplate', () => {
    it('should download template and show success toast', async () => {
      const mockBlob = new Blob(['csv-template'], { type: 'text/csv' });
      vi.mocked(clientsApi.getImportTemplate).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useDownloadClientImportTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.getImportTemplate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.getImportTemplate).mockRejectedValue(mockError);

      const { result } = renderHook(() => useDownloadClientImportTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useImportClients', () => {
    it('should import clients and show success toast', async () => {
      const mockResult = { imported: 5, updated: 2, errors: [] };
      vi.mocked(clientsApi.importCsv).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useImportClients(), {
        wrapper: createWrapper(),
      });

      const file = new File(['csv-content'], 'clients.csv', { type: 'text/csv' });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientsApi.importCsv).toHaveBeenCalledWith(file);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show partial success with errors', async () => {
      const mockResult = {
        imported: 3,
        updated: 0,
        errors: [{ row: 5, field: 'nip', message: 'Invalid NIP' }],
      };
      vi.mocked(clientsApi.importCsv).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useImportClients(), {
        wrapper: createWrapper(),
      });

      const file = new File(['csv-content'], 'clients.csv', { type: 'text/csv' });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Import zakończony z błędami' })
      );
    });

    it('should show error toast on failure', async () => {
      vi.mocked(clientsApi.importCsv).mockRejectedValue(mockError);

      const { result } = renderHook(() => useImportClients(), {
        wrapper: createWrapper(),
      });

      const file = new File(['csv-content'], 'clients.csv', { type: 'text/csv' });

      await act(async () => {
        result.current.mutate(file);
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
  // Field Definition Hooks
  // ========================================

  describe('useClientFieldDefinitions', () => {
    it('should fetch field definitions', async () => {
      vi.mocked(fieldDefinitionsApi.getAll).mockResolvedValue({
        data: [mockFieldDefinition],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { result } = renderHook(() => useClientFieldDefinitions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fieldDefinitionsApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useClientFieldDefinition', () => {
    it('should fetch single field definition', async () => {
      vi.mocked(fieldDefinitionsApi.getById).mockResolvedValue(mockFieldDefinition);

      const { result } = renderHook(() => useClientFieldDefinition('field-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockFieldDefinition);
      expect(fieldDefinitionsApi.getById).toHaveBeenCalledWith('field-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useClientFieldDefinition(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(fieldDefinitionsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateClientFieldDefinition', () => {
    it('should create field definition and show success toast', async () => {
      vi.mocked(fieldDefinitionsApi.create).mockResolvedValue(mockFieldDefinition);

      const { result } = renderHook(() => useCreateClientFieldDefinition(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New field', fieldType: 'TEXT' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(fieldDefinitionsApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateClientFieldDefinition(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New field', fieldType: 'TEXT' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateClientFieldDefinition', () => {
    it('should update field definition and show success toast', async () => {
      vi.mocked(fieldDefinitionsApi.update).mockResolvedValue({
        ...mockFieldDefinition,
        name: 'Updated',
      });

      const { result } = renderHook(() => useUpdateClientFieldDefinition(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'field-123', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteClientFieldDefinition', () => {
    it('should delete field definition and show success toast', async () => {
      vi.mocked(fieldDefinitionsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteClientFieldDefinition(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('field-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useReorderClientFieldDefinitions', () => {
    it('should reorder field definitions and show success toast', async () => {
      vi.mocked(fieldDefinitionsApi.reorder).mockResolvedValue([mockFieldDefinition]);

      const { result } = renderHook(() => useReorderClientFieldDefinitions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(['field-1', 'field-2', 'field-3']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fieldDefinitionsApi.reorder).toHaveBeenCalledWith(['field-1', 'field-2', 'field-3']);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Client Icon Hooks
  // ========================================

  describe('useClientIcons', () => {
    it('should fetch client icons', async () => {
      vi.mocked(clientIconsApi.getAll).mockResolvedValue({
        data: [mockIcon],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { result } = renderHook(() => useClientIcons(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(clientIconsApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useClientIcon', () => {
    it('should fetch single icon', async () => {
      vi.mocked(clientIconsApi.getById).mockResolvedValue(mockIcon);

      const { result } = renderHook(() => useClientIcon('icon-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockIcon);
      expect(clientIconsApi.getById).toHaveBeenCalledWith('icon-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useClientIcon(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(clientIconsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateClientIcon', () => {
    it('should create icon and show success toast', async () => {
      vi.mocked(clientIconsApi.create).mockResolvedValue(mockIcon);

      const { result } = renderHook(() => useCreateClientIcon(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          iconData: { name: 'New Icon', iconType: 'emoji', iconValue: '🔥' } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUpdateClientIcon', () => {
    it('should update icon and show success toast', async () => {
      vi.mocked(clientIconsApi.update).mockResolvedValue({ ...mockIcon, name: 'Updated' });

      const { result } = renderHook(() => useUpdateClientIcon(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'icon-123', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteClientIcon', () => {
    it('should delete icon and show success toast', async () => {
      vi.mocked(clientIconsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteClientIcon(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('icon-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Notification Settings Hooks
  // ========================================

  describe('useClientNotificationSettings', () => {
    it('should fetch notification settings', async () => {
      vi.mocked(notificationSettingsApi.getMe).mockResolvedValue(mockNotificationSettings);

      const { result } = renderHook(() => useClientNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotificationSettings);
    });

    it('should return null when no settings exist', async () => {
      vi.mocked(notificationSettingsApi.getMe).mockResolvedValue(null);

      const { result } = renderHook(() => useClientNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useCreateNotificationSettings', () => {
    it('should create notification settings and show success toast', async () => {
      vi.mocked(notificationSettingsApi.create).mockResolvedValue(mockNotificationSettings);

      const { result } = renderHook(() => useCreateNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ emailNotifications: true } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationSettingsApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ emailNotifications: true } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateNotificationSettings', () => {
    it('should update notification settings and show success toast', async () => {
      vi.mocked(notificationSettingsApi.update).mockResolvedValue({
        ...mockNotificationSettings,
        pushNotifications: true,
      });

      const { result } = renderHook(() => useUpdateNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ pushNotifications: true } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteNotificationSettings', () => {
    it('should delete notification settings and show success toast', async () => {
      vi.mocked(notificationSettingsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should show generic error message when API error has no message', async () => {
      vi.mocked(clientsApi.create).mockRejectedValue({});

      const { result } = renderHook(() => useCreateClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Client' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się utworzyć klienta',
        })
      );
    });

    it('should handle network errors on queries', async () => {
      vi.mocked(clientsApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
