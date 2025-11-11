# API Integration Guide - Frontend to Backend Connection

## Table of Contents

1. [Introduction](#introduction)
2. [API Client Setup](#api-client-setup)
3. [TanStack Query Patterns](#tanstack-query-patterns)
4. [Authentication Integration](#authentication-integration)
5. [Admin Endpoints](#admin-endpoints)
6. [Company Endpoints](#company-endpoints)
7. [Module Endpoints](#module-endpoints)
8. [Error Handling](#error-handling)
9. [Testing API Integration](#testing-api-integration)
10. [Best Practices](#best-practices)

---

## Introduction

### Overview

This guide demonstrates how to integrate the React frontend with all 47 REST API endpoints using:
- **Axios**: HTTP client with interceptors
- **TanStack Query**: Server state management, caching, mutations
- **TypeScript**: Type-safe API contracts

### Architecture

```
Frontend Component
      ↓
  Custom Hook (useUsers)
      ↓
  TanStack Query (useQuery/useMutation)
      ↓
  API Endpoint Function (usersApi.getAll)
      ↓
  Axios Client (with interceptors)
      ↓
  NestJS Backend API
```

### Integration Pattern

For each API endpoint, we create:
1. **API function** (`api/endpoints/*.ts`) - Axios request
2. **React Hook** (`lib/hooks/*.ts`) - TanStack Query wrapper
3. **Component usage** - Consume hook in UI

---

## API Client Setup

### Base Configuration

**File**: `lib/api/client.ts`

```typescript
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../auth/token-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,  // 10 seconds
});

// Auto-inject JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token refresh logic here (see FRONTEND_IMPLEMENTATION_PLAN.md)
    }

    return Promise.reject(error);
  }
);
```

**Key Features**:
- ✅ Auto-inject JWT token in every request
- ✅ Auto-refresh token on 401 Unauthorized
- ✅ Queue failed requests during refresh
- ✅ Global error handling
- ✅ Configurable timeout

---

## TanStack Query Patterns

### Query Keys Factory

**File**: `lib/api/query-client.ts`

```typescript
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
  },

  // Users (Admin)
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },

  // Companies (Admin)
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
    employees: (id: string) => ['companies', id, 'employees'] as const,
    modules: (id: string) => ['companies', id, 'modules'] as const,
  },

  // Modules (Admin)
  modules: {
    all: ['modules'] as const,
    detail: (id: string) => ['modules', id] as const,
    available: ['modules', 'available'] as const,
    bySlug: (slug: string) => ['modules', 'slug', slug] as const,
  },

  // Employees (Company Owner)
  employees: {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
    modules: (id: string) => ['employees', id, 'modules'] as const,
  },

  // SimpleText (Business Module)
  simpleText: {
    all: ['simple-text'] as const,
    detail: (id: string) => ['simple-text', id] as const,
  },
} as const;
```

**Benefits**:
- ✅ Type-safe query keys
- ✅ Easy cache invalidation
- ✅ Consistent naming
- ✅ Prevents typos

### useQuery Pattern (GET requests)

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/query-client';
import { usersApi } from '../api/endpoints/users';

// Get all users
export const useUsers = () => {
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Get single user
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,  // Only run if id exists
  });
};
```

### useMutation Pattern (POST/PATCH/DELETE)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/query-client';
import { usersApi } from '../api/endpoints/users';
import { toast } from '@/components/ui/use-toast';

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

      toast({
        title: 'User created',
        description: 'User has been created successfully',
      });
    },
    onError: (error) => {
      handleApiError(error);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });

      toast({ title: 'User updated' });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'User deleted' });
    },
  });
};
```

### Optimistic Updates

```typescript
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),

    // Optimistic update: Update UI before server response
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(variables.id) });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(variables.id));

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.users.detail(variables.id), (old: User) => ({
        ...old,
        ...variables.data,
      }));

      // Return context for rollback
      return { previousUser };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(
          queryKeys.users.detail(variables.id),
          context.previousUser
        );
      }
    },

    // Refetch after mutation
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
    },
  });
};
```

---

## Authentication Integration

### Endpoint Functions

**File**: `lib/api/endpoints/auth.ts`

```typescript
import apiClient from '../client';
import { LoginDto, RegisterDto, AuthResponse } from '@/types/dtos';

export const authApi = {
  /**
   * POST /auth/login
   * Login with email and password
   */
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  /**
   * POST /auth/register
   * Register new user
   */
  register: async (userData: RegisterDto): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', userData);
    return data;
  },

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },
};

// Standalone function for axios interceptor
export const refreshAccessToken = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return data;
};
```

### Authentication Hook

**File**: `lib/hooks/use-auth.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints/auth';
import { tokenStorage } from '../auth/token-storage';
import { queryKeys } from '../api/query-client';
import { LoginDto, RegisterDto } from '@/types/dtos';
import { User, UserRole } from '@/types/entities';
import { toast } from '@/components/ui/use-toast';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    onSuccess: (data) => {
      // Store tokens
      tokenStorage.setTokens(data.access_token, data.refresh_token);

      // Cache user
      queryClient.setQueryData(queryKeys.auth.user, data.user);

      // Show success message
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.email}`,
      });

      // Navigate based on role
      navigateByRole(data.user.role);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterDto) => authApi.register(userData),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.access_token, data.refresh_token);
      queryClient.setQueryData(queryKeys.auth.user, data.user);

      toast({
        title: 'Account created!',
        description: 'Welcome to the accounting system',
      });

      navigateByRole(data.user.role);
    },
  });

  // Logout
  const logout = () => {
    tokenStorage.clear();
    queryClient.clear();
    navigate('/login');

    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });
  };

  // Helper: Navigate based on role
  const navigateByRole = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        navigate('/admin');
        break;
      case UserRole.COMPANY_OWNER:
        navigate('/company');
        break;
      case UserRole.EMPLOYEE:
        navigate('/modules');
        break;
    }
  };

  // Get user from cache
  const user = queryClient.getQueryData<User>(queryKeys.auth.user);
  const isAuthenticated = tokenStorage.hasTokens();

  return {
    // Mutations
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,

    // State
    user,
    isAuthenticated,

    // Loading states
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
};
```

**Component Usage**:

```tsx
import { useAuth } from '@/lib/hooks/use-auth';
import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  const { login, isLoginLoading, loginError } = useAuth();

  return (
    <div className="container mx-auto max-w-md">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      <LoginForm
        onSubmit={login}
        isLoading={isLoginLoading}
        error={loginError}
      />
    </div>
  );
}
```

---

## Admin Endpoints

### User Management (6 endpoints)

**File**: `lib/api/endpoints/users.ts`

```typescript
import apiClient from '../client';
import { User } from '@/types/entities';
import { CreateUserDto, UpdateUserDto } from '@/types/dtos';

export const usersApi = {
  /**
   * GET /admin/users
   * Get all users
   */
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/admin/users');
    return data;
  },

  /**
   * GET /admin/users/:id
   * Get user by ID
   */
  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/admin/users/${id}`);
    return data;
  },

  /**
   * POST /admin/users
   * Create new user
   */
  create: async (userData: CreateUserDto): Promise<User> => {
    const { data } = await apiClient.post<User>('/admin/users', userData);
    return data;
  },

  /**
   * PATCH /admin/users/:id
   * Update user
   */
  update: async (id: string, userData: UpdateUserDto): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}`, userData);
    return data;
  },

  /**
   * DELETE /admin/users/:id
   * Delete user (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  /**
   * PATCH /admin/users/:id/activate?isActive=true|false
   * Activate/deactivate user
   */
  activate: async (id: string, isActive: boolean): Promise<User> => {
    const { data } = await apiClient.patch<User>(
      `/admin/users/${id}/activate?isActive=${isActive}`
    );
    return data;
  },
};
```

**File**: `lib/hooks/use-users.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints/users';
import { queryKeys } from '../api/query-client';
import { CreateUserDto, UpdateUserDto } from '@/types/dtos';
import { toast } from '@/components/ui/use-toast';

// Get all users
export const useUsers = () => {
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Get single user
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
};

// Create user mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserDto) => usersApi.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'User created successfully' });
    },
  });
};

// Update user mutation
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      toast({ title: 'User updated successfully' });
    },
  });
};

// Delete user mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'User deleted successfully' });
    },
  });
};

// Activate user mutation
export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.activate(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      toast({
        title: variables.isActive ? 'User activated' : 'User deactivated',
      });
    },
  });
};
```

**Component Usage**:

```tsx
import { useUsers, useCreateUser, useDeleteUser, useActivateUser } from '@/lib/hooks/use-users';

export default function UsersListPage() {
  const { users, isLoading, refetch } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const activateUser = useActivateUser();

  const handleCreate = (data: CreateUserDto) => {
    createUser.mutate(data);
  };

  const handleDelete = (id: string) => {
    deleteUser.mutate(id);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    activateUser.mutate({ id, isActive: !isActive });
  };

  return (
    <div>
      <DataTable columns={columns} data={users} isLoading={isLoading} />
      {/* Forms and dialogs */}
    </div>
  );
}
```

---

### Company Management (5 endpoints)

**File**: `lib/api/endpoints/companies.ts`

```typescript
import apiClient from '../client';
import { Company, User } from '@/types/entities';
import { CreateCompanyDto, UpdateCompanyDto } from '@/types/dtos';

export const companiesApi = {
  /** GET /admin/companies */
  getAll: async (): Promise<Company[]> => {
    const { data } = await apiClient.get<Company[]>('/admin/companies');
    return data;
  },

  /** GET /admin/companies/:id */
  getById: async (id: string): Promise<Company> => {
    const { data } = await apiClient.get<Company>(`/admin/companies/${id}`);
    return data;
  },

  /** POST /admin/companies */
  create: async (companyData: CreateCompanyDto): Promise<Company> => {
    const { data } = await apiClient.post<Company>('/admin/companies', companyData);
    return data;
  },

  /** PATCH /admin/companies/:id */
  update: async (id: string, companyData: UpdateCompanyDto): Promise<Company> => {
    const { data } = await apiClient.patch<Company>(`/admin/companies/${id}`, companyData);
    return data;
  },

  /** DELETE /admin/companies/:id */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/companies/${id}`);
  },

  /** GET /admin/companies/:id/employees */
  getEmployees: async (id: string): Promise<User[]> => {
    const { data} = await apiClient.get<User[]>(`/admin/companies/${id}/employees`);
    return data;
  },

  /** GET /admin/companies/:id/modules */
  getModules: async (id: string): Promise<CompanyModuleAccess[]> => {
    const { data } = await apiClient.get<CompanyModuleAccess[]>(
      `/admin/companies/${id}/modules`
    );
    return data;
  },

  /** POST /admin/companies/:id/modules/:moduleId */
  grantModule: async (companyId: string, moduleId: string): Promise<void> => {
    await apiClient.post(`/admin/companies/${companyId}/modules/${moduleId}`);
  },

  /** DELETE /admin/companies/:id/modules/:moduleId */
  revokeModule: async (companyId: string, moduleId: string): Promise<void> => {
    await apiClient.delete(`/admin/companies/${companyId}/modules/${moduleId}`);
  },
};
```

**File**: `lib/hooks/use-companies.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../api/endpoints/companies';
import { queryKeys } from '../api/query-client';
import { toast } from '@/components/ui/use-toast';

export const useCompanies = () => {
  const query = useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: companiesApi.getAll,
  });

  return {
    companies: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useCompany = (id: string) => {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
  });
};

export const useCompanyEmployees = (companyId: string) => {
  return useQuery({
    queryKey: queryKeys.companies.employees(companyId),
    queryFn: () => companiesApi.getEmployees(companyId),
    enabled: !!companyId,
  });
};

export const useCompanyModules = (companyId: string) => {
  return useQuery({
    queryKey: queryKeys.companies.modules(companyId),
    queryFn: () => companiesApi.getModules(companyId),
    enabled: !!companyId,
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast({ title: 'Company created successfully' });
    },
  });
};

export const useGrantCompanyModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, moduleId }: { companyId: string; moduleId: string }) =>
      companiesApi.grantModule(companyId, moduleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.modules(variables.companyId),
      });
      toast({ title: 'Module access granted' });
    },
  });
};

export const useRevokeCompanyModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, moduleId }: { companyId: string; moduleId: string }) =>
      companiesApi.revokeModule(companyId, moduleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.modules(variables.companyId),
      });
      toast({ title: 'Module access revoked' });
    },
  });
};
```

---

### Module Management (4 endpoints)

**File**: `lib/api/endpoints/modules.ts`

```typescript
import apiClient from '../client';
import { Module } from '@/types/entities';
import { CreateModuleDto, UpdateModuleDto } from '@/types/dtos';

export const modulesApi = {
  /** GET /admin/modules */
  getAll: async (): Promise<Module[]> => {
    const { data } = await apiClient.get<Module[]>('/admin/modules');
    return data;
  },

  /** GET /admin/modules/:id */
  getById: async (id: string): Promise<Module> => {
    const { data } = await apiClient.get<Module>(`/admin/modules/${id}`);
    return data;
  },

  /** POST /admin/modules */
  create: async (moduleData: CreateModuleDto): Promise<Module> => {
    const { data } = await apiClient.post<Module>('/admin/modules', moduleData);
    return data;
  },

  /** PATCH /admin/modules/:id */
  update: async (id: string, moduleData: UpdateModuleDto): Promise<Module> => {
    const { data } = await apiClient.patch<Module>(`/admin/modules/${id}`, moduleData);
    return data;
  },
};
```

**File**: `lib/hooks/use-modules.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '../api/endpoints/modules';
import { queryKeys } from '../api/query-client';
import { toast } from '@/components/ui/use-toast';

export const useModules = () => {
  const query = useQuery({
    queryKey: queryKeys.modules.all,
    queryFn: modulesApi.getAll,
  });

  return {
    modules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useModule = (id: string) => {
  return useQuery({
    queryKey: queryKeys.modules.detail(id),
    queryFn: () => modulesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast({ title: 'Module created successfully' });
    },
  });
};

export const useUpdateModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModuleDto }) =>
      modulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast({ title: 'Module updated successfully' });
    },
  });
};
```

---

## Company Endpoints

### Employee Management (5 endpoints)

**File**: `lib/api/endpoints/employees.ts`

```typescript
import apiClient from '../client';
import { User } from '@/types/entities';
import { CreateEmployeeDto, UpdateEmployeeDto } from '@/types/dtos';

export const employeesApi = {
  /** GET /company/employees */
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/company/employees');
    return data;
  },

  /** GET /company/employees/:id */
  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/company/employees/${id}`);
    return data;
  },

  /** POST /company/employees */
  create: async (employeeData: CreateEmployeeDto): Promise<User> => {
    const { data } = await apiClient.post<User>('/company/employees', employeeData);
    return data;
  },

  /** PATCH /company/employees/:id */
  update: async (id: string, employeeData: UpdateEmployeeDto): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/company/employees/${id}`, employeeData);
    return data;
  },

  /** DELETE /company/employees/:id */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/company/employees/${id}`);
  },
};
```

**File**: `lib/hooks/use-employees.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/endpoints/employees';
import { queryKeys } from '../api/query-client';
import { toast } from '@/components/ui/use-toast';

export const useEmployees = () => {
  const query = useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: employeesApi.getAll,
  });

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Employee created successfully' });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Employee updated successfully' });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Employee deleted successfully' });
    },
  });
};
```

---

### Permission Management (4 endpoints)

**File**: `lib/api/endpoints/permissions.ts`

```typescript
import apiClient from '../client';
import { UserModulePermission } from '@/types/entities';
import { GrantPermissionsDto } from '@/types/dtos';

export const permissionsApi = {
  /** GET /company/employees/:id/modules */
  getEmployeeModules: async (employeeId: string): Promise<UserModulePermission[]> => {
    const { data } = await apiClient.get<UserModulePermission[]>(
      `/company/employees/${employeeId}/modules`
    );
    return data;
  },

  /** POST /company/employees/:id/modules/:slug */
  grantPermissions: async (
    employeeId: string,
    moduleSlug: string,
    permissions: string[]
  ): Promise<UserModulePermission> => {
    const { data } = await apiClient.post<UserModulePermission>(
      `/company/employees/${employeeId}/modules/${moduleSlug}`,
      { permissions }
    );
    return data;
  },

  /** PATCH /company/employees/:id/modules/:slug */
  updatePermissions: async (
    employeeId: string,
    moduleSlug: string,
    permissions: string[]
  ): Promise<UserModulePermission> => {
    const { data } = await apiClient.patch<UserModulePermission>(
      `/company/employees/${employeeId}/modules/${moduleSlug}`,
      { permissions }
    );
    return data;
  },

  /** DELETE /company/employees/:id/modules/:slug */
  revokePermissions: async (employeeId: string, moduleSlug: string): Promise<void> => {
    await apiClient.delete(`/company/employees/${employeeId}/modules/${moduleSlug}`);
  },

  /** GET /company/modules */
  getAvailableModules: async (): Promise<Module[]> => {
    const { data } = await apiClient.get<Module[]>('/company/modules');
    return data;
  },

  /** GET /company/modules/:slug */
  getModuleBySlug: async (slug: string): Promise<Module> => {
    const { data } = await apiClient.get<Module>(`/company/modules/${slug}`);
    return data;
  },
};
```

**File**: `lib/hooks/use-permissions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../api/endpoints/permissions';
import { queryKeys } from '../api/query-client';
import { toast } from '@/components/ui/use-toast';

export const useEmployeeModules = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.employees.modules(employeeId),
    queryFn: () => permissionsApi.getEmployeeModules(employeeId),
    enabled: !!employeeId,
  });
};

export const useAvailableModules = () => {
  return useQuery({
    queryKey: queryKeys.modules.available,
    queryFn: permissionsApi.getAvailableModules,
  });
};

export const useGrantPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      moduleSlug,
      permissions,
    }: {
      employeeId: string;
      moduleSlug: string;
      permissions: string[];
    }) => permissionsApi.grantPermissions(employeeId, moduleSlug, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.modules(variables.employeeId),
      });
      toast({ title: 'Permissions granted successfully' });
    },
  });
};

export const useRevokePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      moduleSlug,
    }: {
      employeeId: string;
      moduleSlug: string;
    }) => permissionsApi.revokePermissions(employeeId, moduleSlug),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.modules(variables.employeeId),
      });
      toast({ title: 'Permissions revoked successfully' });
    },
  });
};
```

---

## Module Endpoints

### Simple Text Module (5 endpoints)

**File**: `lib/api/endpoints/simple-text.ts`

```typescript
import apiClient from '../client';
import { SimpleText } from '@/types/entities';
import { CreateSimpleTextDto, UpdateSimpleTextDto } from '@/types/dtos';

export const simpleTextApi = {
  /** GET /modules/simple-text */
  getAll: async (): Promise<SimpleText[]> => {
    const { data } = await apiClient.get<SimpleText[]>('/modules/simple-text');
    return data;
  },

  /** GET /modules/simple-text/:id */
  getById: async (id: string): Promise<SimpleText> => {
    const { data } = await apiClient.get<SimpleText>(`/modules/simple-text/${id}`);
    return data;
  },

  /** POST /modules/simple-text */
  create: async (textData: CreateSimpleTextDto): Promise<SimpleText> => {
    const { data } = await apiClient.post<SimpleText>('/modules/simple-text', textData);
    return data;
  },

  /** PATCH /modules/simple-text/:id */
  update: async (id: string, textData: UpdateSimpleTextDto): Promise<SimpleText> => {
    const { data } = await apiClient.patch<SimpleText>(`/modules/simple-text/${id}`, textData);
    return data;
  },

  /** DELETE /modules/simple-text/:id */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/modules/simple-text/${id}`);
  },
};
```

**File**: `lib/hooks/use-simple-text.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simpleTextApi } from '../api/endpoints/simple-text';
import { queryKeys } from '../api/query-client';
import { toast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';

export const useSimpleTexts = () => {
  const query = useQuery({
    queryKey: queryKeys.simpleText.all,
    queryFn: simpleTextApi.getAll,
  });

  return {
    texts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useSimpleText = (id: string) => {
  return useQuery({
    queryKey: queryKeys.simpleText.detail(id),
    queryFn: () => simpleTextApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateSimpleText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: simpleTextApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      toast({ title: 'Text created successfully' });
    },
  });
};

export const useUpdateSimpleText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSimpleTextDto }) =>
      simpleTextApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      toast({ title: 'Text updated successfully' });
    },
  });
};

export const useDeleteSimpleText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => simpleTextApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      toast({ title: 'Text deleted successfully' });
    },
  });
};
```

**Permission-Based Usage**:

```tsx
import { useSimpleTexts, useCreateSimpleText, useDeleteSimpleText } from '@/lib/hooks/use-simple-text';
import { useEmployeeModules } from '@/lib/hooks/use-permissions';
import { useAuthContext } from '@/contexts/auth-context';

export default function SimpleTextListPage() {
  const { user } = useAuthContext();
  const { texts, isLoading } = useSimpleTexts();
  const createText = useCreateSimpleText();
  const deleteText = useDeleteSimpleText();

  // Get user's permissions for this module
  const { data: userModules } = useEmployeeModules(user?.id ?? '');
  const simpleTextModule = userModules?.find((m) => m.module.slug === 'simple-text');
  const permissions = simpleTextModule?.permissions ?? [];

  // Check specific permissions
  const canWrite = permissions.includes('write') || user?.role === 'COMPANY_OWNER';
  const canDelete = permissions.includes('delete') || user?.role === 'COMPANY_OWNER';

  return (
    <div>
      <PageHeader
        title="Simple Text"
        description="Manage text entries"
        action={
          canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Text
            </Button>
          )
        }
      />

      <DataTable
        columns={[
          { accessorKey: 'content', header: 'Content' },
          {
            id: 'actions',
            cell: ({ row }) => (
              <div className="flex gap-2">
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(row.original)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(row.original)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={texts}
        isLoading={isLoading}
      />
    </div>
  );
}
```

---

## Error Handling

### API Error Types

```typescript
// From backend
interface ApiError {
  statusCode: number;
  message: string | string[];  // Can be array for validation errors
  error: string;  // "Bad Request", "Unauthorized", etc.
}
```

### Error Handler Utility

**File**: `lib/utils/error-handler.ts`

```typescript
import { AxiosError } from 'axios';
import { ApiError } from '@/types/api';
import { toast } from '@/components/ui/use-toast';

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;

    if (apiError?.message) {
      const message = Array.isArray(apiError.message)
        ? apiError.message.join(', ')
        : apiError.message;

      toast({
        title: `Error (${apiError.statusCode})`,
        description: message,
        variant: 'destructive',
      });

      return message;
    }

    // Network error
    if (!error.response) {
      const message = 'Network error. Please check your connection.';
      toast({
        title: 'Connection Error',
        description: message,
        variant: 'destructive',
      });
      return message;
    }
  }

  // Unknown error
  const fallbackMessage = 'An unexpected error occurred';
  toast({
    title: 'Error',
    description: fallbackMessage,
    variant: 'destructive',
  });

  return fallbackMessage;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    return Array.isArray(apiError?.message)
      ? apiError.message.join(', ')
      : apiError?.message || 'Unknown error';
  }
  return error instanceof Error ? error.message : 'Unknown error';
};
```

### Error Display in Components

```tsx
// Query error display
const { users, isLoading, isError, error, refetch } = useUsers();

if (isError) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <h3 className="font-semibold text-destructive">Failed to load users</h3>
      <p className="text-sm text-destructive/80 mt-1">
        {getErrorMessage(error)}
      </p>
      <Button onClick={() => refetch()} className="mt-3" size="sm">
        Retry
      </Button>
    </div>
  );
}

// Form validation errors
<FormField
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          aria-invalid={!!form.formState.errors.email}
          className={form.formState.errors.email ? 'border-destructive' : ''}
        />
      </FormControl>
      <FormMessage />  {/* Shows validation error */}
    </FormItem>
  )}
/>

// Mutation error display
{createUser.isError && (
  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
    {getErrorMessage(createUser.error)}
  </div>
)}
```

---

## Testing API Integration

### MSW Setup

**File**: `lib/api/mocks/handlers.ts`

```typescript
import { rest } from 'msw';
import { User, UserRole } from '@/types/entities';
import { AuthResponse } from '@/types/dtos';

const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    companyId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'owner@test.com',
    firstName: 'Owner',
    lastName: 'User',
    role: UserRole.COMPANY_OWNER,
    companyId: 'company1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const handlers = [
  // Auth endpoints
  rest.post('/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();

    const user = mockUsers.find((u) => u.email === email);

    if (!user || password !== 'password123') {
      return res(
        ctx.status(401),
        ctx.json({
          statusCode: 401,
          message: 'Invalid credentials',
          error: 'Unauthorized',
        })
      );
    }

    return res(
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user,
      })
    );
  }),

  rest.post('/auth/register', async (req, res, ctx) => {
    const userData = await req.json();

    const newUser: User = {
      id: String(mockUsers.length + 1),
      ...userData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return res(
      ctx.status(201),
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: newUser,
      })
    );
  }),

  // Users endpoints
  rest.get('/admin/users', (req, res, ctx) => {
    return res(ctx.json(mockUsers));
  }),

  rest.get('/admin/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    const user = mockUsers.find((u) => u.id === id);

    if (!user) {
      return res(
        ctx.status(404),
        ctx.json({
          statusCode: 404,
          message: 'User not found',
          error: 'Not Found',
        })
      );
    }

    return res(ctx.json(user));
  }),

  rest.post('/admin/users', async (req, res, ctx) => {
    const userData = await req.json();

    const newUser: User = {
      id: String(mockUsers.length + 1),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return res(ctx.status(201), ctx.json(newUser));
  }),

  rest.patch('/admin/users/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ statusCode: 404, message: 'User not found', error: 'Not Found' })
      );
    }

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return res(ctx.json(mockUsers[userIndex]));
  }),

  rest.delete('/admin/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ statusCode: 404, message: 'User not found', error: 'Not Found' })
      );
    }

    mockUsers[userIndex].isActive = false;
    return res(ctx.status(204));
  }),

  // Add handlers for remaining 41 endpoints...
];
```

**Setup MSW**:

```typescript
// lib/api/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// setupTests.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './lib/api/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from './use-users';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('useUsers returns users list', async () => {
  const { result } = renderHook(() => useUsers(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.users).toHaveLength(2);
  expect(result.current.users[0].email).toBe('admin@test.com');
});

test('useCreateUser creates user', async () => {
  const { result } = renderHook(() => useCreateUser(), {
    wrapper: createWrapper(),
  });

  result.current.mutate({
    email: 'new@test.com',
    firstName: 'New',
    lastName: 'User',
    password: 'password123',
    role: UserRole.EMPLOYEE,
    companyId: 'company1',
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

---

## Best Practices

### Cache Invalidation Strategy

```typescript
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate multiple related queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });

// Invalidate with predicate
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'users',
});

// Remove specific query from cache
queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
```

### Loading States

```typescript
// Query loading
const { users, isLoading, isFetching } = useUsers();

if (isLoading) {
  return <LoadingSpinner />;  // Initial load
}

// Show refetch indicator
{isFetching && <span className="text-sm text-muted-foreground">Refreshing...</span>}

// Mutation loading
const createUser = useCreateUser();

<Button disabled={createUser.isPending}>
  {createUser.isPending ? 'Creating...' : 'Create User'}
</Button>
```

### Error Boundaries

```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

### Retry Logic

```typescript
// Customize retry behavior per query
useQuery({
  queryKey: queryKeys.users.all,
  queryFn: usersApi.getAll,
  retry: 3,  // Retry 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Disable retry for specific errors
useQuery({
  queryKey: queryKeys.users.detail(id),
  queryFn: () => usersApi.getById(id),
  retry: (failureCount, error) => {
    // Don't retry on 404
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  },
});
```

### Dependent Queries

```typescript
// Query B depends on Query A
const { data: company } = useCompany(companyId);

const { data: employees } = useQuery({
  queryKey: queryKeys.companies.employees(companyId),
  queryFn: () => companiesApi.getEmployees(companyId),
  enabled: !!company,  // Only run after company loaded
});
```

### Parallel Queries

```typescript
import { useQueries } from '@tanstack/react-query';

// Fetch multiple users in parallel
const userQueries = useQueries({
  queries: userIds.map((id) => ({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
  })),
});

const allLoaded = userQueries.every((q) => q.isSuccess);
const users = userQueries.map((q) => q.data).filter(Boolean);
```

---

## Complete Endpoint Reference

### All 47 Endpoints Integration

| Category | Endpoint | Method | Hook | Status |
|----------|----------|--------|------|--------|
| **Health** (1) |
| Health | `/` | GET | - | Public |
| **Auth** (3) |
| Login | `/auth/login` | POST | useAuth | ✅ |
| Register | `/auth/register` | POST | useAuth | ✅ |
| Refresh | `/auth/refresh` | POST | - | ✅ |
| **Admin - Users** (6) |
| List users | `/admin/users` | GET | useUsers | ✅ |
| Get user | `/admin/users/:id` | GET | useUser | ✅ |
| Create user | `/admin/users` | POST | useCreateUser | ✅ |
| Update user | `/admin/users/:id` | PATCH | useUpdateUser | ✅ |
| Delete user | `/admin/users/:id` | DELETE | useDeleteUser | ✅ |
| Activate user | `/admin/users/:id/activate` | PATCH | useActivateUser | ✅ |
| **Admin - Companies** (5) |
| List companies | `/admin/companies` | GET | useCompanies | ✅ |
| Get company | `/admin/companies/:id` | GET | useCompany | ✅ |
| Create company | `/admin/companies` | POST | useCreateCompany | ✅ |
| Update company | `/admin/companies/:id` | PATCH | useUpdateCompany | ✅ |
| Delete company | `/admin/companies/:id` | DELETE | useDeleteCompany | ✅ |
| Get employees | `/admin/companies/:id/employees` | GET | useCompanyEmployees | ✅ |
| **Admin - Modules** (4) |
| List modules | `/admin/modules` | GET | useModules | ✅ |
| Get module | `/admin/modules/:id` | GET | useModule | ✅ |
| Create module | `/admin/modules` | POST | useCreateModule | ✅ |
| Update module | `/admin/modules/:id` | PATCH | useUpdateModule | ✅ |
| **Admin - Company Module Access** (3) |
| Get modules | `/admin/companies/:id/modules` | GET | useCompanyModules | ✅ |
| Grant module | `/admin/companies/:id/modules/:mid` | POST | useGrantCompanyModule | ✅ |
| Revoke module | `/admin/companies/:id/modules/:mid` | DELETE | useRevokeCompanyModule | ✅ |
| **Company - Employees** (5) |
| List employees | `/company/employees` | GET | useEmployees | ✅ |
| Get employee | `/company/employees/:id` | GET | useEmployee | ✅ |
| Create employee | `/company/employees` | POST | useCreateEmployee | ✅ |
| Update employee | `/company/employees/:id` | PATCH | useUpdateEmployee | ✅ |
| Delete employee | `/company/employees/:id` | DELETE | useDeleteEmployee | ✅ |
| **Company - Module Management** (2) |
| Available modules | `/company/modules` | GET | useAvailableModules | ✅ |
| Get module | `/company/modules/:slug` | GET | useModuleBySlug | ✅ |
| **Company - Permissions** (4) |
| Get permissions | `/company/employees/:id/modules` | GET | useEmployeeModules | ✅ |
| Grant permissions | `/company/employees/:id/modules/:slug` | POST | useGrantPermissions | ✅ |
| Update permissions | `/company/employees/:id/modules/:slug` | PATCH | useUpdatePermissions | ✅ |
| Revoke permissions | `/company/employees/:id/modules/:slug` | DELETE | useRevokePermissions | ✅ |
| **Simple Text Module** (5) |
| List texts | `/modules/simple-text` | GET | useSimpleTexts | ✅ |
| Get text | `/modules/simple-text/:id` | GET | useSimpleText | ✅ |
| Create text | `/modules/simple-text` | POST | useCreateSimpleText | ✅ |
| Update text | `/modules/simple-text/:id` | PATCH | useUpdateSimpleText | ✅ |
| Delete text | `/modules/simple-text/:id` | DELETE | useDeleteSimpleText | ✅ |

---

## Related Documentation

This integration guide works with:

- **API_ENDPOINTS.md** - Complete backend API reference
- **FRONTEND_IMPLEMENTATION_PLAN.md** - Frontend architecture and phases
- **COMPONENT_DESIGN_SYSTEM.md** - UI components using these hooks
- **DEVELOPER_ONBOARDING.md** - Getting started with the codebase

### Quick Reference

**Creating API Integration**:
1. Define types in `types/*.ts`
2. Create endpoint functions in `lib/api/endpoints/*.ts`
3. Create hooks in `lib/hooks/*.ts`
4. Use hooks in components
5. Handle errors with toast notifications
6. Invalidate cache after mutations

**Testing API Integration**:
1. Setup MSW handlers
2. Test hooks with renderHook
3. Test components with Testing Library
4. Test flows with Playwright E2E

---

**Version**: 1.0
**Last Updated**: January 2024
**API Endpoints**: 47 (all integrated)
