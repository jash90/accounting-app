import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import {
  type ConvertLeadToClientDto,
  type CreateLeadDto,
  type CreateOfferDto,
  type CreateOfferTemplateDto,
  type DuplicateOfferDto,
  type LeadFiltersDto,
  type OfferFiltersDto,
  type OfferTemplateFiltersDto,
  type SendOfferDto,
  type UpdateLeadDto,
  type UpdateOfferDto,
  type UpdateOfferStatusDto,
  type UpdateOfferTemplateDto,
} from '@/types/dtos';

import { leadsApi, offersApi, offerTemplatesApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';

// ============================================
// Offer Hooks
// ============================================

export function useOffers(filters?: OfferFiltersDto) {
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: queryKeys.offers.list(filters as Record<string, unknown> | undefined),
    queryFn: () => offersApi.getAll(filters),
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: queryKeys.offers.detail(id),
    queryFn: () => offersApi.getById(id),
    enabled: !!id,
  });
}

export function useOfferActivities(offerId: string) {
  return useQuery({
    queryKey: queryKeys.offers.activities(offerId),
    queryFn: () => offersApi.getActivities(offerId),
    enabled: !!offerId,
  });
}

export function useOfferStatistics() {
  return useQuery({
    queryKey: queryKeys.offers.statistics,
    queryFn: () => offersApi.getStatistics(),
  });
}

export function useStandardPlaceholders() {
  return useQuery({
    queryKey: queryKeys.offers.placeholders,
    queryFn: () => offersApi.getStandardPlaceholders(),
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (offerData: CreateOfferDto) => offersApi.create(offerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć oferty',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferDto }) => offersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Oferta została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować oferty',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.offers.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć oferty',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferStatusDto }) =>
      offersApi.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Status oferty został zmieniony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zmienić statusu oferty',
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateOfferDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offersApi.generateDocument(id),
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(offerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(offerId) });
      toast({
        title: 'Sukces',
        description: 'Dokument został wygenerowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wygenerować dokumentu',
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadOfferDocument() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const blob = await offersApi.downloadDocument(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'oferta.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się pobrać dokumentu',
        variant: 'destructive',
      });
    },
  });
}

export function useSendOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SendOfferDto }) => offersApi.sendEmail(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została wysłana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wysłać oferty',
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: DuplicateOfferDto }) =>
      offersApi.duplicate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została zduplikowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zduplikować oferty',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Lead Hooks
// ============================================

export function useLeads(filters?: LeadFiltersDto) {
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: queryKeys.leads.list(filters as Record<string, unknown> | undefined),
    queryFn: () => leadsApi.getAll(filters),
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
  });
}

export function useLeadAssignees() {
  return useQuery({
    queryKey: queryKeys.leads.lookupAssignees,
    queryFn: () => leadsApi.getAssignees(),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (leadData: CreateLeadDto) => leadsApi.create(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został utworzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć leada',
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
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować leada',
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
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć leada',
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
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      toast({
        title: 'Sukces',
        description: result.message || 'Lead został przekonwertowany na klienta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przekonwertować leada',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Offer Template Hooks
// ============================================

export function useOfferTemplates(filters?: OfferTemplateFiltersDto) {
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: queryKeys.offerTemplates.list(filters as Record<string, unknown> | undefined),
    queryFn: () => offerTemplatesApi.getAll(filters),
  });
}

export function useOfferTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.detail(id),
    queryFn: () => offerTemplatesApi.getById(id),
    enabled: !!id,
  });
}

export function useDefaultOfferTemplate() {
  return useQuery({
    queryKey: queryKeys.offerTemplates.default,
    queryFn: () => offerTemplatesApi.getDefault(),
  });
}

export function useCreateOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateData: CreateOfferTemplateDto) => offerTemplatesApi.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-templates', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został utworzony',
      });
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

export function useUpdateOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferTemplateDto }) =>
      offerTemplatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został zaktualizowany',
      });
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

export function useDeleteOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offerTemplatesApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.offerTemplates.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został usunięty',
      });
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

export function useUploadOfferTemplateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      offerTemplatesApi.uploadTemplate(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', 'list'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Plik szablonu został przesłany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przesłać pliku szablonu',
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadOfferTemplateFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const blob = await offerTemplatesApi.downloadTemplate(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'szablon.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się pobrać pliku szablonu',
        variant: 'destructive',
      });
    },
  });
}
