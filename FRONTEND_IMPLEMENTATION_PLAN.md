# Frontend Implementation Plan - React + TypeScript

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Implementation Phases](#implementation-phases)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Timeline & Resources](#timeline--resources)

---

## Executive Summary

### Project Overview

Build a production-ready, multi-tenant accounting frontend application with role-based access control, integrating with the existing NestJS backend API (47 endpoints).

### Key Features

- **Multi-tenant Architecture**: Complete data isolation per company
- **Role-Based UI**: 3 distinct user experiences (ADMIN, COMPANY_OWNER, EMPLOYEE)
- **Module System**: Pluggable business modules with granular permissions
- **Real-time Updates**: TanStack Query with optimistic updates
- **Modern UX**: Tailwind CSS + shadcn/ui for consistent design
- **Type-Safe**: Full TypeScript coverage with strict mode
- **Tested**: Unit, integration, and E2E tests (>80% coverage)
- **Optimized**: Code splitting, lazy loading, <500KB initial bundle

### Timeline

- **Total Effort**: 106-135 hours (13-17 working days for 1 developer)
- **MVP Delivery**: 80 hours (Phases 1-11)
- **Production Ready**: 135 hours (all phases)
- **Team of 2**: 7-9 working days
- **Team of 3**: 5-7 working days

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2+ | UI framework |
| **TypeScript** | 5.0+ | Type safety |
| **Vite** | 5.0+ | Build tool (faster than Webpack) |
| **Nx** | Latest | Monorepo management |

### UI & Styling

| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Accessible component library |
| **Lucide React** | Icon library |
| **class-variance-authority** | Component variants |
| **tailwind-merge** | Conditional class merging |

### State Management

| Technology | Purpose |
|------------|---------|
| **TanStack Query** | Server state management, caching |
| **React Context** | Auth state, user session |
| **React Hook Form** | Form state management |
| **Zod** | Schema validation |

### HTTP & API

| Technology | Purpose |
|------------|---------|
| **Axios** | HTTP client |
| **TanStack Query** | Query & mutation management |

### Routing

| Technology | Purpose |
|------------|---------|
| **React Router v6** | Client-side routing |
| **Role-based guards** | Authorization protection |

### Testing

| Technology | Purpose |
|------------|---------|
| **Vitest** | Unit testing |
| **Testing Library** | Component testing |
| **Playwright** | E2E testing |
| **MSW** | API mocking |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           React Application (apps/web)       │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐        │
│  │  UI Layer    │  │ Route Guards │        │
│  │  (shadcn/ui) │  │ (Role-based) │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                  │
│  ┌──────▼─────────────────▼───────┐        │
│  │     Component Layer             │        │
│  │  (Pages, Forms, Tables)         │        │
│  └──────┬──────────────────────────┘        │
│         │                                    │
│  ┌──────▼──────────────────────────┐        │
│  │    State Management Layer        │        │
│  │  • TanStack Query (server state) │        │
│  │  • Context (auth, user)          │        │
│  └──────┬──────────────────────────┘        │
│         │                                    │
│  ┌──────▼──────────────────────────┐        │
│  │      API Client Layer            │        │
│  │  • Axios with interceptors       │        │
│  │  • Auto JWT token injection      │        │
│  │  • Auto token refresh on 401     │        │
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

### Role-Based Routing

```
Root (/)
  │
  ├─ /login (public)
  ├─ /register (public)
  │
  ├─ /admin/* (ADMIN only)
  │   ├─ /admin/users
  │   ├─ /admin/companies
  │   └─ /admin/modules
  │
  ├─ /company/* (COMPANY_OWNER only)
  │   ├─ /company/employees
  │   └─ /company/modules
  │
  └─ /modules/* (COMPANY_OWNER + EMPLOYEE)
      └─ /modules/simple-text
```

### State Management Strategy

```
┌───────────────────┐
│   React Context   │  ← Auth state (user, tokens)
├───────────────────┤
│  TanStack Query   │  ← Server state (API data)
│                   │
│  Query Keys:      │
│  • users          │
│  • companies      │
│  • modules        │
│  • employees      │
│  • simple-text    │
└───────────────────┘
```

---

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx                          # Root component
│   │   └── routes.tsx                        # Route configuration
│   │
│   ├── pages/
│   │   ├── public/
│   │   │   ├── login-page.tsx
│   │   │   └── register-page.tsx
│   │   ├── admin/
│   │   │   ├── dashboard.tsx
│   │   │   ├── users/
│   │   │   │   ├── users-list.tsx
│   │   │   │   ├── user-detail.tsx
│   │   │   │   └── user-form-dialog.tsx
│   │   │   ├── companies/
│   │   │   │   ├── company-list.tsx
│   │   │   │   ├── company-detail.tsx
│   │   │   │   └── company-form-dialog.tsx
│   │   │   └── modules/
│   │   │       ├── module-list.tsx
│   │   │       └── module-form-dialog.tsx
│   │   ├── company/
│   │   │   ├── dashboard.tsx
│   │   │   ├── employees/
│   │   │   │   ├── employee-list.tsx
│   │   │   │   ├── employee-detail.tsx
│   │   │   │   └── employee-form-dialog.tsx
│   │   │   └── modules/
│   │   │       ├── company-modules.tsx
│   │   │       └── permissions-dialog.tsx
│   │   ├── employee/
│   │   │   └── dashboard.tsx
│   │   ├── modules/
│   │   │   └── simple-text/
│   │   │       ├── simple-text-list.tsx
│   │   │       └── simple-text-form-dialog.tsx
│   │   └── errors/
│   │       ├── not-found.tsx
│   │       └── unauthorized.tsx
│   │
│   ├── components/
│   │   ├── ui/                              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── card.tsx
│   │   │   └── badge.tsx
│   │   ├── layouts/
│   │   │   ├── public-layout.tsx
│   │   │   ├── admin-layout.tsx
│   │   │   ├── company-layout.tsx
│   │   │   └── employee-layout.tsx
│   │   ├── auth/
│   │   │   ├── protected-route.tsx
│   │   │   └── role-route.tsx
│   │   ├── common/
│   │   │   ├── data-table.tsx
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── user-menu.tsx
│   │   └── forms/
│   │       ├── login-form.tsx
│   │       ├── register-form.tsx
│   │       ├── user-form.tsx
│   │       ├── company-form.tsx
│   │       ├── module-form.tsx
│   │       ├── employee-form.tsx
│   │       ├── permission-selector.tsx
│   │       └── simple-text-form.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                    # Axios instance
│   │   │   ├── query-client.ts              # TanStack Query config
│   │   │   └── endpoints/
│   │   │       ├── auth.ts                  # POST /auth/*
│   │   │       ├── users.ts                 # CRUD /admin/users
│   │   │       ├── companies.ts             # CRUD /admin/companies
│   │   │       ├── modules.ts               # CRUD /admin/modules
│   │   │       ├── employees.ts             # CRUD /company/employees
│   │   │       ├── permissions.ts           # Manage permissions
│   │   │       └── simple-text.ts           # CRUD /modules/simple-text
│   │   ├── auth/
│   │   │   └── token-storage.ts             # localStorage wrapper
│   │   ├── hooks/
│   │   │   ├── use-auth.ts                  # Auth mutations
│   │   │   ├── use-users.ts                 # User queries/mutations
│   │   │   ├── use-companies.ts             # Company queries/mutations
│   │   │   ├── use-modules.ts               # Module queries/mutations
│   │   │   ├── use-employees.ts             # Employee queries/mutations
│   │   │   ├── use-permissions.ts           # Permission mutations
│   │   │   └── use-simple-text.ts           # SimpleText queries/mutations
│   │   ├── validation/
│   │   │   └── schemas.ts                   # Zod schemas
│   │   └── utils/
│   │       ├── cn.ts                        # Tailwind merge utility
│   │       ├── error-handler.ts             # API error handling
│   │       ├── formatters.ts                # Date, currency formatters
│   │       └── permissions.ts               # Permission helpers
│   │
│   ├── contexts/
│   │   └── auth-context.tsx                 # Auth provider
│   │
│   ├── types/
│   │   ├── enums.ts                         # UserRole, ModulePermission
│   │   ├── entities.ts                      # User, Company, Module, etc.
│   │   ├── dtos.ts                          # API request/response types
│   │   └── api.ts                           # ApiError, PaginatedResponse
│   │
│   ├── styles/
│   │   └── globals.css                      # Tailwind + CSS variables
│   │
│   └── main.tsx                             # Entry point
│
├── public/                                  # Static assets
├── index.html                               # HTML template
├── vite.config.ts                           # Vite configuration
├── tsconfig.json                            # TypeScript config
├── tailwind.config.js                       # Tailwind config
├── postcss.config.js                        # PostCSS config
├── .env.local                               # Environment variables (gitignored)
├── .env.example                             # Environment template
└── package.json                             # Dependencies
```

---

## Implementation Phases

### Phase 1: Project Setup & Configuration (6-8 hours)

#### Objectives
- Generate Nx React application in monorepo
- Configure Vite build tool
- Setup Tailwind CSS with shadcn/ui
- Configure TypeScript with strict mode
- Setup environment variables
- Configure path aliases

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

# Install core dependencies
npm install \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  react-router-dom \
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
  @types/node

# Initialize Tailwind CSS
cd apps/web
npx tailwindcss init -p

# Setup shadcn/ui (interactive CLI)
npx shadcn-ui@latest init
# Choose:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Where is your global CSS: src/styles/globals.css
# - Configure import alias: @/*

# Install core shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add label
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
```

#### Files to Create

**1. `apps/web/vite.config.ts`**

```typescript
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web',

  server: {
    port: 4200,
    host: 'localhost',
    // Proxy API requests to backend
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

  plugins: [react(), nxViteTsPaths()],

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
  },
});
```

**2. `apps/web/tailwind.config.js`**

```javascript
const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/*.(js|jsx|ts|tsx|html)'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

**3. `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "target": "ES2020",
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
  "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
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

# Optional: Analytics, monitoring
# VITE_ANALYTICS_ID=
# VITE_SENTRY_DSN=
```

**5. `apps/web/.env.local`** (create manually, not committed)

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Accounting RBAC
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_QUERY_DEVTOOLS=true
```

**6. `apps/web/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**7. `apps/web/src/lib/utils/cn.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### Validation Checklist

- [ ] Nx app generated successfully
- [ ] `nx serve web` runs without errors
- [ ] Tailwind classes apply correctly (test with bg-primary)
- [ ] shadcn/ui components installable
- [ ] Environment variables loaded (`import.meta.env.VITE_API_BASE_URL`)
- [ ] TypeScript strict mode enabled (no errors)
- [ ] Path aliases work (`@/components/*`)
- [ ] Hot reload working in dev mode

---

### Phase 2: Type System & API Models (4-6 hours)

#### Objectives
- Define TypeScript interfaces for all entities
- Create DTO types for all API requests/responses
- Setup Zod schemas for form validation
- Match backend API contracts exactly

#### Files to Create

**Complete code provided in agent response above - including:**
- `types/enums.ts` - UserRole, ModulePermission enums
- `types/entities.ts` - User, Company, Module, etc. interfaces
- `types/dtos.ts` - All request/response DTOs
- `types/api.ts` - ApiError, PaginatedResponse
- `lib/validation/schemas.ts` - Zod schemas for all forms

#### Validation Checklist

- [ ] All backend entities have TS interfaces
- [ ] DTOs match API specifications (check against API_ENDPOINTS.md)
- [ ] Zod schemas validate correctly
- [ ] Type exports work across modules
- [ ] No TypeScript errors
- [ ] Enums match backend exactly

---

### Phase 3: API Client & Interceptors (5-7 hours)

#### Objectives
- Setup Axios HTTP client with base configuration
- Implement request interceptor (auto-add JWT token)
- Implement response interceptor (auto-refresh on 401)
- Handle token refresh flow with queuing
- Global error handling

#### Files to Create

**Complete code provided in agent response:**
- `lib/api/client.ts` - Axios instance with interceptors
- `lib/auth/token-storage.ts` - localStorage wrapper
- `lib/utils/error-handler.ts` - API error handling

**Key Features**:
- ✅ Auto-inject JWT token in Authorization header
- ✅ Refresh token flow on 401 Unauthorized
- ✅ Queue failed requests during token refresh
- ✅ Automatic logout on refresh failure
- ✅ Global toast notifications for errors
- ✅ TypeScript type safety for API responses

#### Validation Checklist

- [ ] API client makes successful requests to backend
- [ ] Auth token automatically added to requests
- [ ] Token refresh triggers on 401
- [ ] Failed requests queued and retried after refresh
- [ ] Logout on refresh token expiration
- [ ] Toast notifications display for errors
- [ ] No CORS errors (backend CORS configured)

---

### Phase 4: TanStack Query Setup & Auth Hooks (6-8 hours)

#### Objectives
- Configure React Query with optimal defaults
- Create query keys factory for cache management
- Build auth API endpoint functions
- Implement authentication hooks (login, register, logout)
- Setup auth context provider

#### Files to Create

**Complete code provided in agent response:**
- `lib/api/query-client.ts` - QueryClient + query keys
- `lib/api/endpoints/auth.ts` - Auth API functions
- `lib/hooks/use-auth.ts` - Auth mutations & logic
- `contexts/auth-context.tsx` - Auth provider
- `app/App.tsx` - Root component with providers

**Key Features**:
- ✅ Query caching with 5min stale time
- ✅ Organized query keys for cache invalidation
- ✅ Login/register mutations with success handling
- ✅ Auto-navigation after auth based on role
- ✅ Toast notifications for auth events
- ✅ User state accessible via useAuthContext

#### Validation Checklist

- [ ] QueryClient configured
- [ ] Query devtools accessible in dev mode
- [ ] Login mutation works and stores tokens
- [ ] Register mutation works and stores tokens
- [ ] Logout clears tokens and cache
- [ ] User state persists across page refresh
- [ ] Auth context provides correct values

---

### Phase 5: Routing & Role-Based Protection (5-7 hours)

#### Objectives
- Setup React Router with nested routes
- Implement protected route component
- Create role-based route guard
- Define routes for all 3 user roles
- Handle unauthorized access

#### Files to Create

**Complete code provided in agent response:**
- `app/routes.tsx` - Complete route configuration
- `components/auth/protected-route.tsx` - Auth guard
- `components/auth/role-route.tsx` - Role guard
- `pages/errors/not-found.tsx` - 404 page
- `pages/errors/unauthorized.tsx` - 403 page

**Route Structure**:
- Public: `/login`, `/register`
- Admin: `/admin/*` (dashboard, users, companies, modules)
- Company Owner: `/company/*` (employees, modules)
- Employee: `/modules/*` (simple-text, etc.)

#### Validation Checklist

- [ ] Protected routes redirect to /login when not authenticated
- [ ] Role-based routes redirect to /unauthorized for wrong role
- [ ] Root `/` redirects correctly based on role
- [ ] 404 page displays for unknown routes
- [ ] Navigation state preserved (returnUrl after login)
- [ ] Layout nesting works (Outlet rendering)

---

### Phase 6: shadcn/ui Components Setup (4-5 hours)

#### Objectives
- Install all required shadcn/ui components
- Create custom composite components
- Build reusable DataTable component
- Create confirmation dialogs
- Setup toast system

#### Components to Install

```bash
# Core UI components
npx shadcn-ui@latest add button input form label
npx shadcn-ui@latest add table card badge separator
npx shadcn-ui@latest add dialog toast dropdown-menu
npx shadcn-ui@latest add select checkbox switch
npx shadcn-ui@latest add alert alert-dialog
npx shadcn-ui@latest add skeleton avatar
```

#### Custom Components to Create

**1. `components/common/data-table.tsx`** - Reusable table with sorting
**2. `components/common/confirm-dialog.tsx`** - Delete confirmations
**3. `components/common/loading-spinner.tsx`** - Loading states
**4. `components/common/page-header.tsx`** - Page titles & actions
**5. `components/common/breadcrumbs.tsx`** - Navigation breadcrumbs
**6. `components/common/user-menu.tsx`** - User dropdown menu

#### Validation Checklist

- [ ] All shadcn components installed
- [ ] Components render without errors
- [ ] DataTable supports sorting and filtering
- [ ] ConfirmDialog shows and handles cancel/confirm
- [ ] Toast notifications display correctly
- [ ] Loading spinner animations work

---

### Phase 7: Admin - User Management (8-10 hours)

#### Objectives
- Build users list page with data table
- Create user detail/edit page
- Implement create user form
- Add delete user functionality
- Activate/deactivate user toggle

#### Files to Create

**1. `lib/api/endpoints/users.ts`**

```typescript
import apiClient from '../client';
import { User } from '@/types/entities';
import { CreateUserDto, UpdateUserDto } from '@/types/dtos';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/admin/users');
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/admin/users/${id}`);
    return data;
  },

  create: async (userData: CreateUserDto): Promise<User> => {
    const { data } = await apiClient.post<User>('/admin/users', userData);
    return data;
  },

  update: async (id: string, userData: UpdateUserDto): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}`, userData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  activate: async (id: string, isActive: boolean): Promise<User> => {
    const { data } = await apiClient.patch<User>(
      `/admin/users/${id}/activate?isActive=${isActive}`
    );
    return data;
  },
};
```

**2. `lib/hooks/use-users.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints/users';
import { queryKeys } from '../api/query-client';
import { CreateUserDto, UpdateUserDto } from '@/types/dtos';
import { toast } from '@/components/ui/use-toast';

export const useUsers = () => {
  const queryClient = useQueryClient();

  // Query: Get all users
  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
  });

  // Mutation: Create user
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserDto) => usersApi.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'User created',
        description: 'User has been created successfully',
      });
    },
  });

  // Mutation: Update user
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'User updated',
        description: 'User has been updated successfully',
      });
    },
  });

  // Mutation: Delete user
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'User deleted',
        description: 'User has been deleted successfully',
      });
    },
  });

  // Mutation: Activate/deactivate user
  const activateUserMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.activate(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    activateUser: activateUserMutation.mutate,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
};
```

**3. `pages/admin/users/users-list.tsx`**

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '@/lib/hooks/use-users';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { UserFormDialog } from './user-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { User } from '@/types/entities';
import { ColumnDef } from '@tanstack/react-table';

export default function UsersList() {
  const { users, isLoading, deleteUser, activateUser } = useUsers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'firstName',
      header: 'First Name',
    },
    {
      accessorKey: 'lastName',
      header: 'Last Name',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={
          row.original.role === 'ADMIN' ? 'destructive' :
          row.original.role === 'COMPANY_OWNER' ? 'default' :
          'secondary'
        }>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'company.name',
      header: 'Company',
      cell: ({ row }) => row.original.company?.name || '-',
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingUser(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              activateUser({
                id: row.original.id,
                isActive: !row.original.isActive,
              })
            }
          >
            {row.original.isActive ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeletingUser(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Users"
        description="Manage system users and their roles"
        action={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
        />
      </div>

      {/* Create user dialog */}
      <UserFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit user dialog */}
      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
        />
      )}

      {/* Delete confirmation */}
      {deletingUser && (
        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          title="Delete User"
          description={`Are you sure you want to delete ${deletingUser.email}? This action cannot be undone.`}
          onConfirm={() => {
            deleteUser(deletingUser.id);
            setDeletingUser(null);
          }}
        />
      )}
    </div>
  );
}
```

**[Similar patterns for Phases 8-12 - company management, module management, employee management, permissions, simple-text]**

---

### Phases 8-12 Summary

**Phase 8: Admin - Company Management** (7-9h)
- Companies list with data table
- Create/edit company forms
- Company employees view
- Module assignment UI
- Hooks: `use-companies.ts`
- Endpoints: `companies.ts`

**Phase 9: Admin - Module Management** (6-8h)
- Modules list
- Create/edit module forms
- Company module access management
- Enable/disable toggles
- Hooks: `use-modules.ts`
- Endpoints: `modules.ts`

**Phase 10: Company Owner - Employee Management** (8-10h)
- Employees list (filtered by company)
- Create/edit employee forms
- Delete employee
- Permission-based rendering
- Hooks: `use-employees.ts`
- Endpoints: `employees.ts`

**Phase 11: Company Owner - Module Permissions** (6-8h)
- Available modules list
- Grant/revoke permissions dialog
- Permission selector (checkboxes: read, write, delete)
- Bulk permission management
- Hooks: `use-permissions.ts`
- Endpoints: `permissions.ts`

**Phase 12: Simple Text Module** (7-9h)
- Simple text list with CRUD
- Permission-based UI (hide create/edit/delete based on permissions)
- Multi-tenant data display
- Example for future modules
- Hooks: `use-simple-text.ts`
- Endpoints: `simple-text.ts`

---

### Phase 13: Layouts & Navigation (6-8h)

#### Objectives
- Create layouts for each user role
- Build navigation sidebars
- Implement header with user menu
- Add breadcrumbs component
- Responsive design (mobile menu)

#### Files to Create

**1. `components/layouts/admin-layout.tsx`**

```typescript
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, Building2, Package, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/companies', icon: Building2, label: 'Companies' },
  { href: '/admin/modules', icon: Package, label: 'Modules' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <nav className="space-y-1 px-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="flex h-16 items-center px-6 justify-between">
            <Breadcrumbs />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**Similar layouts for**: CompanyLayout, EmployeeLayout, PublicLayout

---

### Phase 14: Testing & Quality (10-12h)

#### Objectives
- Unit tests for hooks (Vitest)
- Component tests (Testing Library)
- E2E tests (Playwright)
- API mocking (MSW)
- Test coverage >80%

#### Test Files to Create

**1. `lib/hooks/use-auth.test.ts`**
**2. `components/forms/login-form.test.tsx`**
**3. `e2e/auth.spec.ts`** - Login, register, logout flows
**4. `e2e/admin-users.spec.ts`** - User CRUD operations
**5. `e2e/permissions.spec.ts`** - Permission management
**6. `lib/api/mocks/handlers.ts`** - MSW handlers

#### Validation Checklist

- [ ] All hooks have unit tests
- [ ] Critical components tested
- [ ] E2E tests pass for auth flow
- [ ] E2E tests pass for CRUD operations
- [ ] Coverage report >80%
- [ ] No console errors in tests

---

### Phase 15: Production Optimization (8-10h)

#### Objectives
- Code splitting by route
- Lazy loading components
- Bundle size analysis and optimization
- Error boundaries
- Performance monitoring
- Production build configuration

#### Optimizations

**1. Lazy Loading Routes**

```typescript
import { lazy } from 'react';

const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const UsersList = lazy(() => import('@/pages/admin/users/users-list'));
// ... other routes

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Suspense>
```

**2. Bundle Analysis**

```bash
# Analyze bundle size
nx build web --analyze

# Check bundle size
npx vite-bundle-visualizer
```

**3. Error Boundary**

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Security Considerations

### 1. Token Storage

**Current**: localStorage (accessible to JavaScript)
**Production Recommendation**: HttpOnly cookies

```typescript
// Alternative: Store tokens in HttpOnly cookies (backend change required)
// Pros: Not accessible to JavaScript (XSS protection)
// Cons: Requires CSRF protection

// Current localStorage approach:
// Pros: Simple, works with CORS
// Cons: Vulnerable to XSS attacks
```

### 2. XSS Prevention

```typescript
// React auto-escapes by default
<div>{userInput}</div>  // Safe

// Dangerous (use only when absolutely necessary):
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
```

### 3. CSRF Protection

```typescript
// Add CSRF token to state-changing requests
apiClient.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();
```

### 4. Input Validation

```typescript
// Always validate on both client (Zod) and server (already implemented)
// Never trust client-side validation alone
```

### 5. Role-Based Rendering

```typescript
// Hide UI elements based on permissions
const canDelete = user?.permissions?.includes('delete');

{canDelete && (
  <Button onClick={handleDelete}>Delete</Button>
)}

// Always enforce authorization on backend (already implemented)
```

---

## Performance Optimization

### Bundle Size Optimization

**Target**: Initial bundle <500KB, total <2MB

**Strategies**:
1. **Code Splitting**: Split by route
2. **Tree Shaking**: Remove unused code
3. **Lazy Loading**: Import components on demand
4. **CDN**: Serve static assets from CDN

### Loading Performance

**Target**: <3s on 3G, <1s on WiFi

**Strategies**:
1. **Prefetching**: Prefetch next likely routes
2. **Caching**: TanStack Query caching (5min stale)
3. **Pagination**: Limit initial data fetch
4. **Virtual Scrolling**: For large lists (>100 items)

### Runtime Performance

**Target**: 60fps, <100ms interaction

**Strategies**:
1. **Memoization**: `React.memo`, `useMemo`, `useCallback`
2. **Debouncing**: Search inputs, filter changes
3. **Optimistic Updates**: Update UI before API response

---

## Testing Strategy

### Unit Tests (Vitest)

**Coverage**: Hooks, utilities, helpers

```typescript
// Example: test hook
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from './use-users';

test('useUsers returns users list', async () => {
  const { result } = renderHook(() => useUsers(), {
    wrapper: createWrapper(),  // QueryClient wrapper
  });

  await waitFor(() => expect(result.current.users).toBeDefined());
  expect(result.current.users).toHaveLength(2);
});
```

### Component Tests (Testing Library)

**Coverage**: Forms, tables, dialogs

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './login-form';

test('login form submits credentials', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'user@test.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByText('Login'));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    });
  });
});
```

### E2E Tests (Playwright)

**Coverage**: Critical user flows

```typescript
import { test, expect } from '@playwright/test';

test('admin can create user', async ({ page }) => {
  // Login as admin
  await page.goto('http://localhost:4200/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to users
  await expect(page).toHaveURL('/admin');
  await page.click('text=Users');

  // Create user
  await page.click('text=Create User');
  await page.fill('[name="email"]', 'newuser@test.com');
  await page.fill('[name="firstName"]', 'New');
  await page.fill('[name="lastName"]', 'User');
  await page.fill('[name="password"]', 'password123');
  await page.selectOption('[name="role"]', 'EMPLOYEE');
  await page.click('button[type="submit"]');

  // Verify
  await expect(page.locator('text=newuser@test.com')).toBeVisible();
});
```

### API Mocking (MSW)

**Setup**: `lib/api/mocks/handlers.ts`

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.post('/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: '1',
          email: 'test@test.com',
          role: 'ADMIN',
        },
      })
    );
  }),

  rest.get('/admin/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', email: 'user1@test.com', role: 'EMPLOYEE' },
        { id: '2', email: 'user2@test.com', role: 'COMPANY_OWNER' },
      ])
    );
  }),

  // ... more handlers for all 47 endpoints
];
```

---

## Deployment

### Build Configuration

```bash
# Development
nx serve web

# Production build
nx build web --configuration=production

# Preview production build
nx preview web
```

### Environment Configuration

**Development** (`.env.local`):
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_ENABLE_DEVTOOLS=true
```

**Production** (`.env.production`):
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENABLE_DEVTOOLS=false
```

### Deployment Checklist

- [ ] Environment variables configured for production
- [ ] API base URL points to production backend
- [ ] Build completes without errors
- [ ] Bundle size <500KB initial
- [ ] All routes accessible
- [ ] Authentication flow works
- [ ] Token refresh works
- [ ] Error handling works
- [ ] Performance metrics acceptable (Lighthouse >90)
- [ ] Security headers configured (backend CORS)

---

## Timeline & Resources

### Detailed Time Estimates

| Phase | Description | Hours | Days (1 dev) |
|-------|-------------|-------|--------------|
| 1 | Project Setup | 6-8 | 1 |
| 2 | Type System | 4-6 | 0.5-1 |
| 3 | API Client | 5-7 | 1 |
| 4 | TanStack Query & Auth | 6-8 | 1 |
| 5 | Routing & Protection | 5-7 | 1 |
| 6 | shadcn Components | 4-5 | 0.5 |
| 7 | Admin - Users | 8-10 | 1.5 |
| 8 | Admin - Companies | 7-9 | 1 |
| 9 | Admin - Modules | 6-8 | 1 |
| 10 | Company - Employees | 8-10 | 1.5 |
| 11 | Company - Permissions | 6-8 | 1 |
| 12 | Simple Text Module | 7-9 | 1 |
| 13 | Layouts & Navigation | 6-8 | 1 |
| 14 | Testing | 10-12 | 1.5 |
| 15 | Production Optimization | 8-10 | 1 |
| **TOTAL** | **Full Implementation** | **106-135** | **13-17** |

### MVP Timeline (Phases 1-11)

- **Total**: ~80 hours (10 working days for 1 developer)
- **Features**: Core functionality without advanced features
- **Deliverable**: Working app with all user management and module basics

### Team Distribution

**2 Developers** (7-9 days):
- Developer 1: Phases 1-6 (setup, infrastructure)
- Developer 2: Phases 7-9 (admin features) → parallel after Phase 6
- Both: Phases 10-12 (features) → parallel
- Developer 1: Phase 13 (layouts)
- Both: Phases 14-15 (testing, optimization)

**3 Developers** (5-7 days):
- Developer 1: Phases 1-6 (infrastructure)
- Developer 2: Phases 7-9 (admin) → parallel after Phase 6
- Developer 3: Phases 10-12 (company/employee) → parallel after Phase 6
- All: Phase 13 (layouts integration)
- All: Phases 14-15 (testing, optimization)

### Dependencies

```
Phase 1 (Setup) →
  ├─ Phase 2 (Types) →
  │    └─ Phase 3 (API Client) →
  │         └─ Phase 4 (Query & Auth) →
  │              └─ Phase 5 (Routing) →
  │                   └─ Phase 6 (Components) →
  │                        ├─ Phase 7 (Admin Users) ──┐
  │                        ├─ Phase 8 (Admin Companies) ├─ PARALLEL
  │                        ├─ Phase 9 (Admin Modules) ──┤
  │                        ├─ Phase 10 (Company Employees) ├─ PARALLEL
  │                        ├─ Phase 11 (Permissions) ────┤
  │                        └─ Phase 12 (Simple Text) ────┘
  │                                  ↓
  │                        Phase 13 (Layouts) →
  │                                  ↓
  │                        Phase 14 (Testing) →
  │                                  ↓
  │                        Phase 15 (Optimization)
```

---

## Success Criteria

### Functional Requirements

- ✅ All 47 API endpoints integrated
- ✅ 3 role-based UIs working (ADMIN, COMPANY_OWNER, EMPLOYEE)
- ✅ JWT authentication with auto-refresh
- ✅ Login/register/logout flows complete
- ✅ Protected routes enforce authorization
- ✅ Multi-tenant data isolation (cannot see other companies)
- ✅ Permission-based UI rendering
- ✅ CRUD operations for:
  - Users (admin)
  - Companies (admin)
  - Modules (admin)
  - Employees (company owner)
  - Permissions (company owner)
  - Simple text (company owner + employee)

### Technical Requirements

- ✅ TypeScript strict mode (0 errors)
- ✅ ESLint (0 errors, 0 warnings)
- ✅ Test coverage >80%
- ✅ No console errors in production build
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility (WCAG 2.1 AA minimum)

### Performance Requirements

- ✅ Initial bundle <500KB gzipped
- ✅ Total bundle <2MB
- ✅ Lighthouse Performance score >90
- ✅ First Contentful Paint <1.5s
- ✅ Time to Interactive <3.5s
- ✅ Cumulative Layout Shift <0.1

### Security Requirements

- ✅ JWT tokens stored securely
- ✅ Auto-logout on token expiration
- ✅ CSRF protection implemented
- ✅ XSS prevention (React escaping)
- ✅ Input validation (Zod + backend)
- ✅ No sensitive data in client code
- ✅ HTTPS in production

---

## Next Steps

### Immediate Actions

1. **Generate Documentation**: This plan document ✅ (done)
2. **Team Review**: Review plan with development team
3. **Resource Allocation**: Assign developers to phases
4. **Timeline Confirmation**: Agree on delivery dates
5. **Kickoff Phase 1**: Execute project setup

### Phase 1 Execution

Once approved, start with:

```bash
# 1. Generate Nx React app
nx g @nx/react:application web --bundler=vite --routing=true

# 2. Install dependencies (see Phase 1 commands)
npm install <packages>

# 3. Configure Tailwind + shadcn/ui
npx tailwindcss init -p
npx shadcn-ui@latest init

# 4. Verify setup
nx serve web
# Should see React app at http://localhost:4200
```

### Continuous Integration

Setup GitHub Actions (or similar):

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: nx lint web
      - run: nx test web
      - run: nx build web
```

---

## Related Documentation

This implementation plan works with:

- **ARCHITECTURE.md** - Backend system architecture
- **API_ENDPOINTS.md** - Complete API reference (47 endpoints)
- **MODULE_DEVELOPMENT.md** - Backend module creation guide
- **IMPLEMENTATION_PATTERNS.md** - Backend code patterns
- **FRONTEND_IMPLEMENTATION_PLAN.md** (this document) - Frontend plan

### Quick Reference

**Backend Docs**:
- System architecture → ARCHITECTURE.md
- API endpoints → API_ENDPOINTS.md
- Backend patterns → IMPLEMENTATION_PATTERNS.md

**Frontend Docs**:
- Implementation plan → FRONTEND_IMPLEMENTATION_PLAN.md (this doc)
- Component library → shadcn/ui documentation
- State management → TanStack Query documentation

---

## Conclusion

This comprehensive plan provides:
- ✅ Clear phases with time estimates
- ✅ Complete file structure
- ✅ Code examples for critical components
- ✅ Testing strategy
- ✅ Security considerations
- ✅ Performance optimization
- ✅ Deployment guide

**Ready for implementation with clear success criteria and validation checkpoints for each phase.**

---

**Version**: 1.0
**Created**: January 2024
**Status**: Ready for Implementation
**Estimated Completion**: 13-17 days (1 developer) | 5-7 days (3 developers)
