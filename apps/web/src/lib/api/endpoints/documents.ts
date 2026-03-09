import apiClient from '@/lib/api/client';
import type { ContentBlock } from '@/types/content-blocks';


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

export interface DocumentContentBlocksResponseDto {
  contentBlocks?: ContentBlock[] | null;
  documentSourceType: 'text' | 'blocks';
  name: string;
  placeholders?: string[] | null;
}

export interface UpdateDocumentContentBlocksDto {
  contentBlocks?: ContentBlock[];
  documentSourceType?: 'text' | 'blocks';
}

export interface GeneratedDocumentDto {
  id: string;
  name: string;
  fileName?: string | null;
  templateId?: string | null;
  sourceModule?: string | null;
  metadata?: {
    resolvedBlocks?: ContentBlock[];
    renderedContent?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
}

export const documentsApi = {
  // Templates
  getTemplates: () =>
    apiClient.get<DocumentTemplateDto[]>('/api/modules/documents/templates').then((r) => r.data),
  getTemplate: (id: string) =>
    apiClient
      .get<DocumentTemplateDto>(`/api/modules/documents/templates/${id}`)
      .then((r) => r.data),
  createTemplate: (data: Partial<DocumentTemplateDto>) =>
    apiClient
      .post<DocumentTemplateDto>('/api/modules/documents/templates', data)
      .then((r) => r.data),
  updateTemplate: (id: string, data: Partial<DocumentTemplateDto>) =>
    apiClient
      .patch<DocumentTemplateDto>(`/api/modules/documents/templates/${id}`, data)
      .then((r) => r.data),
  deleteTemplate: (id: string) =>
    apiClient.delete(`/api/modules/documents/templates/${id}`).then((r) => r.data),

  getContentBlocks: (id: string) =>
    apiClient
      .get<DocumentContentBlocksResponseDto>(
        `/api/modules/documents/templates/${id}/content-blocks`
      )
      .then((r) => r.data),
  updateContentBlocks: (id: string, data: UpdateDocumentContentBlocksDto) =>
    apiClient
      .patch<DocumentContentBlocksResponseDto>(
        `/api/modules/documents/templates/${id}/content-blocks`,
        data
      )
      .then((r) => r.data),

  // Generated docs
  getGeneratedDocuments: () =>
    apiClient.get<GeneratedDocumentDto[]>('/api/modules/documents/generated').then((r) => r.data),
  getGeneratedDocument: (id: string) =>
    apiClient
      .get<GeneratedDocumentDto>(`/api/modules/documents/generated/${id}`)
      .then((r) => r.data),
  getDocumentContent: (id: string) =>
    apiClient.get<string>(`/api/modules/documents/generated/${id}/content`).then((r) => r.data),
  generateDocument: (data: {
    templateId: string;
    name: string;
    placeholderData?: Record<string, string>;
  }) =>
    apiClient
      .post<GeneratedDocumentDto>('/api/modules/documents/generated/generate', data)
      .then((r) => r.data),
  deleteGeneratedDocument: (id: string) =>
    apiClient.delete(`/api/modules/documents/generated/${id}`).then((r) => r.data),
  downloadPdf: (id: string) =>
    apiClient
      .get<Blob>(`/api/modules/documents/generated/${id}/pdf`, { responseType: 'blob' })
      .then((r) => r.data),
};
