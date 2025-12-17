import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailConfigApi } from '../api/endpoints/email-config';
import { queryKeys } from '../api/query-client';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

// User Email Configuration Hooks

export function useUserEmailConfig() {
  return useQuery({
    queryKey: queryKeys.emailConfig.user,
    queryFn: emailConfigApi.getUserConfig,
    retry: (failureCount, error: any) => {
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
        title: 'Success',
        description: 'Email configuration created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create email configuration',
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
        title: 'Success',
        description: 'Email configuration updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update email configuration',
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
        title: 'Success',
        description: 'Email configuration deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete email configuration',
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
    retry: (failureCount, error: any) => {
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
        title: 'Success',
        description: 'Company email configuration created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message || 'Failed to create company email configuration',
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
        title: 'Success',
        description: 'Company email configuration updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message || 'Failed to update company email configuration',
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
        title: 'Success',
        description: 'Company email configuration deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message || 'Failed to delete company email configuration',
        variant: 'destructive',
      });
    },
  });
}
