import apiClient from '@/lib/api/client';

export interface DocumentTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  templateContent?: string | null;
  templateFileName?: string | null;
  placeholders?: string[] | null;
  category: string;
  isActive: boolean;
  companyId: string;
  createdAt: string;
}

export interface GeneratedDocumentDto {
  id: string;
  name: string;
  fileName?: string | null;
  templateId?: string | null;
  sourceModule?: string | null;
  createdAt: string;
}

export const documentsApi = {
  // Templates
  getTemplates: () =>
    apiClient.get<DocumentTemplateDto[]>('/modules/documents/templates').then((r) => r.data),
  getTemplate: (id: string) =>
    apiClient.get<DocumentTemplateDto>(`/modules/documents/templates/${id}`).then((r) => r.data),
  createTemplate: (data: Partial<DocumentTemplateDto>) =>
    apiClient.post<DocumentTemplateDto>('/modules/documents/templates', data).then((r) => r.data),
  updateTemplate: (id: string, data: Partial<DocumentTemplateDto>) =>
    apiClient
      .patch<DocumentTemplateDto>(`/modules/documents/templates/${id}`, data)
      .then((r) => r.data),
  deleteTemplate: (id: string) =>
    apiClient.delete(`/modules/documents/templates/${id}`).then((r) => r.data),

  // Generated docs
  getGeneratedDocuments: () =>
    apiClient.get<GeneratedDocumentDto[]>('/modules/documents/generated').then((r) => r.data),
  generateDocument: (data: {
    templateId: string;
    name: string;
    placeholderData?: Record<string, string>;
  }) =>
    apiClient
      .post<GeneratedDocumentDto>('/modules/documents/generated/generate', data)
      .then((r) => r.data),
  deleteGeneratedDocument: (id: string) =>
    apiClient.delete(`/modules/documents/generated/${id}`).then((r) => r.data),
};
