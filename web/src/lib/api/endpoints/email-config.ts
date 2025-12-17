import apiClient from '../client';
import {
  EmailConfigResponseDto,
  CreateEmailConfigDto,
  UpdateEmailConfigDto,
  TestSmtpDto,
  TestImapDto,
  TestConnectionResultDto,
} from '@/types/dtos';

export const emailConfigApi = {
  // User Email Configuration
  getUserConfig: async (): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.get<EmailConfigResponseDto>('/api/email-config/user');
    return data;
  },

  createUserConfig: async (configData: CreateEmailConfigDto): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.post<EmailConfigResponseDto>(
      '/api/email-config/user',
      configData
    );
    return data;
  },

  updateUserConfig: async (configData: UpdateEmailConfigDto): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.put<EmailConfigResponseDto>(
      '/api/email-config/user',
      configData
    );
    return data;
  },

  deleteUserConfig: async (): Promise<void> => {
    await apiClient.delete('/api/email-config/user');
  },

  // Company Email Configuration
  getCompanyConfig: async (): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.get<EmailConfigResponseDto>('/api/email-config/company');
    return data;
  },

  createCompanyConfig: async (
    configData: CreateEmailConfigDto
  ): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.post<EmailConfigResponseDto>(
      '/api/email-config/company',
      configData
    );
    return data;
  },

  updateCompanyConfig: async (
    configData: UpdateEmailConfigDto
  ): Promise<EmailConfigResponseDto> => {
    const { data } = await apiClient.put<EmailConfigResponseDto>(
      '/api/email-config/company',
      configData
    );
    return data;
  },

  deleteCompanyConfig: async (): Promise<void> => {
    await apiClient.delete('/api/email-config/company');
  },

  // Connection Testing
  testSmtp: async (data: TestSmtpDto): Promise<TestConnectionResultDto> => {
    const { data: result } = await apiClient.post<TestConnectionResultDto>(
      '/api/email-config/test/smtp',
      data
    );
    return result;
  },

  testImap: async (data: TestImapDto): Promise<TestConnectionResultDto> => {
    const { data: result } = await apiClient.post<TestConnectionResultDto>(
      '/api/email-config/test/imap',
      data
    );
    return result;
  },

  testCompanySmtp: async (data: TestSmtpDto): Promise<TestConnectionResultDto> => {
    const { data: result } = await apiClient.post<TestConnectionResultDto>(
      '/api/email-config/test/company/smtp',
      data
    );
    return result;
  },

  testCompanyImap: async (data: TestImapDto): Promise<TestConnectionResultDto> => {
    const { data: result } = await apiClient.post<TestConnectionResultDto>(
      '/api/email-config/test/company/imap',
      data
    );
    return result;
  },
};
