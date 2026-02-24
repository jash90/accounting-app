import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { companyApi, type UpdateCompanyProfileData } from '@/lib/api/endpoints/company';

export const companyProfileKeys = {
  profile: ['company', 'profile'] as const,
};

export function useCompanyProfile() {
  return useQuery({
    queryKey: companyProfileKeys.profile,
    queryFn: companyApi.getProfile,
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompanyProfileData) => companyApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyProfileKeys.profile });
    },
  });
}
