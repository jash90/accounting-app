import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import {
  type ConvertLeadToClientDto,
  type CreateLeadDto,
  type LeadFiltersDto,
  type UpdateLeadDto,
} from '@/types/dtos';

import { leadsApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';
import { isLeadListQuery, OFFERS_CACHE_TIMES } from '../utils/optimistic-offers-updates';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

export function useLeads(filters?: LeadFiltersDto, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leads.list(buildQueryFilters(filters)),
    queryFn: () => leadsApi.getAll(filters),
    staleTime: OFFERS_CACHE_TIMES.list,
    enabled: options?.enabled,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadsApi.getById(id),
    enabled: !!id,
  });
}

export function useLeadStatistics() {
  return useQuery({
    queryKey: queryKeys.leads.statistics,
    queryFn: () => leadsApi.getStatistics(),
    staleTime: OFFERS_CACHE_TIMES.statistics,
  });
}

export function useLeadAssignees() {
  return useQuery({
    queryKey: queryKeys.leads.lookupAssignees,
    queryFn: () => leadsApi.getAssignees(),
    staleTime: OFFERS_CACHE_TIMES.templates,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (leadData: CreateLeadDto) => leadsApi.create(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Prospekt został utworzony',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się utworzyć prospektu'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDto }) => leadsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Prospekt został zaktualizowany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować prospektu'),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.leads.detail(deletedId) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Prospekt został usunięty',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się usunąć prospektu'),
        variant: 'destructive',
      });
    },
  });
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ConvertLeadToClientDto }) =>
      leadsApi.convertToClient(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.all,
        refetchType: 'active',
      });
      toast({
        title: 'Sukces',
        description: result.message || 'Prospekt został przekonwertowany na klienta',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się przekonwertować prospektu'),
        variant: 'destructive',
      });
    },
  });
}
