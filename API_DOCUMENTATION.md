# API Documentation & Integration

**Version**: 1.0
**Last Updated**: November 2025
**Backend**: NestJS + PostgreSQL + TypeORM
**Frontend Integration**: Axios + TanStack Query v5

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [Frontend Integration](#frontend-integration)
5. [Endpoint Summary](#endpoint-summary)
6. [Best Practices](#best-practices)

---

## Overview

### System Architecture

```
React Frontend (apps/web)
  ↓ HTTP Requests
NestJS Backend (apps/api) - 47 REST Endpoints
  ↓ TypeORM
PostgreSQL Database
```

**Key Features**:
- Multi-tenant with data isolation
- JWT authentication (access + refresh tokens)
- Role-based access control (ADMIN, COMPANY_OWNER, EMPLOYEE)
- Modular business modules with granular permissions

**Endpoint Categories**:
- Health (1), Auth (3)
- Admin: Users (6), Companies (5), Modules (4), Company Module Access (3)
- Company: Employees (5), Modules (2), Permissions (4)
- Business Modules: SimpleText (5)

**Total**: 47 endpoints

---

## Quick Start

### Base URL

```
Development: http://localhost:3000
Swagger Docs: http://localhost:3000/api/docs
```

### Authentication Flow

```bash
# 1. Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

# 2. Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "user": { ... }
}

# 3. Use access token
GET /admin/users
Headers: Authorization: Bearer <access_token>

# 4. Refresh token when expired
POST /auth/refresh
{ "refresh_token": "eyJhbGci..." }
```

---

## Authentication

### Token System

**Access Token**: 1 hour expiry
**Refresh Token**: 7 days expiry

**Storage** (Frontend):
```typescript
localStorage.setItem('access_token', accessToken);
localStorage.setItem('refresh_token', refreshToken);
```

**Auto-Refresh** (Axios Interceptor):
```typescript
// When receiving 401, automatically refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = tokenStorage.getRefreshToken();
      const { data } = await axios.post('/auth/refresh', { refresh_token: refreshToken });

      tokenStorage.setAccessToken(data.access_token);

      // Retry original request
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Role-Based Access

| Role | Access |
|------|--------|
| **ADMIN** | System-wide: Users, Companies, Modules |
| **COMPANY_OWNER** | Company scope: Employees, Permissions |
| **EMPLOYEE** | Modules with granted permissions only |

---

## Frontend Integration

### Architecture Pattern

```
Component → Custom Hook → TanStack Query → API Function → Axios → Backend
```

### Integration Example (User Management)

**1. API Function** (`lib/api/endpoints/users.ts`):
```typescript
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/admin/users');
    return data;
  },

  create: async (userData: CreateUserDto): Promise<User> => {
    const { data } = await apiClient.post<User>('/admin/users', userData);
    return data;
  },
};
```

**2. React Hook** (`lib/hooks/use-users.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
    },
  });
};
```

**3. Component Usage**:
```tsx
function UsersListPage() {
  const { data: users, isPending } = useUsers();
  const createUser = useCreateUser();

  if (isPending) return <LoadingSpinner />;

  return (
    <div>
      <DataTable data={users} />
      <Button onClick={() => createUser.mutate(formData)}>
        Create User
      </Button>
    </div>
  );
}
```

### Query Keys Factory

```typescript
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
  },
  // ... more keys
};
```

**Benefits**:
- Type-safe cache management
- Easy invalidation
- Prevents typos

---

## Endpoint Summary

### Admin Endpoints (18 total)

**Users** (6):
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user by ID
- `POST /admin/users` - Create user
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user (soft)
- `PATCH /admin/users/:id/activate` - Activate/deactivate

**Companies** (5):
- `GET /admin/companies` - List companies
- `GET /admin/companies/:id` - Get company
- `POST /admin/companies` - Create company
- `PATCH /admin/companies/:id` - Update company
- `DELETE /admin/companies/:id` - Delete company (soft)

**Modules** (4):
- `GET /admin/modules` - List modules
- `GET /admin/modules/:id` - Get module
- `POST /admin/modules` - Create module
- `PATCH /admin/modules/:id` - Update module

**Company Module Access** (3):
- `GET /admin/companies/:id/modules` - Get company's modules
- `POST /admin/companies/:id/modules/:moduleId` - Grant module access
- `DELETE /admin/companies/:id/modules/:moduleId` - Revoke module access

### Company Owner Endpoints (11 total)

**Employees** (5):
- `GET /company/employees` - List employees
- `GET /company/employees/:id` - Get employee
- `POST /company/employees` - Create employee
- `PATCH /company/employees/:id` - Update employee
- `DELETE /company/employees/:id` - Delete employee (soft)

**Modules** (2):
- `GET /company/modules` - Available modules
- `GET /company/modules/:slug` - Get module details

**Permissions** (4):
- `GET /company/employees/:id/modules` - Get employee permissions
- `POST /company/employees/:id/modules/:slug` - Grant permissions
- `PATCH /company/employees/:id/modules/:slug` - Update permissions
- `DELETE /company/employees/:id/modules/:slug` - Revoke permissions

### Business Module Endpoints (5 total)

**Simple Text** (5):
- `GET /modules/simple-text` - List texts
- `GET /modules/simple-text/:id` - Get text
- `POST /modules/simple-text` - Create text
- `PATCH /modules/simple-text/:id` - Update text
- `DELETE /modules/simple-text/:id` - Delete text

---

## Best Practices

### Cache Invalidation

```typescript
// After create/update/delete
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate multiple related caches
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
```

### Error Handling

```typescript
// Unified error handler
const handleApiError = (error: AxiosError) => {
  const apiError = error.response?.data as ApiError;
  const message = Array.isArray(apiError?.message)
    ? apiError.message.join(', ')
    : apiError?.message || 'Unknown error';

  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
};

// Use in mutations
useMutation({
  mutationFn: usersApi.create,
  onError: handleApiError,
});
```

### Permission Checks

```typescript
// Check permissions before rendering UI
const { user } = useAuthContext();
const { data: modules } = useEmployeeModules(user.id);

const canWrite = modules
  ?.find(m => m.module.slug === 'simple-text')
  ?.permissions.includes('write');

return (
  <div>
    {canWrite && <Button>Create</Button>}
  </div>
);
```

### Loading States

```typescript
// Show skeleton during initial load
if (isPending) return <Skeleton />;

// Show indicator during refetch
{isFetching && <span>Refreshing...</span>}

// Disable button during mutation
<Button disabled={mutation.isPending}>
  {mutation.isPending ? 'Saving...' : 'Save'}
</Button>
```

---

## Testing with MSW

### Mock Handlers

```typescript
// lib/api/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/admin/users', () => {
    return HttpResponse.json([
      { id: '1', email: 'admin@test.com', role: 'ADMIN' },
    ]);
  }),

  http.post('/admin/users', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({ id: '2', ...userData }, { status: 201 });
  }),
];
```

**Usage**: Same mocks work for dev mode, unit tests, and E2E tests

---

## Related Documentation

**Complete API Reference**: `duplicated/api/API_ENDPOINTS.md` (all 47 endpoints with request/response examples)

**Frontend Integration Details**: `duplicated/api/API_INTEGRATION_GUIDE.md` (complete hook implementations)

**Other Guides**:
- Frontend patterns: `FRONTEND_GUIDE.md`
- Architecture: `ARCHITECTURE_GUIDE.md`
- Developer setup: `DEVELOPER_HANDBOOK.md`

---

**Version**: 1.0
**Endpoints**: 47 REST endpoints
**Status**: Production Ready
**Last Updated**: November 2025
