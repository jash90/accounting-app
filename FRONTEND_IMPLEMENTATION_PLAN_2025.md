# Frontend Implementation Plan - React + TypeScript (2025 Edition)

**Version**: 2.0
**Created**: January 2025
**Based On**: FRONTEND_IMPLEMENTATION_PLAN.md + FRONTEND_RESEARCH_REPORT_2025.md
**Status**: Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack (2025)](#technology-stack-2025)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Implementation Phases](#implementation-phases)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Timeline & Resources](#timeline--resources)
11. [Migration from 2024 Plan](#migration-from-2024-plan)

---

## Executive Summary

### Project Overview

Build a production-ready, multi-tenant accounting frontend application with role-based access control, integrating with the existing NestJS backend API (47 endpoints).

### What's New in 2025

This updated plan incorporates the latest frontend technologies and best practices as of January 2025:

**Major Stack Updates**:
- ✅ React 19 with Compiler (auto-memoization)
- ✅ TypeScript 5.7 (faster builds)
- ✅ Vite 6.0 (improved performance)
- ✅ TanStack Query v5 (smaller bundle)
- ✅ MSW (Mock Service Worker) for API mocking

**Performance Improvements**:
- 15% smaller bundle size (450KB → 380KB)
- 20% faster build times (10s → 8s)
- 30-40% fewer re-renders (React Compiler)
- 30% faster type checking (TS 5.7)

### Key Features

- **Multi-tenant Architecture**: Complete data isolation per company
- **Role-Based UI**: 3 distinct user experiences (ADMIN, COMPANY_OWNER, EMPLOYEE)
- **Module System**: Pluggable business modules with granular permissions
- **Real-time Updates**: TanStack Query v5 with optimistic updates
- **Modern UX**: Tailwind CSS + shadcn/ui 2025 components
- **Type-Safe**: Full TypeScript 5.7 coverage with strict mode
- **Tested**: Unit, integration, and E2E tests with MSW (>80% coverage)
- **Optimized**: Code splitting, lazy loading, <380KB initial bundle

### Timeline

- **Total Effort**: 108-137 hours (13.5-17 working days for 1 developer)
- **MVP Delivery**: 82 hours (Phases 1-11)
- **Production Ready**: 137 hours (all phases)
- **Team of 2**: 7-9 working days
- **Team of 3**: 5-7 working days

**Migration Time from Old Plan**: +2 hours

---

## Technology Stack (2025)

### Core Technologies

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **React** | **19.x** | UI framework | ⬆️ Upgraded (18.2 → 19) |
| **TypeScript** | **5.7** | Type safety | ⬆️ Upgraded (5.0 → 5.7) |
| **Vite** | **6.0** | Build tool | ⬆️ Upgraded (5.0 → 6.0) |
| **Nx** | Latest | Monorepo management | ✓ Same |

### UI & Styling

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **Tailwind CSS** | Latest | Utility-first CSS | ✓ Same |
| **shadcn/ui** | Latest | Accessible components | ✓ Same + new 2025 components |
| **Lucide React** | Latest | Icon library | ✓ Same |
| **class-variance-authority** | Latest | Component variants | ✓ Same |
| **tailwind-merge** | Latest | Conditional class merging | ✓ Same |

**New shadcn/ui Components (2025)**:
- `Spinner` - Standardized loading states
- `Field` - Form field wrapper (label + input + error)
- `Empty` - Empty state component

### State Management

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **TanStack Query** | **v5** | Server state management | ⬆️ Upgraded (v4 → v5) |
| **React Context** | Built-in | Auth state, user session | ✓ Same |
| **React Hook Form** | Latest | Form state management | ✓ Same |
| **Zod** | Latest | Schema validation | ✓ Same |

### HTTP & API

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **Axios** | Latest | HTTP client | ✓ Same |
| **TanStack Query** | v5 | Query & mutation management | ⬆️ Upgraded |

### Routing

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **React Router** | v6.4+ | Client-side routing | ✓ Same (v7 not needed) |

### Testing

| Technology | Version | Purpose | Change from 2024 |
|------------|---------|---------|------------------|
| **Vitest** | Latest | Unit testing | ✓ Same |
| **Testing Library** | Latest | Component testing | ✓ Same |
| **Playwright** | Latest | E2E testing | ✓ Same |
| **MSW** | **Latest** | API mocking | ➕ NEW |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│    React 19 Application (apps/web)          │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐        │
│  │  UI Layer    │  │ Route Guards │        │
│  │  (shadcn/ui) │  │ (Role-based) │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                  │
│  ┌──────▼─────────────────▼───────┐        │
│  │     Component Layer             │        │
│  │  (Pages, Forms, Tables)         │        │
│  │  React 19 Compiler optimized    │        │
│  └──────┬──────────────────────────┘        │
│         │                                    │
│  ┌──────▼──────────────────────────┐        │
│  │    State Management Layer        │        │
│  │  • TanStack Query v5 (server)   │        │
│  │  • Context (auth, user)          │        │
│  └──────┬──────────────────────────┘        │
│         │                                    │
│  ┌──────▼──────────────────────────┐        │
│  │      API Client Layer            │        │
│  │  • Axios with interceptors       │        │
│  │  • Auto JWT token injection      │        │
│  │  • Auto token refresh on 401     │        │
│  │  • MSW mocking (dev/test)        │        │
│  └──────┬──────────────────────────┘        │
│         │                                    │
└─────────┼────────────────────────────────────┘
          │
          │ HTTP/HTTPS
          ▼
┌─────────────────────────────────────────────┐
│       NestJS Backend API (apps/api)         │
│            47 REST Endpoints                 │
└─────────────────────────────────────────────┘
```

### React 19 Benefits

#### 1. React Compiler (Auto-Memoization)

**Before (React 18)**:
```tsx
const MemoizedTable = React.memo(({ data, onRowClick }) => {
  const sortedData = useMemo(() =>
    [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  const handleClick = useCallback((row) => {
    onRowClick(row);
  }, [onRowClick]);

  return <Table data={sortedData} onClick={handleClick} />;
});
```

**After (React 19 with Compiler)**:
```tsx
// Compiler automatically optimizes - no manual memoization needed
function DataTable({ data, onRowClick }) {
  const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

  const handleClick = (row) => {
    onRowClick(row);
  };

  return <Table data={sortedData} onClick={handleClick} />;
}
```

**Benefits**:
- 30-40% less code
- Fewer bugs (no missing dependencies)
- Better performance than manual optimization
- Cleaner, more readable code

#### 2. Concurrent Rendering

```tsx
import { useTransition } from 'react';

function SearchableUserList() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const handleSearch = (value) => {
    setQuery(value); // Immediate update

    startTransition(() => {
      // Non-urgent update (can be interrupted)
      refetchUsers({ search: value });
    });
  };

  return (
    <>
      <Input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <UserList query={query} />
    </>
  );
}
```

#### 3. Enhanced Suspense

```tsx
import { Suspense } from 'react';

function UserProfile({ userId }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <UserDetails userId={userId} />
      <UserActivity userId={userId} />
    </Suspense>
  );
}

// Child components can suspend independently
function UserDetails({ userId }) {
  const { data } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  });

  return <div>{data.name}</div>;
}
```

### TanStack Query v5 Changes

#### Key API Changes

**isLoading → isPending**:
```tsx
// v4 (old)
const { data, isLoading } = useQuery({ ... });
if (isLoading) return <Spinner />;

// v5 (new)
const { data, isPending } = useQuery({ ... });
if (isPending) return <Spinner />;
```

**queryOptions for Type Safety**:
```tsx
// Reusable query definition
const userQueryOptions = (id: string) => queryOptions({
  queryKey: ['user', id],
  queryFn: () => api.users.getById(id),
  staleTime: 5 * 60 * 1000,
});

// Use anywhere with full type inference
const { data } = useQuery(userQueryOptions('123'));
const { data } = useSuspenseQuery(userQueryOptions('123'));
```

**useSuspenseQuery**:
```tsx
// Automatically suspends until data loads
function UserProfile({ userId }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  });

  return <div>{user.name}</div>; // No loading state needed
}
```

---

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx                          # Root component with React 19
│   │   └── routes.tsx                        # Route configuration
│   │
│   ├── pages/
│   │   ├── public/
│   │   │   ├── login-page.tsx
│   │   │   └── register-page.tsx
│   │   ├── admin/
│   │   │   ├── dashboard.tsx
│   │   │   ├── users/
│   │   │   ├── companies/
│   │   │   └── modules/
│   │   ├── company/
│   │   │   ├── dashboard.tsx
│   │   │   ├── employees/
│   │   │   └── modules/
│   │   ├── employee/
│   │   │   └── dashboard.tsx
│   │   ├── modules/
│   │   │   └── simple-text/
│   │   └── errors/
│   │       ├── not-found.tsx
│   │       └── unauthorized.tsx
│   │
│   ├── components/
│   │   ├── ui/                              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── form.tsx
│   │   │   ├── spinner.tsx                  # NEW: 2025 component
│   │   │   ├── field.tsx                    # NEW: 2025 component
│   │   │   ├── empty.tsx                    # NEW: 2025 component
│   │   │   └── ...
│   │   ├── layouts/
│   │   ├── auth/
│   │   ├── common/
│   │   └── forms/
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                    # Axios instance
│   │   │   ├── query-client.ts              # TanStack Query v5 config
│   │   │   ├── mocks/                       # NEW: MSW handlers
│   │   │   │   ├── handlers.ts              # API mock handlers
│   │   │   │   ├── browser.ts               # Browser worker
│   │   │   │   └── server.ts                # Node worker (tests)
│   │   │   └── endpoints/
│   │   │       ├── auth.ts
│   │   │       ├── users.ts
│   │   │       ├── companies.ts
│   │   │       └── ...
│   │   ├── auth/
│   │   │   └── token-storage.ts
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-users.ts
│   │   │   └── ...
│   │   ├── validation/
│   │   │   └── schemas.ts                   # Zod schemas
│   │   └── utils/
│   │       ├── cn.ts
│   │       ├── error-handler.ts
│   │       └── ...
│   │
│   ├── contexts/
│   │   └── auth-context.tsx
│   │
│   ├── types/
│   │   ├── enums.ts
│   │   ├── entities.ts
│   │   ├── dtos.ts
│   │   └── api.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── main.tsx                             # Entry point with MSW
│
├── public/
├── index.html
├── vite.config.ts                           # Vite 6 configuration
├── tsconfig.json                            # TypeScript 5.7 config
├── tailwind.config.js
├── postcss.config.js
├── babel.config.js                          # NEW: React Compiler config
├── .env.local                               # Environment variables
├── .env.example
└── package.json
```

---

## Implementation Phases

### Phase 1: Project Setup & Configuration (8-10 hours)

**Updated from 2024 Plan**: +2 hours for React 19 Compiler and MSW setup

#### Objectives
- Generate Nx React application in monorepo
- Configure Vite 6 build tool
- Setup React 19 with Compiler
- Setup TypeScript 5.7 with strict mode
- Configure Tailwind CSS with shadcn/ui 2025 components
- Setup MSW for API mocking
- Configure environment variables

#### Commands

```bash
# Navigate to project root
cd /Users/bartlomiejzimny/Projects/accounting

# Generate React application with Nx
nx g @nx/react:application web \
  --style=css \
  --bundler=vite \
  --routing=true \
  --unitTestRunner=vitest \
  --e2eTestRunner=playwright \
  --strict=true

# Install React 19 (UPDATED)
npm install react@19 react-dom@19

# Install TypeScript 5.7 (UPDATED)
npm install -D typescript@5.7

# Install Vite 6 (UPDATED)
npm install -D vite@6

# Install core dependencies
npm install \
  @tanstack/react-query@5 \
  @tanstack/react-query-devtools@5 \
  react-router-dom@latest \
  axios \
  zod \
  react-hook-form \
  @hookform/resolvers

# Install UI dependencies
npm install \
  clsx \
  tailwind-merge \
  class-variance-authority \
  lucide-react

# Install dev dependencies
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/node \
  babel-plugin-react-compiler

# Install MSW (NEW)
npm install -D msw@latest

# Initialize Tailwind CSS
cd apps/web
npx tailwindcss init -p

# Setup shadcn/ui (interactive CLI)
npx shadcn@latest init
# Choose:
# - Style: New York
# - Base color: Slate
# - CSS variables: Yes
# - Where is your global CSS: src/styles/globals.css
# - Configure import alias: @/*

# Install core shadcn components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add form
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add label
npx shadcn@latest add separator
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add skeleton

# Install NEW 2025 components
npx shadcn@latest add spinner
npx shadcn@latest add field
npx shadcn@latest add empty

# Initialize MSW (NEW)
npx msw init public/ --save
```

#### Files to Create

**1. `apps/web/vite.config.ts` (Vite 6)**

```typescript
/// <reference types='vitest' />\nimport { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web',

  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }], // React 19 Compiler
        ],
      },
    }),
    nxViteTsPaths(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: '../../dist/apps/web',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['lucide-react'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },

  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web',
      provider: 'v8',
    },
    setupFiles: ['./src/lib/api/mocks/setup.ts'], // MSW setup
  },
});
```

**2. `apps/web/babel.config.js` (NEW - React Compiler)**

```javascript
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19',
      // Optional: configure compiler behavior
      // compilationMode: 'annotation', // Only compile annotated components
    }],
  ],
};
```

**3. `apps/web/tsconfig.json` (TypeScript 5.7)**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "target": "ES2024",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "files": [],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

**4. `apps/web/.env.example`**

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# Application
VITE_APP_NAME=Accounting RBAC
VITE_APP_VERSION=1.0.0

# Development
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_QUERY_DEVTOOLS=true
VITE_ENABLE_MSW=true

# Optional: Analytics, monitoring
# VITE_ANALYTICS_ID=
# VITE_SENTRY_DSN=
```

**5. `apps/web/src/lib/api/mocks/handlers.ts` (NEW - MSW)**

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    // Mock authentication logic
    if (email && password) {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: '1',
          email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMIN',
          isActive: true,
        },
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/auth/refresh', async () => {
    return HttpResponse.json({
      access_token: 'new-mock-access-token',
    });
  }),

  // User endpoints
  http.get('/admin/users', () => {
    return HttpResponse.json([
      {
        id: '1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
      {
        id: '2',
        email: 'owner@test.com',
        firstName: 'Company',
        lastName: 'Owner',
        role: 'COMPANY_OWNER',
        isActive: true,
        company: { id: '1', name: 'Acme Corp' },
      },
    ]);
  }),

  http.get('/admin/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE',
      isActive: true,
    });
  }),

  http.post('/admin/users', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({
      id: 'new-user-id',
      ...userData,
      isActive: true,
    }, { status: 201 });
  }),

  // Add handlers for all 47 endpoints...
  // (Company, Module, Employee, Permission, SimpleText endpoints)
];
```

**6. `apps/web/src/lib/api/mocks/browser.ts` (NEW - MSW Browser)**

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**7. `apps/web/src/lib/api/mocks/server.ts` (NEW - MSW Node)**

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**8. `apps/web/src/lib/api/mocks/setup.ts` (NEW - Vitest Setup)**

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

**9. `apps/web/src/main.tsx` (Updated with MSW)**

```tsx
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/App';

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('./lib/api/mocks/browser');

  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
```

#### Validation Checklist

- [ ] Nx app generated successfully
- [ ] React 19 installed and working
- [ ] TypeScript 5.7 configured
- [ ] Vite 6 dev server runs: `nx serve web`
- [ ] React Compiler enabled in Babel config
- [ ] Tailwind classes apply correctly
- [ ] shadcn/ui components installable
- [ ] MSW initialized and mocking works
- [ ] Environment variables loaded
- [ ] Path aliases work (`@/components/*`)
- [ ] Hot reload working

---

### Phase 2: Type System & API Models (4-6 hours)

**No changes from 2024 plan** - Types remain the same

#### Files to Create

**1. `types/enums.ts`**
**2. `types/entities.ts`**
**3. `types/dtos.ts`**
**4. `types/api.ts`**
**5. `lib/validation/schemas.ts`**

_See original FRONTEND_IMPLEMENTATION_PLAN.md for complete code_

---

### Phase 3: API Client & Interceptors (5-7 hours)

**Minor updates for React 19 compatibility**

#### Files to Create

**1. `lib/api/client.ts` (Updated for TanStack Query v5)**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../auth/token-storage';
import { toast } from '@/components/ui/use-toast';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - auto-add JWT token
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

// Response interceptor - auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        tokenStorage.setAccessToken(data.access_token);
        processQueue(null, data.access_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Global error toast
    const message = error.response?.data?.message || error.message || 'An error occurred';
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });

    return Promise.reject(error);
  }
);

export default apiClient;
```

_Rest of Phase 3 files same as original plan_

---

### Phase 4: TanStack Query v5 Setup & Auth Hooks (6-8 hours)

**Updated for TanStack Query v5 API**

#### Files to Create

**1. `lib/api/query-client.ts` (TanStack Query v5)**

```typescript
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
};
```

**2. `lib/hooks/use-auth.ts` (Updated for v5)**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints/auth';
import { LoginDto, RegisterDto } from '@/types/dtos';
import { tokenStorage } from '../auth/token-storage';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    onSuccess: (data) => {
      tokenStorage.setAccessToken(data.access_token);
      tokenStorage.setRefreshToken(data.refresh_token);

      toast({
        title: 'Success',
        description: 'Login successful',
      });

      // Navigate based on role
      switch (data.user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'COMPANY_OWNER':
          navigate('/company');
          break;
        case 'EMPLOYEE':
          navigate('/modules');
          break;
      }
    },
    onError: (error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterDto) => authApi.register(userData),
    onSuccess: (data) => {
      tokenStorage.setAccessToken(data.access_token);
      tokenStorage.setRefreshToken(data.refresh_token);

      toast({
        title: 'Success',
        description: 'Registration successful',
      });

      navigate('/admin');
    },
  });

  // Logout
  const logout = () => {
    tokenStorage.clearTokens();
    queryClient.clear(); // Clear all cached data
    navigate('/login');

    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully',
    });
  };

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isPending: loginMutation.isPending || registerMutation.isPending, // Changed from isLoading
  };
};
```

**3. `app/App.tsx` (React 19 + TanStack Query v5)**

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/lib/api/query-client';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import Routes from './routes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>

      {import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
```

_Rest of Phase 4 same as original, with isPending instead of isLoading_

---

### Phase 5-12: Implementation Phases

**Minor updates for React 19 patterns**

#### Key Changes Across All Implementation Phases

**1. Remove Manual Memoization** (React Compiler handles it):

```tsx
// ❌ OLD (React 18 - not needed anymore)
const MemoizedComponent = React.memo(Component);
const memoizedValue = useMemo(() => expensiveCalc(data), [data]);
const memoizedCallback = useCallback(() => handler(data), [data]);

// ✅ NEW (React 19 - Compiler auto-optimizes)
function Component({ data }) {
  const value = expensiveCalc(data); // Auto-memoized
  const handleClick = () => handler(data); // Auto-memoized

  return <div onClick={handleClick}>{value}</div>;
}
```

**2. Use isPending instead of isLoading**:

```tsx
// ❌ OLD (TanStack Query v4)
const { data, isLoading } = useQuery({ ... });
if (isLoading) return <Spinner />;

// ✅ NEW (TanStack Query v5)
const { data, isPending } = useQuery({ ... });
if (isPending) return <Spinner />;
```

**3. Use New 2025 Components**:

```tsx
// NEW: Spinner component
import { Spinner } from '@/components/ui/spinner';
if (isPending) return <Spinner />;

// NEW: Field component (replaces manual label + input + error)
import { Field } from '@/components/ui/field';

<Field>
  <Label htmlFor="email">Email</Label>
  <Input id="email" {...register('email')} />
  {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
</Field>

// NEW: Empty component
import { Empty } from '@/components/ui/empty';
if (users.length === 0) return <Empty message="No users found" />;
```

**4. Use queryOptions for Type Safety**:

```tsx
// Define reusable query options
const userQueryOptions = (id: string) => queryOptions({
  queryKey: ['user', id],
  queryFn: () => api.users.getById(id),
  staleTime: 5 * 60 * 1000,
});

// Use in multiple places with full type inference
const { data } = useQuery(userQueryOptions(userId));
const { data } = useSuspenseQuery(userQueryOptions(userId));
```

_All other implementation remains same as original plan, apply above patterns throughout_

---

### Phase 13: Layouts & Navigation (6-8 hours)

_Same as original plan, no changes needed_

---

### Phase 14: Testing & Quality (10-12 hours)

**Enhanced with MSW integration**

#### Testing Strategy with MSW

**1. Unit Tests (Vitest)**

```typescript
// lib/hooks/use-users.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from './use-users';
import { server } from '../api/mocks/server';
import { http, HttpResponse } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUsers', () => {
  test('fetches users successfully', async () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    // Initially pending
    expect(result.current.isPending).toBe(true);

    // Wait for data
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Check data (MSW returns mock data)
    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].email).toBe('admin@test.com');
  });

  test('handles error', async () => {
    // Override MSW handler for this test
    server.use(
      http.get('/admin/users', () => {
        return HttpResponse.json(
          { message: 'Server error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
```

**2. Component Tests (Testing Library + MSW)**

```tsx
// components/forms/login-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from './login-form';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LoginForm', () => {
  test('submits login credentials', async () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    // Fill form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });

    // Submit
    fireEvent.click(screen.getByText('Login'));

    // Wait for MSW to respond
    await waitFor(() => {
      expect(screen.queryByText('Login successful')).toBeInTheDocument();
    });
  });

  test('displays validation errors', async () => {
    render(<LoginForm />, { wrapper: createWrapper() });

    // Submit without filling
    fireEvent.click(screen.getByText('Login'));

    // Zod validation errors
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });
});
```

**3. E2E Tests (Playwright with MSW)**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('http://localhost:4200/login');

    // Fill login form
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation
    await expect(page).toHaveURL('/admin');

    // Verify user menu
    await expect(page.locator('text=Admin User')).toBeVisible();
  });

  test('displays error on invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:4200/login');

    await page.fill('[name="email"]', 'wrong@test.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

#### MSW Handler Coverage

Create handlers for all 47 endpoints in `lib/api/mocks/handlers.ts`:

```typescript
export const handlers = [
  // Auth (3 endpoints)
  http.post('/auth/login', ...),
  http.post('/auth/register', ...),
  http.post('/auth/refresh', ...),

  // Users (6 endpoints)
  http.get('/admin/users', ...),
  http.get('/admin/users/:id', ...),
  http.post('/admin/users', ...),
  http.patch('/admin/users/:id', ...),
  http.delete('/admin/users/:id', ...),
  http.patch('/admin/users/:id/activate', ...),

  // Companies (5 endpoints)
  http.get('/admin/companies', ...),
  http.get('/admin/companies/:id', ...),
  http.post('/admin/companies', ...),
  http.patch('/admin/companies/:id', ...),
  http.delete('/admin/companies/:id', ...),

  // Modules (6 endpoints)
  http.get('/admin/modules', ...),
  http.get('/admin/modules/:id', ...),
  http.post('/admin/modules', ...),
  http.patch('/admin/modules/:id', ...),
  http.delete('/admin/modules/:id', ...),
  http.patch('/admin/modules/:id/toggle', ...),

  // Employees (10 endpoints)
  http.get('/company/employees', ...),
  http.get('/company/employees/:id', ...),
  http.post('/company/employees', ...),
  http.patch('/company/employees/:id', ...),
  http.delete('/company/employees/:id', ...),
  // ... permission endpoints

  // SimpleText (5 endpoints)
  http.get('/modules/simple-text', ...),
  http.get('/modules/simple-text/:id', ...),
  http.post('/modules/simple-text', ...),
  http.patch('/modules/simple-text/:id', ...),
  http.delete('/modules/simple-text/:id', ...),

  // ... remaining endpoints
];
```

---

### Phase 15: Production Optimization (8-10 hours)

**Enhanced with React 19 Compiler benefits**

#### React 19 Compiler Optimization

The React Compiler automatically optimizes your code, eliminating the need for:

**1. Manual Memoization**

```tsx
// ❌ Before: Manual optimization
const MemoizedTable = React.memo(DataTable);
const sortedData = useMemo(() => sort(data), [data]);
const handleClick = useCallback((id) => onClick(id), [onClick]);

// ✅ After: Compiler auto-optimizes (remove manual code)
function DataTable({ data, onClick }) {
  const sortedData = sort(data); // Auto-memoized
  const handleClick = (id) => onClick(id); // Auto-memoized

  return <Table data={sortedData} onClick={handleClick} />;
}
```

**Result**: 30-40% less code, 30-40% fewer re-renders

**2. Lazy Loading with React 19**

```tsx
import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';

// Lazy load heavy pages
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const UsersList = lazy(() => import('@/pages/admin/users/users-list'));
const CompanyList = lazy(() => import('@/pages/admin/companies/company-list'));

// Use with Suspense
function AdminRoutes() {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UsersList />} />
        <Route path="/admin/companies" element={<CompanyList />} />
      </Routes>
    </Suspense>
  );
}
```

**3. Bundle Analysis**

```bash
# Analyze bundle size
nx build web --configuration=production

# Use bundle analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    filename: './dist/stats.html',
    open: true,
  }),
]
```

**4. Performance Monitoring**

```tsx
// lib/utils/performance.ts
export const performanceMonitor = {
  markFeature: (name: string) => {
    performance.mark(name);
  },

  measureFeature: (name: string, startMark: string) => {
    performance.measure(name, startMark);
    const measure = performance.getEntriesByName(name)[0];

    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);

    // Send to analytics
    if (import.meta.env.PROD) {
      // analytics.track('performance', { name, duration: measure.duration });
    }
  },
};

// Usage
performanceMonitor.markFeature('user-list-start');
// ... fetch users
performanceMonitor.measureFeature('user-list', 'user-list-start');
```

**5. Error Boundary (React 19)**

```tsx
// components/common/error-boundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Send to error tracking
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleReset}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Usage in App.tsx
<ErrorBoundary>
  <Routes />
</ErrorBoundary>
```

#### Performance Targets (2025)

| Metric | Target | React 19 Benefit |
|--------|--------|------------------|
| **Initial Bundle** | <380KB | -15% from v18 |
| **LCP** | <2.0s | Suspense, Streaming |
| **INP** | <150ms | Concurrent Rendering |
| **CLS** | <0.1 | Better Suspense |
| **Build Time** | <8s | Vite 6 + TS 5.7 |

---

## Security Considerations

### 1. Content Security Policy

**Add to `index.html`**:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               font-src 'self' data:;
               connect-src 'self' http://localhost:3000;">
```

**Production (Nginx)**:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

### 2. Token Validation

```typescript
// lib/auth/token-storage.ts
export const tokenStorage = {
  isTokenValid: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getAccessToken: () => {
    const token = localStorage.getItem('access_token');
    if (token && !tokenStorage.isTokenValid(token)) {
      tokenStorage.clearTokens();
      return null;
    }
    return token;
  },

  // ... rest of storage methods
};
```

### 3. Input Sanitization (if needed)

```bash
npm install dompurify
npm install -D @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

function UserContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Note**: React auto-escapes by default, only needed for HTML content

---

## Performance Optimization

### Bundle Size Targets

**2025 Targets**:
- Initial load: <380KB (gzipped)
- Total assets: <2MB
- Per-route chunks: <100KB

**Achieved Through**:
- React 19: -20% bundle size vs React 18
- TanStack Query v5: -20% vs v4
- Vite 6: Better tree-shaking
- Manual chunking strategy

### Build Performance

**TypeScript 5.7 Improvements**:
- Compile caching with Node.js 22+
- 30% faster type checking
- Incremental builds

**Vite 6 Improvements**:
- 20% faster cold starts
- Improved HMR (80ms vs 100ms)
- Better dependency pre-bundling

### Runtime Performance

**React 19 Compiler Benefits**:
- 30-40% fewer re-renders
- Auto-memoization
- Better memory usage (-10%)

**Monitoring**:
```tsx
// Add to production build
if (import.meta.env.PROD) {
  // Monitor Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}
```

---

## Testing Strategy

### Test Coverage Targets

- **Unit Tests**: 80%+ (hooks, utilities)
- **Component Tests**: 70%+ (forms, tables)
- **E2E Tests**: Key user flows only

### MSW Integration

**Benefits**:
- Same mocks for dev, test, and E2E
- No axios-mock-adapter hacks
- Realistic API responses
- Works in browser and Node.js

**Setup**:
```bash
# Development mode
npm run dev
# MSW intercepts all API calls

# Unit tests
npm run test
# MSW Node worker intercepts

# E2E tests
npm run e2e
# MSW browser worker intercepts
```

---

## Deployment

### Vercel (Quick Deploy)

```bash
# Install CLI
npm i -g vercel

# Deploy
cd apps/web
vercel --prod
```

**Zero config** - Vercel auto-detects:
- Build: `npm run build`
- Output: `dist/`
- Framework: Vite + React

### Docker + Nginx (Production)

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Security headers
  add_header Content-Security-Policy "default-src 'self';" always;
  add_header X-Frame-Options "DENY" always;

  # Caching
  location ~* \.(js|css|png|jpg|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

---

## Timeline & Resources

### Detailed Time Estimates (2025)

| Phase | Description | Hours | Change from 2024 |
|-------|-------------|-------|------------------|
| 1 | Project Setup | 8-10 | +2h (React 19 + MSW) |
| 2 | Type System | 4-6 | Same |
| 3 | API Client | 5-7 | Same |
| 4 | TanStack Query & Auth | 6-8 | Same |
| 5 | Routing & Protection | 5-7 | Same |
| 6 | shadcn Components | 4-5 | Same |
| 7 | Admin - Users | 8-10 | Same |
| 8 | Admin - Companies | 7-9 | Same |
| 9 | Admin - Modules | 6-8 | Same |
| 10 | Company - Employees | 8-10 | Same |
| 11 | Company - Permissions | 6-8 | Same |
| 12 | Simple Text Module | 7-9 | Same |
| 13 | Layouts & Navigation | 6-8 | Same |
| 14 | Testing | 10-12 | Same (MSW) |
| 15 | Production Optimization | 8-10 | Same |
| **TOTAL** | **Full Implementation** | **108-137** | **+2h** |

### MVP Timeline (Phases 1-11)

- **Total**: 82 hours (10.25 working days for 1 developer)
- **Features**: Core functionality with updated 2025 stack
- **Deliverable**: Working app ready for testing

### Team Distribution

**2 Developers** (7-9 days):
- Developer 1: Phases 1-6 (infrastructure)
- Developer 2: Phases 7-9 (admin) → parallel after Phase 6
- Both: Phases 10-12 (features)
- Developer 1: Phase 13 (layouts)
- Both: Phases 14-15 (testing, optimization)

**3 Developers** (5-7 days):
- Developer 1: Phases 1-6
- Developer 2: Phases 7-9 → parallel after Phase 6
- Developer 3: Phases 10-12 → parallel after Phase 6
- All: Phase 13 (integration)
- All: Phases 14-15 (quality)

---

## Migration from 2024 Plan

### What Changed

#### Stack Updates

| Component | Old | New | Effort |
|-----------|-----|-----|--------|
| React | 18.2+ | 19.x | 2-4h |
| TypeScript | 5.0+ | 5.7 | 1h |
| Vite | 5.0+ | 6.0 | 1h |
| TanStack Query | v4 | v5 | 2-3h |
| MSW | - | Latest | 4-6h |

#### Total Migration: 10-15 hours

### Breaking Changes

**1. TanStack Query v5**:
- `isLoading` → `isPending` (find/replace)
- `cacheTime` → `gcTime`
- Some API simplifications

**2. React 19**:
- Removed deprecated APIs (low impact)
- StrictMode double-invocation

### Migration Steps

See `MIGRATION_GUIDE_2025.md` for step-by-step instructions.

---

## Success Criteria

### Functional Requirements

- ✅ All 47 API endpoints integrated
- ✅ 3 role-based UIs working
- ✅ JWT authentication with auto-refresh
- ✅ Protected routes enforce authorization
- ✅ Multi-tenant data isolation
- ✅ Permission-based UI rendering
- ✅ CRUD operations for all entities

### Technical Requirements

- ✅ TypeScript 5.7 strict mode (0 errors)
- ✅ Test coverage >80%
- ✅ No console errors in production
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility (WCAG 2.1 AA)

### Performance Requirements (2025)

- ✅ Initial bundle <380KB (improved from 450KB)
- ✅ Total bundle <2MB
- ✅ LCP <2.0s (improved from 2.5s)
- ✅ INP <150ms (improved from 200ms)
- ✅ CLS <0.1
- ✅ Build time <8s (improved from 10s)

### Security Requirements

- ✅ JWT tokens with validation
- ✅ Auto-logout on token expiration
- ✅ Content Security Policy
- ✅ Input validation (Zod + backend)
- ✅ HTTPS in production

---

## Next Steps

### Immediate Actions

1. ✅ Review this updated plan
2. ⏳ Review `FRONTEND_RESEARCH_REPORT_2025.md` for rationale
3. ⏳ Review `MIGRATION_GUIDE_2025.md` for migration steps
4. ⏳ Approve stack updates
5. ⏳ Begin Phase 1 implementation

### Phase 1 Execution (Updated)

```bash
# 1. Generate Nx React app
nx g @nx/react:application web --bundler=vite --routing=true

# 2. Install React 19 and updated stack
npm install react@19 react-dom@19
npm install typescript@5.7 vite@6
npm install @tanstack/react-query@5
npm install -D msw@latest babel-plugin-react-compiler

# 3. Configure React 19 Compiler
# Create babel.config.js with React Compiler plugin

# 4. Setup MSW
npx msw init public/ --save

# 5. Install shadcn/ui 2025 components
npx shadcn@latest init
npx shadcn@latest add spinner field empty

# 6. Verify setup
nx serve web
# Should see React 19 app at http://localhost:4200
```

---

## Related Documentation

- **FRONTEND_RESEARCH_REPORT_2025.md** - Complete research findings and rationale
- **MIGRATION_GUIDE_2025.md** - Step-by-step migration from 2024 plan
- **ARCHITECTURE.md** - Backend system architecture
- **API_ENDPOINTS.md** - Complete API reference (47 endpoints)
- **COMPONENT_DESIGN_SYSTEM.md** - UI component catalog

---

**Version**: 2.0
**Created**: January 2025
**Status**: Ready for Implementation
**Estimated Completion**: 13.5-17 days (1 developer) | 5-7 days (3 developers)
**Stack**: React 19 + TypeScript 5.7 + Vite 6 + TanStack Query v5 + MSW

**Ready to build the future. 🚀**
