# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### Simplicity First

- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request.

### Goal-Driven Execution

- Transform tasks into verifiable goals with success criteria.
- For multi-step tasks, state a brief plan with verification steps.

## Build & Dev Commands

```bash
# Development (starts both API and web concurrently via portless)
bun dev

# Build
bun build          # API (webpack)
bun build:web      # Web (vite)

# Typecheck
npx tsc --noEmit -p apps/api/tsconfig.app.json     # backend
npx tsc --noEmit -p apps/web/tsconfig.app.json      # frontend (has ~5 pre-existing errors)

# Lint
npx nx run api:lint --quiet
npx nx run web:lint --quiet
bun run lint:fix                                      # auto-fix all

# Test
bun test                  # backend unit tests (Bun runner)
bun run test:web          # frontend tests (Vitest)
bun run test:e2e          # Playwright E2E
bun run test:integration  # integration tests (30s timeout)

# Database
bun run migration:generate -- apps/api/src/migrations/XXXX-Name
bun run migration:run
bun run migration:revert
bun run seed              # base seed (admin + company owner + employee)
bun run seed:demo         # demo data (idempotent, runs after seed)

# Production
bun start                 # node dist/apps/api/main.js
bun run db:migrate:prod   # compile + run migrations for prod
```

### Portless (local dev routing)

`bun dev` runs both API and web through [portless](https://github.com/nicolo-ribaudo/portless), which replaces random ports with stable `.localhost` URLs:

| Service | URL                                    |
| ------- | -------------------------------------- |
| API     | `http://api.accounting.localhost:1355` |
| Web     | `http://web.accounting.localhost:1355` |

Vite's proxy config (`apps/web/vite.config.ts`) forwards `/api` and `/socket.io` to the API portless URL. This means the frontend never uses `localhost:3000` directly.

**Setup** (one-time, global install):

```bash
npm install -g portless
portless proxy start          # start daemon on port 1355
portless trust                # optional: add CA to system trust store for HTTPS
portless hosts sync           # optional: fix Safari .localhost resolution
```

**If portless proxy is not running**, `bun dev` will fail to route requests. Start it with `portless proxy start`.

**If you need to change the API URL** (e.g. pointing to a remote backend), set `API_URL` env var before running `bun dev` — Vite's proxy uses `process.env.API_URL` as fallback.

## Architecture

Nx monorepo with Bun as package manager. Three apps, shared libs.

### Apps

| App            | Stack                            | Portless URL                    | Notes                                               |
| -------------- | -------------------------------- | ------------------------------- | --------------------------------------------------- |
| `apps/api`     | NestJS 11 + TypeORM + PostgreSQL | `api.accounting.localhost:1355` | REST API, WebSockets, Swagger on `/docs` (non-prod) |
| `apps/web`     | React 19 + Vite + TanStack Query | `web.accounting.localhost:1355` | SPA, Vite proxies `/api` and `/socket.io` to API    |
| `apps/landing` | Astro                            | —                               | Separate Bun project, independent build             |

### Libs (import paths)

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

### Multi-Tenancy

All business entities have `companyId`. Backend resolves it via `SystemCompanyService.getCompanyIdForUser(user)` — this is the only correct way.

### Auth Flow

JWT Bearer tokens. Guards: `JwtAuthGuard` (global, skip with `@Public()`), `RolesGuard`, `ThrottlerGuard` (100 req/60s, disable in dev via `DISABLE_THROTTLER`).

## Key Patterns

### Backend

- **Pagination**: Services use `getManyAndCount()` + `new PaginatedResponseDto(data, total, page, limit)`. Controllers return `PaginatedResponseDto<T>`.
- **Soft deletes**: Methods named `softDelete*` (not `remove` or `delete`).
- **LIKE safety**: `escapeLikePattern()` from `@accounting/common` for all ILIKE queries.
- **FK violations**: `isForeignKeyViolation()` from `@accounting/common` — cross-DB detection, never raw error codes.
- **Date range filters**: `applyDateRangeFilter()` and `resolvePresetDateRange()` from `@accounting/common/backend`.
- **CSV parsing**: `parseCsvLine()` from `@accounting/common`.
- **Logging**: `sanitizeForLog()` from `@accounting/common/backend`.
- **Swagger CSV**: `@ApiCsvResponse()` decorator from `@accounting/common`.
- **JWT config reuse**: `createJwtModuleConfig()` from `@accounting/auth`.
- **Pagination math**: `calculatePagination()` from `@accounting/common/backend`.
- **TypeORM `orderBy` alias bug**: Never use `.orderBy('aliasName', 'DESC')` with `.addSelect('COUNT(*)', 'aliasName')`. PostgreSQL lowercases unquoted identifiers but TypeORM quotes them. Use `.orderBy('COUNT(*)', 'DESC')` directly.

### Frontend

- **API responses**: `PaginatedResponse<T>` has `{ data: T[], meta: PaginationMeta }`. Access items via `data.data`, total via `data.meta.total`.
- **Query hooks**: `createQueryHook`, `createMutationHook`, `createExportHook` factories in `apps/web/src/lib/hooks/`. Skip `createMutationHook` for hooks with `onMutate` (optimistic updates). Factory supports `successMessageFn` and `errorTitle`.
- **Resource keys**: `createResourceKeys(prefix)` in `query-client.ts` for React Query cache keys.
- **Status badges**: `createStatusBadge` factory in `components/common/status-badge.tsx`.
- **CRUD dialogs**: `useCrudDialogs<T>` hook for stable dialog state callbacks.
- **Error messages**: `getApiErrorMessage(error, fallback)` from `query-filters.ts`.
- **Query filters**: `buildQueryFilters(filters)` from `query-filters.ts`.
- **Blob exports**: `createBlobExport<TFilters>(url)` from `crud-factory.ts`.
- **Cache tiers**: `CACHE_TIERS` from `cache-config.ts` — `{frequent, standard, stable}`.
- **Role checks**: `isOwnerOrAdmin(user?)` from `utils/user.ts`.
- **Search inputs**: `useDeferredValue` + `useEffect` pattern (see `offers-list.tsx`).
- **Form types**: Use DTO types for mutation args, not Zod-inferred types (Zod enum literals don't match backend enums).
- **Enum schemas**: Use `z.nativeEnum()` for all enum fields in Zod schemas.

### Lint-staged

Husky + lint-staged runs ESLint `--fix` and Prettier on commit. If pre-commit fails, fix the issue and create a NEW commit (don't amend).

## Known Issues

- `bun test` has ~137 pre-existing failures (Playwright conflicts, RBAC service tests).
- Frontend typecheck has ~5 pre-existing type errors.
- NX serve + webpack: `dist/apps/api/main.js` hot-reload may not auto-trigger on `libs/` changes.
