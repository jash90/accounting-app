import { QueryClient } from '@tanstack/react-query';

/**
 * Create a stable string representation of filter objects for query keys.
 * This prevents cache misses caused by object reference changes when filter
 * values are the same but the object reference is different.
 *
 * Filters out undefined/null values before serialization to ensure consistent
 * cache keys (e.g., { a: 1, b: undefined } serializes same as { a: 1 }).
 */
export function stableFilterKey(filters?: unknown): string | undefined {
  if (!filters) return undefined;

  // Filter out undefined/null values for consistent serialization
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters as Record<string, unknown>).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );

  // Return undefined if all values were filtered out
  if (Object.keys(cleanedFilters).length === 0) return undefined;

  // Sort object keys for consistent serialization regardless of property order
  return JSON.stringify(cleanedFilters, Object.keys(cleanedFilters).sort());
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      // Keep default refetchOnWindowFocus: true for data freshness
      // Override per-query where real-time updates aren't needed
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query key factory for type-safe cache management
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
  },
  modules: {
    all: ['modules'] as const,
    detail: (id: string) => ['modules', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
    byCompany: (companyId: string) => ['employees', 'company', companyId] as const,
  },
  permissions: {
    byEmployee: (employeeId: string) => ['permissions', 'employee', employeeId] as const,
    companyModules: ['company', 'modules'] as const,
  },
  aiAgent: {
    conversations: {
      all: ['ai-agent', 'conversations'] as const,
      detail: (id: string) => ['ai-agent', 'conversations', id] as const,
    },
    configuration: ['ai-agent', 'configuration'] as const,
    models: ['ai-agent', 'models'] as const,
    openaiModels: ['ai-agent', 'openai-models'] as const,
    openaiEmbeddingModels: ['ai-agent', 'openai-embedding-models'] as const,
    tokenUsage: {
      me: ['ai-agent', 'token-usage', 'me'] as const,
      myDetailed: ['ai-agent', 'token-usage', 'me', 'detailed'] as const,
      company: ['ai-agent', 'token-usage', 'company'] as const,
      allCompanies: ['ai-agent', 'token-usage', 'all-companies'] as const,
      companyById: (companyId: string) =>
        ['ai-agent', 'token-usage', 'company', companyId] as const,
    },
    context: {
      all: ['ai-agent', 'context'] as const,
      detail: (id: string) => ['ai-agent', 'context', id] as const,
    },
    tokenLimit: {
      byTarget: (targetType: 'company' | 'user', targetId: string) =>
        ['ai-agent', 'token-limit', targetType, targetId] as const,
    },
  },
  clients: {
    all: ['clients'] as const,
    list: (filters?: unknown) => ['clients', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['clients', id] as const,
    changelog: (clientId: string) => ['clients', clientId, 'changelog'] as const,
    icons: (clientId: string) => ['clients', clientId, 'icons'] as const,
    customFields: (clientId: string) => ['clients', clientId, 'custom-fields'] as const,
    statistics: ['clients', 'statistics'] as const,
    suspensions: {
      byClient: (clientId: string) => ['clients', clientId, 'suspensions'] as const,
      detail: (clientId: string, suspensionId: string) =>
        ['clients', clientId, 'suspensions', suspensionId] as const,
    },
    reliefPeriods: {
      byClient: (clientId: string) => ['clients', clientId, 'relief-periods'] as const,
      detail: (clientId: string, reliefId: string) =>
        ['clients', clientId, 'relief-periods', reliefId] as const,
    },
  },
  clientFieldDefinitions: {
    all: ['client-field-definitions'] as const,
    list: (filters?: unknown) =>
      ['client-field-definitions', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['client-field-definitions', id] as const,
  },
  clientIcons: {
    all: ['client-icons'] as const,
    list: (filters?: unknown) => ['client-icons', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['client-icons', id] as const,
    byClient: (clientId: string) => ['client-icons', 'by-client', clientId] as const,
  },
  notificationSettings: {
    me: ['notification-settings', 'me'] as const,
  },
  companySettings: {
    me: ['company-settings', 'me'] as const,
  },
  emailConfig: {
    user: ['email-config', 'user'] as const,
    company: ['email-config', 'company'] as const,
    systemAdmin: ['email-config', 'system-admin'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: unknown) => ['tasks', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['tasks', id] as const,
    kanban: (filters?: Record<string, unknown>) =>
      ['tasks', 'kanban', stableFilterKey(filters)] as const,
    calendar: (params?: Record<string, unknown>) =>
      ['tasks', 'calendar', stableFilterKey(params)] as const,
    subtasks: (taskId: string) => ['tasks', taskId, 'subtasks'] as const,
    comments: (taskId: string) => ['tasks', taskId, 'comments'] as const,
    dependencies: (taskId: string) => ['tasks', taskId, 'dependencies'] as const,
    lookupAssignees: ['tasks', 'lookup', 'assignees'] as const,
    lookupClients: ['tasks', 'lookup', 'clients'] as const,
    clientStatistics: (clientId: string) => ['tasks', 'client-statistics', clientId] as const,
  },
  taskLabels: {
    all: ['task-labels'] as const,
    list: (filters?: unknown) => ['task-labels', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['task-labels', id] as const,
    byTask: (taskId: string) => ['task-labels', 'by-task', taskId] as const,
  },
  timeTracking: {
    entries: {
      all: ['time-entries'] as const,
      list: (filters?: unknown) => ['time-entries', 'list', stableFilterKey(filters)] as const,
      detail: (id: string) => ['time-entries', id] as const,
    },
    timer: {
      active: ['time-entries', 'timer', 'active'] as const,
    },
    settings: ['time-settings'] as const,
    timesheet: {
      daily: (date: string) => ['timesheet', 'daily', date] as const,
      weekly: (date: string) => ['timesheet', 'weekly', date] as const,
    },
    reports: {
      summary: (params?: Record<string, unknown>) =>
        ['time-reports', 'summary', stableFilterKey(params)] as const,
      byClient: (params?: Record<string, unknown>) =>
        ['time-reports', 'by-client', stableFilterKey(params)] as const,
    },
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['notifications', 'list', stableFilterKey(filters)] as const,
    archived: (filters?: Record<string, unknown>) =>
      ['notifications', 'archived', stableFilterKey(filters)] as const,
    detail: (id: string) => ['notifications', id] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    settings: ['notifications', 'settings'] as const,
  },
  offers: {
    all: ['offers'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['offers', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['offers', id] as const,
    activities: (offerId: string) => ['offers', offerId, 'activities'] as const,
    statistics: ['offers', 'statistics'] as const,
    placeholders: ['offers', 'placeholders'] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['leads', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['leads', id] as const,
    statistics: ['leads', 'statistics'] as const,
    lookupAssignees: ['leads', 'lookup', 'assignees'] as const,
  },
  offerTemplates: {
    all: ['offer-templates'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['offer-templates', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['offer-templates', id] as const,
    default: ['offer-templates', 'default'] as const,
  },
  settlements: {
    all: ['settlements'] as const,
    list: (filters?: unknown) => ['settlements', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['settlements', id] as const,
    stats: {
      overview: (month: number, year: number) =>
        ['settlements', 'stats', 'overview', month, year] as const,
      employees: (month: number, year: number) =>
        ['settlements', 'stats', 'employees', month, year] as const,
      my: (month: number, year: number) => ['settlements', 'stats', 'my', month, year] as const,
    },
    comments: (settlementId: string) => ['settlements', settlementId, 'comments'] as const,
    assignableUsers: {
      bySettlement: (settlementId: string) =>
        ['settlements', 'assignable-users', settlementId] as const,
      all: ['settlements', 'assignable-users', 'all'] as const,
    },
  },
};
