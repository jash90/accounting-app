# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RBAC Multi-tenant SaaS Backend API with React Frontend built using NestJS and Nx monorepo architecture. Supports three user roles (ADMIN, COMPANY_OWNER, EMPLOYEE) with fine-grained permission management and modular business features.

**Tech Stack:**
- **Backend**: NestJS 11 + TypeORM + PostgreSQL + JWT + CASL
- **Frontend**: React 19 + Vite + React Router + TanStack Query + Tailwind CSS + shadcn/ui
- **Monorepo**: Nx 22 with workspace management
- **Testing**: Vitest (frontend) + Playwright (E2E) + Jest (backend)

## Common Commands

### Development Workflow

```bash
# Start both backend and frontend concurrently
npm run dev

# Start backend only (API on port 3000)
npm run serve

# Start frontend only (Web on port 4200)
npm run serve:web

# Database seeding with test data
npm run seed
# Creates: 1 admin, 2 companies with users, 3 modules with permissions
# Admin credentials: admin@system.com / Admin123!

# Build for production
npm run build      # Backend
npm run build:web  # Frontend
```

### Database Management

```bash
# Generate migration from entity changes
npm run migration:generate

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Testing

```bash
# Backend unit tests
npm test

# Frontend unit tests
npm run test:web

# E2E tests (Playwright)
npm run test:e2e
```

### Code Quality

```bash
# Lint backend
npm run lint

# Lint frontend
npm run lint:web
```

## Architecture

### Nx Monorepo Structure

```
workspace/
├── apps/
│   ├── api/              # NestJS backend application (port 3000)
│   └── api-e2e/          # Backend E2E tests
├── web/                  # React frontend application (port 4200)
├── web-e2e/              # Frontend E2E tests
└── libs/
    ├── auth/             # @accounting/auth - JWT authentication
    ├── rbac/             # @accounting/rbac - RBAC system
    ├── common/           # @accounting/common - Shared entities/enums
    └── modules/
        └── simple-text/  # Business module example
```

### Authorization Flow

**Request → JWT Guard → Role Check → Module Access → Permission Check**

1. **JwtAuthGuard** (`libs/auth`) - Validates JWT token, attaches user to request
2. **Module Access Guard** (`libs/rbac`) - Checks company has module enabled via `@RequireModule()`
3. **Permission Guard** (`libs/rbac`) - Validates user permissions via `@RequirePermission()`
4. **Owner/Admin Guard** (`libs/rbac`) - Restricts to COMPANY_OWNER or ADMIN via `@OwnerOrAdmin()`

### Multi-Tenant Data Isolation

All business data queries **must** filter by `companyId` to enforce tenant isolation. The user's company is available from the JWT payload via `@CurrentUser()` decorator.

### Adding New Business Modules

1. Create module in `libs/modules/[module-name]/`
2. Define entity extending base entity pattern with `companyId`
3. Register entity in `apps/api/typeorm.config.ts`
4. Create controllers with guards: `@RequireModule('module-name')` and `@RequirePermission()`
5. Add module entry to database via seeder or admin API
6. Grant module access to companies via admin endpoints

### Frontend Architecture

- **Routing**: React Router 7 with file-based routing pattern in `web/src/pages/`
- **State**: TanStack Query for server state, Context API for auth state
- **Forms**: React Hook Form with validation
- **UI**: shadcn/ui components with Radix UI + Tailwind CSS
- **API Client**: Axios with base config in `web/src/lib/api-client.ts`
- **Proxy**: Vite dev proxy forwards `/api` to backend on port 3000

## Path Aliases

TypeScript path aliases (from `tsconfig.base.json`):

- `@accounting/auth` → Authentication library
- `@accounting/rbac` → RBAC system
- `@accounting/common` → Shared entities and enums
- `@accounting/modules/*` → Business modules
- `@` → Frontend source root (`web/src/`)

## Environment Variables

Required in `.env` (see `.env.example`):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=accounting_db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:4200
```

## Key Implementation Patterns

### Backend: Creating Protected Endpoints

```typescript
@Controller('items')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('module-name')
export class ItemsController {
  @Get()
  @RequirePermission(Permission.READ)
  async findAll(@CurrentUser() user: User) {
    // Auto-filtered by user.companyId for tenant isolation
  }
}
```

### Frontend: Authenticated API Calls

```typescript
// Use TanStack Query with configured axios client
const { data } = useQuery({
  queryKey: ['items'],
  queryFn: () => apiClient.get('/api/items'),
});
```

### Database Entities

All business entities must:
- Include `companyId` column for multi-tenancy
- Use TypeORM decorators
- Be registered in `typeorm.config.ts`

## API Documentation

Swagger UI available at `http://localhost:3000/api/docs` when backend is running.

## Role Hierarchy

- **ADMIN**: System administrator, manages companies and modules (no business data access)
- **COMPANY_OWNER**: Company administrator, manages employees and module permissions
- **EMPLOYEE**: End user with assigned module permissions
