import { type PaginatedResponse } from '@/types/api';
import {
  type ApproveTimeEntryDto,
  type CreateTimeEntryDto,
  type DailyTimesheetDto,
  type RejectTimeEntryDto,
  type StartTimerDto,
  type StopTimerDto,
  type SubmitTimeEntryDto,
  type TimeByClientReportDto,
  type TimeEntryFiltersDto,
  type TimeEntryResponseDto,
  type TimeSettingsResponseDto,
  type TimeSummaryReportDto,
  type UpdateTimeEntryDto,
  type UpdateTimerDto,
  type UpdateTimeSettingsDto,
  type WeeklyTimesheetDto,
} from '@/types/dtos';

import apiClient from '../client';

const BASE_URL = '/api/modules/time-tracking';

// ============================================
// Time Entries API
// ============================================

export const timeEntriesApi = {
  getAll: async (
    filters?: TimeEntryFiltersDto
  ): Promise<PaginatedResponse<TimeEntryResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<TimeEntryResponseDto>>(
      `${BASE_URL}/entries`,
      {
        params: filters,
      }
    );
    return data;
  },

  getById: async (id: string): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.get<TimeEntryResponseDto>(`${BASE_URL}/entries/${id}`);
    return data;
  },

  create: async (entryData: CreateTimeEntryDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(`${BASE_URL}/entries`, entryData);
    return data;
  },

  update: async (id: string, entryData: UpdateTimeEntryDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.patch<TimeEntryResponseDto>(
      `${BASE_URL}/entries/${id}`,
      entryData
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/entries/${id}`);
  },

  // Approval workflow
  submit: async (id: string, dto?: SubmitTimeEntryDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(
      `${BASE_URL}/entries/${id}/submit`,
      dto || {}
    );
    return data;
  },

  approve: async (id: string, dto?: ApproveTimeEntryDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(
      `${BASE_URL}/entries/${id}/approve`,
      dto || {}
    );
    return data;
  },

  reject: async (id: string, dto: RejectTimeEntryDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(
      `${BASE_URL}/entries/${id}/reject`,
      dto
    );
    return data;
  },
};

// ============================================
// Timer API
// ============================================

export const timerApi = {
  start: async (dto: StartTimerDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(
      `${BASE_URL}/entries/timer/start`,
      dto
    );
    return data;
  },

  stop: async (dto?: StopTimerDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.post<TimeEntryResponseDto>(
      `${BASE_URL}/entries/timer/stop`,
      dto || {}
    );
    return data;
  },

  getActive: async (): Promise<TimeEntryResponseDto | null> => {
    const { data } = await apiClient.get<TimeEntryResponseDto | null>(
      `${BASE_URL}/entries/timer/active`
    );
    return data;
  },

  update: async (dto: UpdateTimerDto): Promise<TimeEntryResponseDto> => {
    const { data } = await apiClient.patch<TimeEntryResponseDto>(
      `${BASE_URL}/entries/timer/active`,
      dto
    );
    return data;
  },

  discard: async (): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/entries/timer/discard`);
  },
};

// ============================================
// Time Settings API
// ============================================

export const timeSettingsApi = {
  get: async (): Promise<TimeSettingsResponseDto> => {
    const { data } = await apiClient.get<TimeSettingsResponseDto>(`${BASE_URL}/settings`);
    return data;
  },

  update: async (settingsData: UpdateTimeSettingsDto): Promise<TimeSettingsResponseDto> => {
    const { data } = await apiClient.patch<TimeSettingsResponseDto>(
      `${BASE_URL}/settings`,
      settingsData
    );
    return data;
  },
};

// ============================================
// Timesheet API
// ============================================

export const timesheetApi = {
  getDaily: async (date: string): Promise<DailyTimesheetDto> => {
    const { data } = await apiClient.get<DailyTimesheetDto>(`${BASE_URL}/timesheet/daily`, {
      params: { date },
    });
    return data;
  },

  getWeekly: async (weekStart: string): Promise<WeeklyTimesheetDto> => {
    const { data } = await apiClient.get<WeeklyTimesheetDto>(`${BASE_URL}/timesheet/weekly`, {
      params: { weekStart },
    });
    return data;
  },
};

// ============================================
// Reports API
// ============================================

export const timeReportsApi = {
  getSummary: async (params: {
    startDate: string;
    endDate: string;
    groupBy?: 'project' | 'client' | 'user';
  }): Promise<TimeSummaryReportDto> => {
    const { data } = await apiClient.get<TimeSummaryReportDto>(`${BASE_URL}/reports/summary`, {
      params,
    });
    return data;
  },

  getByClient: async (params: {
    startDate: string;
    endDate: string;
    clientId?: string;
  }): Promise<TimeByClientReportDto[]> => {
    const { data } = await apiClient.get<TimeByClientReportDto[]>(`${BASE_URL}/reports/by-client`, {
      params,
    });
    return data;
  },

  export: async (params: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'excel';
    clientId?: string;
  }): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE_URL}/reports/export`, {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
