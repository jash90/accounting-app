import { type PaginatedResponse } from '@/types/api';

import apiClient from '../client';

// ============================================
// Settlement Types
// ============================================

export enum SettlementStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const SettlementStatusLabels: Record<SettlementStatus, string> = {
  [SettlementStatus.PENDING]: 'Oczekujące',
  [SettlementStatus.IN_PROGRESS]: 'W trakcie',
  [SettlementStatus.COMPLETED]: 'Zakończone',
};

export interface ClientSummaryDto {
  id: string;
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  taxScheme?: string;
  isActive: boolean;
}

export interface UserSummaryDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface SettlementStatusHistoryDto {
  status: SettlementStatus;
  changedAt: string;
  changedById: string;
  changedByEmail?: string;
  notes?: string;
}

export interface SettlementResponseDto {
  id: string;
  clientId: string;
  client?: ClientSummaryDto;
  userId?: string | null;
  assignedUser?: UserSummaryDto | null;
  assignedById?: string | null;
  assignedBy?: UserSummaryDto | null;
  month: number;
  year: number;
  status: SettlementStatus;
  documentsDate?: string | null;
  invoiceCount: number;
  notes?: string | null;
  settledAt?: string | null;
  settledById?: string | null;
  settledBy?: UserSummaryDto | null;
  priority: number;
  deadline?: string | null;
  documentsComplete: boolean;
  requiresAttention: boolean;
  attentionReason?: string | null;
  statusHistory?: SettlementStatusHistoryDto[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementCommentResponseDto {
  id: string;
  settlementId: string;
  userId: string;
  user?: UserSummaryDto;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

// ============================================
// Query Types
// ============================================

export interface GetSettlementsQueryDto {
  month: number;
  year: number;
  status?: SettlementStatus;
  assigneeId?: string;
  unassigned?: boolean;
  search?: string;
  taxScheme?: string;
  requiresAttention?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MonthYearQueryDto {
  month: number;
  year: number;
}

// ============================================
// Mutation Types
// ============================================

export interface InitializeMonthDto {
  month: number;
  year: number;
}

export interface UpdateSettlementStatusDto {
  status: SettlementStatus;
  notes?: string;
}

export interface UpdateSettlementDto {
  status?: SettlementStatus;
  notes?: string | null;
  invoiceCount?: number;
  documentsDate?: string | null;
  priority?: number;
  deadline?: string | null;
  documentsComplete?: boolean;
  requiresAttention?: boolean;
  attentionReason?: string | null;
}

export interface AssignSettlementDto {
  userId?: string | null;
}

export interface BulkAssignDto {
  settlementIds: string[];
  userId: string;
}

export interface CreateCommentDto {
  content: string;
  isInternal?: boolean;
}

// ============================================
// Response Types
// ============================================

export interface InitializeMonthResultDto {
  created: number;
  skipped: number;
}

export interface BulkAssignResultDto {
  assigned: number;
  requested: number;
}

export interface SettlementStatsDto {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  unassigned: number;
  requiresAttention: number;
  completionRate: number;
}

export interface EmployeeStatsDto {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

export interface EmployeeStatsListDto {
  employees: EmployeeStatsDto[];
}

export interface MyStatsDto {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

// ============================================
// API Client
// ============================================

const BASE_URL = '/api/modules/settlements';

export const settlementsApi = {
  // Settlements CRUD
  getAll: async (
    filters: GetSettlementsQueryDto
  ): Promise<PaginatedResponse<SettlementResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<SettlementResponseDto>>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<SettlementResponseDto> => {
    const { data } = await apiClient.get<SettlementResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  update: async (id: string, dto: UpdateSettlementDto): Promise<SettlementResponseDto> => {
    const { data } = await apiClient.patch<SettlementResponseDto>(`${BASE_URL}/${id}`, dto);
    return data;
  },

  updateStatus: async (
    id: string,
    dto: UpdateSettlementStatusDto
  ): Promise<SettlementResponseDto> => {
    const { data } = await apiClient.patch<SettlementResponseDto>(`${BASE_URL}/${id}/status`, dto);
    return data;
  },

  // Initialization
  initializeMonth: async (dto: InitializeMonthDto): Promise<InitializeMonthResultDto> => {
    const { data } = await apiClient.post<InitializeMonthResultDto>(`${BASE_URL}/initialize`, dto);
    return data;
  },

  // Assignment
  assignToEmployee: async (
    id: string,
    dto: AssignSettlementDto
  ): Promise<SettlementResponseDto> => {
    const { data } = await apiClient.patch<SettlementResponseDto>(`${BASE_URL}/${id}/assign`, dto);
    return data;
  },

  bulkAssign: async (dto: BulkAssignDto): Promise<BulkAssignResultDto> => {
    const { data } = await apiClient.post<BulkAssignResultDto>(`${BASE_URL}/bulk-assign`, dto);
    return data;
  },

  // Stats
  getOverviewStats: async (month: number, year: number): Promise<SettlementStatsDto> => {
    const { data } = await apiClient.get<SettlementStatsDto>(`${BASE_URL}/stats/overview`, {
      params: { month, year },
    });
    return data;
  },

  getEmployeeStats: async (month: number, year: number): Promise<EmployeeStatsListDto> => {
    const { data } = await apiClient.get<EmployeeStatsListDto>(`${BASE_URL}/stats/employees`, {
      params: { month, year },
    });
    return data;
  },

  getMyStats: async (month: number, year: number): Promise<MyStatsDto> => {
    const { data } = await apiClient.get<MyStatsDto>(`${BASE_URL}/stats/my`, {
      params: { month, year },
    });
    return data;
  },

  // Comments
  getComments: async (settlementId: string): Promise<SettlementCommentResponseDto[]> => {
    const { data } = await apiClient.get<SettlementCommentResponseDto[]>(
      `${BASE_URL}/${settlementId}/comments`
    );
    return data;
  },

  addComment: async (
    settlementId: string,
    dto: CreateCommentDto
  ): Promise<SettlementCommentResponseDto> => {
    const { data } = await apiClient.post<SettlementCommentResponseDto>(
      `${BASE_URL}/${settlementId}/comments`,
      dto
    );
    return data;
  },

  // Assignable Users
  getAssignableUsers: async (settlementId: string): Promise<UserSummaryDto[]> => {
    const { data } = await apiClient.get<UserSummaryDto[]>(
      `${BASE_URL}/${settlementId}/assignable-users`
    );
    return data;
  },

  getAllAssignableUsers: async (): Promise<UserSummaryDto[]> => {
    const { data } = await apiClient.get<UserSummaryDto[]>(`${BASE_URL}/assignable-users`);
    return data;
  },
};
