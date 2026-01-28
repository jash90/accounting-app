import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import {
  type CreateEmailConfigDto,
  type UpdateEmailConfigDto,
  type TestSmtpDto,
  type TestImapDto,
} from '@/types/dtos';

import { emailConfigApi } from '../api/endpoints/email-config';
import { queryKeys } from '../api/query-client';

// User Email Configuration Hooks

export function useUserEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.user,
    queryFn: emailConfigApi.getUserConfig,
    retry: (failureCount, error: ApiErrorResponse) => {
      // Don't retry on 404 (no config exists yet)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useCreateUserEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: CreateEmailConfigDto) => emailConfigApi.createUserConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.user });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć konfiguracji email',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUserEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: UpdateEmailConfigDto) => emailConfigApi.updateUserConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.user });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się zaktualizować konfiguracji email',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUserEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailConfigApi.deleteUserConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.user });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć konfiguracji email',
        variant: 'destructive',
      });
    },
  });
}

// Company Email Configuration Hooks

export function useCompanyEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.company,
    queryFn: emailConfigApi.getCompanyConfig,
    retry: (failureCount, error: ApiErrorResponse) => {
      // Don't retry on 404 (no config exists yet)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useCreateCompanyEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: CreateEmailConfigDto) =>
      emailConfigApi.createCompanyConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.company });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email firmy została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się utworzyć konfiguracji email firmy',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCompanyEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: UpdateEmailConfigDto) =>
      emailConfigApi.updateCompanyConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.company });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email firmy została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się zaktualizować konfiguracji email firmy',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCompanyEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailConfigApi.deleteCompanyConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.company });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email firmy została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się usunąć konfiguracji email firmy',
        variant: 'destructive',
      });
    },
  });
}

// Connection Test Hooks

export function useTestSmtp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestSmtpDto) => emailConfigApi.testSmtp(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu SMTP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem SMTP',
        variant: 'destructive',
      });
    },
  });
}

export function useTestImap() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestImapDto) => emailConfigApi.testImap(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu IMAP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem IMAP',
        variant: 'destructive',
      });
    },
  });
}

export function useTestCompanySmtp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestSmtpDto) => emailConfigApi.testCompanySmtp(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu SMTP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem SMTP',
        variant: 'destructive',
      });
    },
  });
}

export function useTestCompanyImap() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestImapDto) => emailConfigApi.testCompanyImap(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu IMAP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem IMAP',
        variant: 'destructive',
      });
    },
  });
}

// System Admin Email Configuration Hooks (ADMIN only)

export function useSystemAdminEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.systemAdmin,
    queryFn: emailConfigApi.getSystemAdminConfig,
    retry: (failureCount, error: ApiErrorResponse) => {
      // Don't retry on 404 (no config exists yet)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useCreateSystemAdminEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: CreateEmailConfigDto) =>
      emailConfigApi.createSystemAdminConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.systemAdmin });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email System Admin została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się utworzyć konfiguracji email System Admin',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSystemAdminEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (configData: UpdateEmailConfigDto) =>
      emailConfigApi.updateSystemAdminConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.systemAdmin });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email System Admin została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message ||
          'Nie udało się zaktualizować konfiguracji email System Admin',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSystemAdminEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: emailConfigApi.deleteSystemAdminConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailConfig.systemAdmin });
      toast({
        title: 'Sukces',
        description: 'Konfiguracja email System Admin została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się usunąć konfiguracji email System Admin',
        variant: 'destructive',
      });
    },
  });
}

// System Admin Connection Test Hooks

export function useTestSystemAdminSmtp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestSmtpDto) => emailConfigApi.testSystemAdminSmtp(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu SMTP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem SMTP',
        variant: 'destructive',
      });
    },
  });
}

export function useTestSystemAdminImap() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TestImapDto) => emailConfigApi.testSystemAdminImap(data),
    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: result.message,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd testu IMAP',
        description: error.response?.data?.message || 'Nie udało się połączyć z serwerem IMAP',
        variant: 'destructive',
      });
    },
  });
}
