import { type PaginatedResponse } from '@/types/api';

import apiClient from '../client';

// ============================================
// KSeF Types — Configuration
// ============================================

export interface KsefConfigResponse {
  id: string;
  companyId: string;
  environment: string;
  authMethod: string;
  hasToken: boolean;
  hasCertificate: boolean;
  nip?: string;
  autoSendEnabled: boolean;
  isActive: boolean;
  lastConnectionTestAt?: string;
  lastConnectionTestResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertKsefConfig {
  environment: string;
  authMethod: string;
  token?: string;
  certificate?: string;
  certificatePassword?: string;
  nip?: string;
  autoSendEnabled?: boolean;
}

export interface KsefConnectionTestResult {
  success: boolean;
  environment: string;
  message: string;
  responseTimeMs: number;
  testedAt: string;
}

// ============================================
// KSeF Types — Invoices
// ============================================

export interface KsefInvoiceLineItem {
  description: string;
  quantity: number;
  unit?: string;
  unitNetPrice: number;
  netAmount: number;
  vatRate: string;
  vatAmount: number;
  grossAmount: number;
  gtuCodes?: string[];
}

export interface InvoiceBuyerData {
  name: string;
  nip?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface CreateKsefInvoice {
  invoiceType: string;
  issueDate: string;
  dueDate?: string;
  clientId?: string;
  buyerData?: InvoiceBuyerData;
  lineItems: KsefInvoiceLineItem[];
  paymentMethod?: string;
  bankAccount?: string;
  notes?: string;
  correctedInvoiceId?: string;
  currency?: string;
}

export type UpdateKsefInvoice = Partial<CreateKsefInvoice>;

export interface KsefInvoiceResponse {
  id: string;
  companyId: string;
  clientId?: string | null;
  client?: { id: string; name: string; nip?: string } | null;
  sessionId?: string | null;
  invoiceType: string;
  direction: string;
  invoiceNumber: string;
  ksefNumber?: string | null;
  ksefReferenceNumber?: string | null;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  sellerNip: string;
  sellerName: string;
  buyerNip?: string | null;
  buyerName: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  lineItems?: Record<string, unknown>[] | null;
  validationErrors?: Record<string, unknown>[] | null;
  submittedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  correctedInvoiceId?: string | null;
  createdById: string;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KsefInvoiceFilters {
  status?: string;
  invoiceType?: string;
  direction?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// KSeF Types — Sessions
// ============================================

export interface KsefSessionResponse {
  id: string;
  companyId: string;
  sessionType: string;
  ksefSessionRef?: string;
  status: string;
  startedAt: string;
  expiresAt?: string;
  closedAt?: string;
  invoiceCount: number;
  upoReference?: string;
  errorMessage?: string;
  createdAt: string;
}

// ============================================
// KSeF Types — Batch & Sync
// ============================================

export interface KsefBatchSubmitResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    invoiceId: string;
    success: boolean;
    ksefNumber?: string;
    errorMessage?: string;
  }>;
}

export interface KsefSyncRequest {
  dateFrom: string;
  dateTo: string;
}

export interface KsefSyncResult {
  totalFound: number;
  newInvoices: number;
  updatedInvoices: number;
  errors: number;
  syncedAt: string;
  failedInvoices?: Array<{ ksefNumber: string; error: string }>;
}

// ============================================
// KSeF Types — Dashboard & Audit
// ============================================

export interface KsefDashboardStats {
  totalInvoices: number;
  draftCount: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errorCount: number;
  activeSessionExists: boolean;
  lastSyncAt?: string;
  totalNetAmount: number;
  totalGrossAmount: number;
}

export interface KsefAuditLog {
  id: string;
  companyId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  httpMethod?: string;
  httpUrl?: string;
  httpStatusCode?: number;
  responseSnippet?: string;
  errorMessage?: string;
  durationMs?: number;
  user: { id: string; email: string; firstName?: string; lastName?: string };
  createdAt: string;
}

export interface KsefAuditLogFilters {
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface KsefHealthResult {
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
}

// ============================================
// KSeF API
// ============================================

const BASE = '/api/modules/ksef';

export const ksefApi = {
  // Config
  getConfig: () => apiClient.get<KsefConfigResponse>(`${BASE}/config`).then((r) => r.data),
  updateConfig: (data: UpsertKsefConfig) =>
    apiClient.put<KsefConfigResponse>(`${BASE}/config`, data).then((r) => r.data),
  deleteConfig: () => apiClient.delete(`${BASE}/config`),
  testConnection: () =>
    apiClient
      .post<KsefConnectionTestResult>(`${BASE}/config/test-connection`)
      .then((r) => r.data),

  // Invoices
  getInvoices: (filters?: KsefInvoiceFilters) =>
    apiClient
      .get<PaginatedResponse<KsefInvoiceResponse>>(`${BASE}/invoices`, { params: filters })
      .then((r) => r.data),
  getInvoice: (id: string) =>
    apiClient.get<KsefInvoiceResponse>(`${BASE}/invoices/${id}`).then((r) => r.data),
  createInvoice: (data: CreateKsefInvoice) =>
    apiClient.post<KsefInvoiceResponse>(`${BASE}/invoices`, data).then((r) => r.data),
  updateInvoice: (id: string, data: UpdateKsefInvoice) =>
    apiClient.patch<KsefInvoiceResponse>(`${BASE}/invoices/${id}`, data).then((r) => r.data),
  deleteInvoice: (id: string) => apiClient.delete(`${BASE}/invoices/${id}`),
  generateXml: (id: string) =>
    apiClient
      .post<{ xml: string; hash: string }>(`${BASE}/invoices/${id}/generate-xml`)
      .then((r) => r.data),
  submitInvoice: (id: string) =>
    apiClient.post<KsefInvoiceResponse>(`${BASE}/invoices/${id}/submit`).then((r) => r.data),
  batchSubmit: (ids: string[]) =>
    apiClient
      .post<KsefBatchSubmitResult>(`${BASE}/invoices/batch-submit`, { ids })
      .then((r) => r.data),
  getInvoiceStatus: (id: string) =>
    apiClient.get<KsefInvoiceResponse>(`${BASE}/invoices/${id}/status`).then((r) => r.data),

  // Sessions
  getSessions: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<KsefSessionResponse>>(`${BASE}/sessions`, { params })
      .then((r) => r.data),
  getActiveSession: () =>
    apiClient.get<KsefSessionResponse | null>(`${BASE}/sessions/active`).then((r) => r.data),
  openSession: () =>
    apiClient.post<KsefSessionResponse>(`${BASE}/sessions/open`).then((r) => r.data),
  closeSession: (id: string) =>
    apiClient.post<KsefSessionResponse>(`${BASE}/sessions/${id}/close`).then((r) => r.data),
  getSessionStatus: (id: string) =>
    apiClient.get<KsefSessionResponse>(`${BASE}/sessions/${id}/status`).then((r) => r.data),

  // Download / Sync
  syncInvoices: (data: KsefSyncRequest) =>
    apiClient.post<KsefSyncResult>(`${BASE}/download/sync`, data).then((r) => r.data),
  queryKsefInvoices: (data: KsefSyncRequest) =>
    apiClient.post<unknown[]>(`${BASE}/download/query`, data).then((r) => r.data),

  // Stats
  getDashboardStats: () =>
    apiClient.get<KsefDashboardStats>(`${BASE}/stats/dashboard`).then((r) => r.data),
  checkHealth: () =>
    apiClient.get<KsefHealthResult>(`${BASE}/stats/health`).then((r) => r.data),

  // Audit
  getAuditLogs: (filters?: KsefAuditLogFilters) =>
    apiClient
      .get<PaginatedResponse<KsefAuditLog>>(`${BASE}/audit`, { params: filters })
      .then((r) => r.data),
};
