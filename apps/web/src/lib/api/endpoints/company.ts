import apiClient from '../client';

export interface CompanyProfile {
  id: string;
  name: string;
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  ownerName?: string | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  defaultEmailSignature?: string | null;
  defaultDocumentFooter?: string | null;
}

export interface UpdateCompanyProfileData {
  nip?: string;
  regon?: string;
  krs?: string;
  street?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  defaultEmailSignature?: string;
  defaultDocumentFooter?: string;
}

const BASE_URL = '/api/company';

export const companyApi = {
  getProfile: async (): Promise<CompanyProfile> => {
    const { data } = await apiClient.get<CompanyProfile>(`${BASE_URL}/profile`);
    return data;
  },
  updateProfile: async (payload: UpdateCompanyProfileData): Promise<CompanyProfile> => {
    const { data } = await apiClient.patch<CompanyProfile>(`${BASE_URL}/profile`, payload);
    return data;
  },
};
