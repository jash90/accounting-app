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

/**
 * Create a standard set of query keys for a resource with all/list/detail pattern.
 */
function createResourceKeys<T extends string>(prefix: T) {
  return {
    all: [prefix] as const,
    list: (filters?: unknown) => [prefix, 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => [prefix, id] as const,
  };
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
  users: createResourceKeys('users'),
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
    modules: (companyId: string) => ['companies', companyId, 'modules'] as const,
    availableOwners: ['available-owners'] as const,
    companyEmployees: ['company', 'employees'] as const,
  },
  modules: createResourceKeys('modules'),
  employees: {
    ...createResourceKeys('employees'),
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
    taskTimeStats: ['clients', 'statistics', 'task-time'] as const,
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
  clientFieldDefinitions: createResourceKeys('client-field-definitions'),
  pkdCodes: {
    search: (search?: string, section?: string) =>
      ['pkd-codes', 'search', search, section] as const,
    sections: ['pkd-codes', 'sections'] as const,
    single: (code: string | null | undefined) => ['pkd-codes', 'single', code] as const,
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
    blockedBy: (taskId: string) => ['tasks', taskId, 'dependencies', 'blocked-by'] as const,
    blocking: (taskId: string) => ['tasks', taskId, 'dependencies', 'blocking'] as const,
    lookupAssignees: ['tasks', 'lookup', 'assignees'] as const,
    lookupClients: ['tasks', 'lookup', 'clients'] as const,
    clientStatistics: (clientId: string) => ['tasks', 'client-statistics', clientId] as const,
    globalStatistics: ['tasks', 'global-statistics'] as const,
    extendedStats: {
      completionDuration: (filters?: unknown) =>
        ['tasks', 'stats', 'completion-duration', stableFilterKey(filters)] as const,
      employeeRanking: (filters?: unknown) =>
        ['tasks', 'stats', 'employee-ranking', stableFilterKey(filters)] as const,
      statusDuration: (status: string, filters?: unknown) =>
        ['tasks', 'stats', 'status-duration', status, stableFilterKey(filters)] as const,
    },
  },
  taskLabels: {
    ...createResourceKeys('task-labels'),
    byTask: (taskId: string) => ['task-labels', 'by-task', taskId] as const,
  },
  taskTemplates: createResourceKeys('task-templates'),
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
    extendedStats: {
      topTasks: (preset: string) => ['time-tracking', 'extended', 'top-tasks', preset] as const,
      topSettlements: (preset: string) =>
        ['time-tracking', 'extended', 'top-settlements', preset] as const,
      employeeBreakdown: (preset: string) =>
        ['time-tracking', 'extended', 'employee-breakdown', preset] as const,
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
  documentTemplates: {
    all: ['document-templates'] as const,
    detail: (id: string) => ['document-templates', id] as const,
    contentBlocks: (id: string) => ['document-templates', id, 'content-blocks'] as const,
  },
  offerTemplates: {
    all: ['offer-templates'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['offer-templates', 'list', stableFilterKey(filters)] as const,
    detail: (id: string) => ['offer-templates', id] as const,
    default: ['offer-templates', 'default'] as const,
    contentBlocks: (id: string) => ['offer-templates', id, 'content-blocks'] as const,
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
      extended: {
        completion: (filters?: unknown) =>
          ['settlements', 'stats', 'extended', 'completion', stableFilterKey(filters)] as const,
        employeeRanking: (filters?: unknown) =>
          [
            'settlements',
            'stats',
            'extended',
            'employee-ranking',
            stableFilterKey(filters),
          ] as const,
        blockedClients: (filters?: unknown) =>
          [
            'settlements',
            'stats',
            'extended',
            'blocked-clients',
            stableFilterKey(filters),
          ] as const,
      },
    },
    comments: (settlementId: string) => ['settlements', settlementId, 'comments'] as const,
    assignableUsers: {
      bySettlement: (settlementId: string) =>
        ['settlements', 'assignable-users', settlementId] as const,
      all: ['settlements', 'assignable-users', 'all'] as const,
    },
    settings: ['settlements', 'settings'] as const,
  },
  email: {
    inbox: (limit?: number, unseenOnly?: boolean) => ['email-inbox', limit, unseenOnly] as const,
    inboxInfinite: (limit?: number) => ['email-inbox-infinite', limit] as const,
    folder: (name: string | undefined, limit?: number) => ['email-folder', name, limit] as const,
    folderInfinite: (name: string | undefined, limit?: number) =>
      ['email-folder-infinite', name, limit] as const,
    detail: (uid: number | undefined) => ['email', uid] as const,
    search: (q: string, mailbox: string, field?: string) =>
      ['email-search', q, mailbox, field] as const,
    folders: ['email-folders'] as const,
    aiDrafts: ['ai-drafts'] as const,
    draftConflicts: ['email-draft-conflicts'] as const,
    drafts: {
      all: ['email-drafts'] as const,
      detail: (id: string | undefined) => ['email-draft', id] as const,
    },
    autoReplyTemplates: ['email', 'auto-reply-templates'] as const,
  },
  documents: {
    templates: ['documents', 'templates'] as const,
    generated: ['documents', 'generated'] as const,
  },
  ksef: {
    config: ['ksef', 'config'] as const,
    invoices: {
      all: ['ksef', 'invoices'] as const,
      list: (filters?: unknown) => ['ksef', 'invoices', 'list', stableFilterKey(filters)] as const,
      detail: (id: string) => ['ksef', 'invoices', id] as const,
    },
    sessions: {
      all: ['ksef', 'sessions'] as const,
      active: ['ksef', 'sessions', 'active'] as const,
    },
    stats: {
      dashboard: ['ksef', 'stats', 'dashboard'] as const,
    },
    audit: {
      list: (filters?: unknown) => ['ksef', 'audit', stableFilterKey(filters)] as const,
    },
  },
};
