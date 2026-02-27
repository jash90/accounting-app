import { useQuery } from '@tanstack/react-query';

import { type ApiErrorResponse } from '@/types/api';
import {
  type CreateEmailConfigDto,
  type TestImapDto,
  type TestSmtpDto,
  type UpdateEmailConfigDto,
} from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { emailConfigApi } from '../api/endpoints/email-config';
import { queryKeys } from '../api/query-client';

// Don't retry on 404 (no config exists yet) — shared across all three scopes
const emailConfigRetry = (failureCount: number, error: ApiErrorResponse) =>
  error?.response?.status === 404 ? false : failureCount < 1;

// User Email Configuration Hooks

export function useUserEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.user,
    queryFn: emailConfigApi.getUserConfig,
    retry: emailConfigRetry,
  });
}

export const useCreateUserEmailConfig = createMutationHook<void, CreateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.createUserConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.user],
  successMessage: 'Konfiguracja email została utworzona',
  errorMessage: 'Nie udało się utworzyć konfiguracji email',
});

export const useUpdateUserEmailConfig = createMutationHook<void, UpdateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.updateUserConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.user],
  successMessage: 'Konfiguracja email została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować konfiguracji email',
});

export const useDeleteUserEmailConfig = createMutationHook<void, void>({
  mutationFn: () => emailConfigApi.deleteUserConfig(),
  invalidateKeys: [queryKeys.emailConfig.user],
  successMessage: 'Konfiguracja email została usunięta',
  errorMessage: 'Nie udało się usunąć konfiguracji email',
});

// Company Email Configuration Hooks

export function useCompanyEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.company,
    queryFn: emailConfigApi.getCompanyConfig,
    retry: emailConfigRetry,
  });
}

export const useCreateCompanyEmailConfig = createMutationHook<void, CreateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.createCompanyConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.company],
  successMessage: 'Konfiguracja email firmy została utworzona',
  errorMessage: 'Nie udało się utworzyć konfiguracji email firmy',
});

export const useUpdateCompanyEmailConfig = createMutationHook<void, UpdateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.updateCompanyConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.company],
  successMessage: 'Konfiguracja email firmy została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować konfiguracji email firmy',
});

export const useDeleteCompanyEmailConfig = createMutationHook<void, void>({
  mutationFn: () => emailConfigApi.deleteCompanyConfig(),
  invalidateKeys: [queryKeys.emailConfig.company],
  successMessage: 'Konfiguracja email firmy została usunięta',
  errorMessage: 'Nie udało się usunąć konfiguracji email firmy',
});

// Connection Test Hooks

export const useTestSmtp = createMutationHook<{ message: string }, TestSmtpDto>({
  mutationFn: (data) => emailConfigApi.testSmtp(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu SMTP',
  errorMessage: 'Nie udało się połączyć z serwerem SMTP',
});

export const useTestImap = createMutationHook<{ message: string }, TestImapDto>({
  mutationFn: (data) => emailConfigApi.testImap(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu IMAP',
  errorMessage: 'Nie udało się połączyć z serwerem IMAP',
});

export const useTestCompanySmtp = createMutationHook<{ message: string }, TestSmtpDto>({
  mutationFn: (data) => emailConfigApi.testCompanySmtp(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu SMTP',
  errorMessage: 'Nie udało się połączyć z serwerem SMTP',
});

export const useTestCompanyImap = createMutationHook<{ message: string }, TestImapDto>({
  mutationFn: (data) => emailConfigApi.testCompanyImap(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu IMAP',
  errorMessage: 'Nie udało się połączyć z serwerem IMAP',
});

// System Admin Email Configuration Hooks (ADMIN only)

export function useSystemAdminEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.systemAdmin,
    queryFn: emailConfigApi.getSystemAdminConfig,
    retry: emailConfigRetry,
  });
}

export const useCreateSystemAdminEmailConfig = createMutationHook<void, CreateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.createSystemAdminConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.systemAdmin],
  successMessage: 'Konfiguracja email System Admin została utworzona',
  errorMessage: 'Nie udało się utworzyć konfiguracji email System Admin',
});

export const useUpdateSystemAdminEmailConfig = createMutationHook<void, UpdateEmailConfigDto>({
  mutationFn: (configData) => emailConfigApi.updateSystemAdminConfig(configData),
  invalidateKeys: [queryKeys.emailConfig.systemAdmin],
  successMessage: 'Konfiguracja email System Admin została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować konfiguracji email System Admin',
});

export const useDeleteSystemAdminEmailConfig = createMutationHook<void, void>({
  mutationFn: () => emailConfigApi.deleteSystemAdminConfig(),
  invalidateKeys: [queryKeys.emailConfig.systemAdmin],
  successMessage: 'Konfiguracja email System Admin została usunięta',
  errorMessage: 'Nie udało się usunąć konfiguracji email System Admin',
});

// System Admin Connection Test Hooks

export const useTestSystemAdminSmtp = createMutationHook<{ message: string }, TestSmtpDto>({
  mutationFn: (data) => emailConfigApi.testSystemAdminSmtp(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu SMTP',
  errorMessage: 'Nie udało się połączyć z serwerem SMTP',
});

export const useTestSystemAdminImap = createMutationHook<{ message: string }, TestImapDto>({
  mutationFn: (data) => emailConfigApi.testSystemAdminImap(data),
  successMessageFn: (result) => result.message,
  errorTitle: 'Błąd testu IMAP',
  errorMessage: 'Nie udało się połączyć z serwerem IMAP',
});
