# AGENTS.md

<!-- Scope: Global project rules — behavioral guidelines, SOLID principles, architecture, commands -->
<!-- Source: Consolidated from CLAUDE.md, .claude/rules/solid-*.md, and existing AGENTS.md -->

Universal agent instructions for this repository. All AI coding agents must follow these rules.

## Behavioral Guidelines

These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Never "improve" adjacent code, comments, or formatting.
- Never refactor things that aren't broken.
- Always match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Never remove pre-existing dead code unless asked.

The test: every changed line must trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## SOLID Principles

All new and modified code must follow SOLID. When SOLID conflicts with simplicity, simplicity wins for single-use code — SOLID wins for shared/reusable code.

- **S — Single Responsibility**: One class/component = one reason to change. Services handle one domain, controllers handle HTTP only, components render UI only. But don't split prematurely: small cohesive classes stay in one file.
- **O — Open-Closed**: Extend via new modules, factory calls, event listeners — not by editing working code. Never introduce extension points before a second use case exists.
- **L — Liskov Substitution**: Subtypes must be drop-in replacements. Extended DTOs honor base validations, factory-generated hooks return consistent shapes. If overriding changes a contract, stop and state the assumption.
- **I — Interface Segregation**: Small, focused interfaces. Separate Create/Update DTOs, granular hooks (`useTaskFilters` vs `useTaskList`), split lib exports (`common` vs `common/backend`). Never add optional props "just in case."
- **D — Dependency Inversion**: Always use DI (not `new`), `ConfigService` (not `process.env`), API hooks (not raw `fetch`), `appStorage` (not `localStorage`). Never create interfaces for every class — NestJS DI already provides inversion.

## Project Context

**Type**: RBAC Multi-tenant SaaS Platform
**Backend**: NestJS 11 + TypeORM + PostgreSQL
**Frontend**: React 19 + Vite + TanStack Query + shadcn/ui
**Monorepo**: Nx 22
**Testing**: Bun Test + Playwright

## Critical Architecture Constraints

### Multi-Tenancy (MANDATORY)

All business data **MUST** be isolated by `companyId`. Every business entity and query requires:

```typescript
// Entity pattern - ALWAYS include companyId
@Entity()
export class BusinessEntity {
  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;
}

// Service pattern - ALWAYS filter by companyId
async findAll(user: User): Promise<Entity[]> {
  return this.repository.find({
    where: { companyId: user.companyId },
  });
}
```

### Authorization Guards (Required Order)

`JwtAuthGuard` is registered globally via `APP_GUARD` — it runs on **all** endpoints automatically. Do **not** include it in `@UseGuards()`. Controllers only need the module-level guards:

```typescript
@Controller('items')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('module-slug')
export class ItemsController {
  @Get()
  @RequirePermission(Permission.READ)
  async findAll(@CurrentUser() user: User) {}
}
```

Some older controllers explicitly include `JwtAuthGuard` — this is harmless but redundant.

### System Admin Company Pattern

ADMIN users access data via a special "System Admin Company". **Always use `SystemCompanyService.getCompanyIdForUser(user)`** — never inline the resolution logic.

```typescript
// ✅ CORRECT — always use SystemCompanyService
constructor(private readonly systemCompanyService: SystemCompanyService) {}

async findAll(user: User): Promise<Entity[]> {
  const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
  return this.repository.find({ where: { companyId } });
}

// ❌ WRONG — never inline this logic
async findAll(user: User): Promise<Entity[]> {
  if (user.role === UserRole.ADMIN) {
    const systemCompany = await this.companyRepository.findOneOrFail(...);
    // ...
  }
  return this.repository.find({ where: { companyId: user.companyId } });
}
```

Import: `import { SystemCompanyService } from '@accounting/common/backend';`

## Common Commands

```bash
# Development
bun run dev              # Start backend + frontend
bun run serve            # Backend only (port 3000)
bun run serve:web        # Frontend only (port 4200)
bun run seed             # Seed test data

# Testing
bun test                 # Backend tests
bun run test:web         # Frontend tests
bun run test:e2e         # Playwright E2E
bun run test:integration # Integration tests

# Database
bun run migration:generate  # Generate from entity changes
bun run migration:run       # Run pending migrations
bun run migration:revert    # Revert last migration

# Quality
bun run lint             # Lint backend
bun run lint:web         # Lint frontend
```

## Test Credentials

| Role     | Email               | Password          |
| -------- | ------------------- | ----------------- |
| Admin    | `admin@system.com`  | `Admin123456!`    |
| Owner    | `owner@acme.com`    | `Owner123456!`    |
| Employee | `employee@acme.com` | `Employee123456!` |

## Apps & Libs

| App            | Stack                            | Notes                                               |
| -------------- | -------------------------------- | --------------------------------------------------- |
| `apps/api`     | NestJS 11 + TypeORM + PostgreSQL | REST API, WebSockets, Swagger on `/docs` (non-prod) |
| `apps/web`     | React 19 + Vite + TanStack Query | SPA, Vite proxies `/api` and `/socket.io` to API    |
| `apps/landing` | Astro                            | Separate Bun project, independent build             |

| Path                           | Purpose                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `@accounting/common`           | Shared enums, entities, DTOs, types (isomorphic)                                                                      |
| `@accounting/common/backend`   | Node-only: EncryptionService, TypeORM utils, PDF bootstrap                                                            |
| `@accounting/common/browser`   | Browser-only exports                                                                                                  |
| `@accounting/auth`             | JWT auth module, guards, decorators (@Public, @Roles, @CurrentUser)                                                   |
| `@accounting/rbac`             | RBAC module, permission guards (@RequireModule, @RequirePermission, @OwnerOrAdmin)                                    |
| `@accounting/email`            | Email config and providers                                                                                            |
| `@accounting/infrastructure/*` | email, storage (S3/local), change-log                                                                                 |
| `@accounting/modules/*`        | Feature modules: ai-agent, clients, documents, email-client, notifications, offers, settlements, tasks, time-tracking |

Frontend uses `@/*` alias mapped to `apps/web/src/*`.

## Path Aliases

```typescript
// Backend

// Frontend (all use @/* alias mapped to apps/web/src/*)
import { apiClient } from '@/lib/api-client';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { Company, User } from '@accounting/common';
import { TasksModule } from '@accounting/modules/tasks';
import { RequireModule, RequirePermission } from '@accounting/rbac';

import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
```

## Module Structure

### Backend Module (`libs/modules/[name]/`)

```
libs/modules/[name]/
├── src/
│   ├── index.ts              # Barrel exports
│   └── lib/
│       ├── [name].module.ts  # NestJS module
│       ├── controllers/      # REST endpoints
│       ├── services/         # Business logic
│       ├── dto/              # Request/response DTOs
│       └── exceptions/       # Custom exceptions
```

### Frontend Module (`apps/web/src/pages/modules/[name]/`)

```
apps/web/src/
├── pages/modules/[name]/         # Page components (routed views)
├── components/
│   ├── [name]/                   # Module-specific components (clients/, tasks/, offers/, etc.)
│   ├── modules/ai-agent/         # AI agent components (only module in modules/ subdir)
│   ├── common/                   # Shared components (status-badge, data-table, etc.)
│   ├── forms/                    # Reusable form components
│   ├── layouts/                  # Layout components (sidebar, header)
│   ├── ui/                       # shadcn/ui primitives
│   └── template-editor/          # Document template editor
├── lib/
│   ├── api/endpoints/            # API client functions
│   ├── hooks/                    # React Query hooks
│   └── validation/schemas.ts     # Zod schemas
└── types/dtos.ts                 # TypeScript DTOs
```

## Key Patterns

### Backend DTO Pattern

```typescript
// create-item.dto.ts
export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Item name' })
  name!: string;
}

// item-response.dto.ts
export class ItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() companyId!: string;
}
```

### Frontend React Query Pattern

```typescript
// use-items.ts
export function useItems() {
  return useQuery({
    queryKey: queryKeys.items.all,
    queryFn: itemsApi.getAll,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}
```

### Permission-Based UI

```typescript
const { hasPermission } = useModulePermissions('module-slug');

return (
  <>
    {hasPermission(Permission.READ) && <ViewButton />}
    {hasPermission(Permission.WRITE) && <EditButton />}
    {hasPermission(Permission.DELETE) && <DeleteButton />}
  </>
);
```

## Role Hierarchy

| Role              | Access Scope                     | Business Data                  |
| ----------------- | -------------------------------- | ------------------------------ |
| **ADMIN**         | System-wide (companies, modules) | Via System Admin Company only  |
| **COMPANY_OWNER** | Own company + employees          | Full access to enabled modules |
| **EMPLOYEE**      | Granted permissions only         | Filtered by companyId          |

## API Structure

```
GET  /                    # Health check
GET  /api/docs            # Swagger UI

POST /auth/login          # Public
POST /auth/refresh        # Public
POST /auth/register       # Public

/admin/*                  # ADMIN role only
/company/*                # COMPANY_OWNER role
/modules/*                # Permission-based
```

## File Registration Checklist

When creating new entities:

1. Define entity in `libs/common/src/lib/entities/`
2. Export from `libs/common/src/index.ts`
3. Register in `apps/api/typeorm.config.ts`
4. Add to module's `TypeOrmModule.forFeature([])`
5. Generate migration: `bun run migration:generate`
6. Run migration: `bun run migration:run`

## AI Provider Integration

The project uses an abstraction layer for AI providers:

```typescript
// libs/modules/ai-agent/src/lib/services/
export abstract class AIProviderService {
  abstract sendMessage(config: AIConfiguration, messages: AIMessage[]): Promise<AIResponse>;
}

// Implementations
export class OpenAIProviderService extends AIProviderService {}
export class OpenRouterProviderService extends AIProviderService {}
```

## Common Mistakes to Avoid

1. **Missing companyId filter** - Always filter business data by `companyId`
2. **Wrong guard order** - Must be: JwtAuthGuard → ModuleAccessGuard → PermissionGuard
3. **Missing entity registration** - Register in both `typeorm.config.ts` AND module
4. **Forgetting migrations** - Always generate after entity changes
5. **ADMIN data access** - Always use `SystemCompanyService.getCompanyIdForUser(user)` — never use `user.companyId` directly for multi-tenant queries
6. **Non-null assertions** - Use `!` in entities for TypeORM columns

### Entities Exempt from `companyId`

The following entities intentionally lack a `companyId` column — they are scoped via their parent entity's foreign key:

| Entity                                                        | Reason                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| `TaskDependency`                                              | Join table: scoped by parent task's `companyId`            |
| `TaskComment`                                                 | Scoped by parent task's `companyId` via query join         |
| `TaskLabelAssignment`                                         | Join table: scoped by parent task's `companyId`            |
| `ClientIconAssignment`                                        | Join table: scoped by parent client's `companyId`          |
| `UserModulePermission`                                        | User-scoped: filtered by user's `companyId` at query level |
| `AIConfiguration`, `AIContext`, `AIConversation`, `AIMessage` | System-level: managed via `SystemCompanyService`           |
| `TokenUsage`, `TokenLimit`                                    | System-level: not company-scoped                           |
| `ChangeLog`                                                   | System-level audit: filtered by entity context             |

When creating new entities, default to including `companyId`. Only omit it for system-level or pure join tables, and document the exception here.

### Legitimate `user.companyId` Usages (Non-Multi-Tenant)

The following patterns are **acceptable** uses of `user.companyId` — they are **not** multi-tenant data resolution:

| Pattern                                                   | Location                                                                                                | Reason                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Defensive guard: `user.role !== ADMIN && !user.companyId` | `ai-conversation.service.ts`, `token-usage.service.ts`                                                  | Fast-fail validation before `getCompanyIdForUser` call — not data access |
| API controller pass-through: `user.companyId!`            | `email-config.controller.ts`, `company.controller.ts`, `modules.controller.ts`                          | Guard-validated endpoints where user is guaranteed to have companyId     |
| SQL column reference: `user.companyId = :companyId`       | `notification-settings.service.ts`, `client-changelog-email.service.ts`, `task-notification.service.ts` | SQL string referencing DB column, not TS property                        |

## Auth Flow

JWT Bearer tokens. `JwtAuthGuard` is registered globally via `APP_GUARD` — all endpoints require auth unless marked `@Public()`. Additional guards: `RolesGuard`, `ThrottlerGuard` (100 req/60s, disable in dev via `DISABLE_THROTTLER`).

## Key Patterns (Backend)

- **Multi-tenancy**: Use `SystemCompanyService.getCompanyIdForUser(user)` — the only correct way to resolve companyId.
- **Pagination**: `getManyAndCount()` + `new PaginatedResponseDto(data, total, page, limit)`.
- **Soft deletes**: Methods named `softDelete*` (not `remove` or `delete`).
- **LIKE safety**: `escapeLikePattern()` from `@accounting/common` for all ILIKE queries.
- **FK violations**: `isForeignKeyViolation()` from `@accounting/common` — never raw error codes.
- **Date range filters**: `applyDateRangeFilter()` and `resolvePresetDateRange()` from `@accounting/common/backend`.
- **CSV parsing**: `parseCsvLine()` from `@accounting/common`.
- **Logging**: `sanitizeForLog()` from `@accounting/common/backend`.
- **Swagger CSV**: `@ApiCsvResponse()` decorator from `@accounting/common`.
- **JWT config reuse**: `createJwtModuleConfig()` from `@accounting/auth`.
- **Pagination math**: `calculatePagination()` from `@accounting/common/backend`.
- **TypeORM `orderBy` alias bug**: Never use `.orderBy('aliasName', 'DESC')` with `.addSelect('COUNT(*)', 'aliasName')`. Use `.orderBy('COUNT(*)', 'DESC')` directly.

## Key Patterns (Frontend)

- **API responses**: `PaginatedResponse<T>` has `{ data: T[], meta: PaginationMeta }`. Access via `data.data`, total via `data.meta.total`.
- **Query hooks**: `createQueryHook`, `createMutationHook`, `createExportHook` factories in `apps/web/src/lib/hooks/`. Skip `createMutationHook` for hooks with `onMutate` (optimistic updates).
- **Blob exports**: `createBlobExport<TFilters>(url)` from `crud-factory.ts`.
- **Search inputs**: `useDeferredValue` + `useEffect` pattern (see `offers-list.tsx`).
- **Resource keys**: `createResourceKeys(prefix)` in `query-client.ts`.
- **Status badges**: `createStatusBadge` factory in `components/common/status-badge.tsx`.
- **CRUD dialogs**: `useCrudDialogs<T>` hook.
- **Error messages**: `getApiErrorMessage(error, fallback)` from `query-filters.ts`.
- **Query filters**: `buildQueryFilters(filters)` from `query-filters.ts`.
- **Cache tiers**: `CACHE_TIERS` from `cache-config.ts` — `{frequent, standard, stable}`.
- **Role checks**: `isOwnerOrAdmin(user?)` from `utils/user.ts`.
- **Form types**: Use DTO types for mutation args, not Zod-inferred types.
- **Enum schemas**: Use `z.nativeEnum()` for all enum fields in Zod schemas.

## Lint-staged

Husky + lint-staged runs ESLint `--fix` and Prettier on commit. If pre-commit fails, fix the issue and create a NEW commit (don't amend).

## Documentation References

| Document                     | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `docs/ARCHITECTURE_GUIDE.md` | System design, entity relationships             |
| `docs/module-development/`   | Complete module creation tutorial (split guide) |
| `docs/API_DOCUMENTATION.md`  | Backend API reference                           |
| `docs/FRONTEND_GUIDE.md`     | React patterns, components                      |
| `docs/DESIGN_SYSTEM.md`      | UI components, styling                          |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
