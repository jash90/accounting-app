import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
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
  },
  simpleText: {
    all: ['simple-text'] as const,
    detail: (id: string) => ['simple-text', id] as const,
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
      companyById: (companyId: string) => ['ai-agent', 'token-usage', 'company', companyId] as const,
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
    list: (filters?: Record<string, unknown>) => ['clients', 'list', filters] as const,
    detail: (id: string) => ['clients', id] as const,
    changelog: (clientId: string) => ['clients', clientId, 'changelog'] as const,
    icons: (clientId: string) => ['clients', clientId, 'icons'] as const,
    customFields: (clientId: string) => ['clients', clientId, 'custom-fields'] as const,
  },
  clientFieldDefinitions: {
    all: ['client-field-definitions'] as const,
    detail: (id: string) => ['client-field-definitions', id] as const,
  },
  clientIcons: {
    all: ['client-icons'] as const,
    detail: (id: string) => ['client-icons', id] as const,
  },
  notificationSettings: {
    me: ['notification-settings', 'me'] as const,
  },
  companySettings: {
    me: ['company-settings', 'me'] as const,
  },
};

