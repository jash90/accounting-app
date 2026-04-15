<!-- Scope: Frontend rules — React 19, Vite, TanStack Query, Zod patterns -->
<!-- Source: Frontend sections from CLAUDE.md and .claude/rules/solid-*.md -->

# Frontend Rules

Rules for all code under `apps/web/`.

## Import Alias

Use `@/*` mapped to `apps/web/src/*`. Never use relative paths that escape `src/`.

## Component Organization

Module-specific components live in `components/[module-name]/`. Both patterns below are acceptable — just be consistent within a module.

```
apps/web/src/components/
├── clients/         # Client module components
├── tasks/           # Task module components
├── offers/          # Offer module components
├── time-tracking/   # Time tracking module components
├── email/           # Email-client module components (flat structure)
├── notifications/   # Notification module components
├── modules/ai-agent/# AI agent components (historical exception)
├── dashboard/       # Cross-module dashboard components (charts, KPIs)
├── sidebar/         # Layout sidebar components
├── common/          # Shared components (status-badge, data-table, etc.)
├── forms/           # Reusable form components
├── template-editor/ # Document template editor
├── layouts/         # Layout components (sidebar, header)
├── theme/           # Theme components
└── ui/              # shadcn/ui primitives
```

Modules without a dedicated component directory (e.g. settlements, documents) embed components directly in their page files under `pages/modules/[name]/`.

## API Layer (Dependency Inversion)

Always follow the 3-layer pattern. Never skip layers.

```
Component → Hook → API function → HTTP client (apiClient)
```

- Components never call `fetch` or `axios` directly.
- Hooks never construct URLs — API functions own the URL.
- `appStorage` abstracts localStorage (web) vs Capacitor Preferences (native). Never use `localStorage` directly.

## Hook Factories — Always Prefer Over Manual Hooks

| Factory              | Location                            | Use For                                                                     |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `createQueryHook`    | `lib/hooks/create-query-hook.ts`    | Simple `useQuery` wrappers                                                  |
| `createMutationHook` | `lib/hooks/create-mutation-hook.ts` | Mutations without `onMutate`. Supports `successMessageFn` and `errorTitle`. |
| `createExportHook`   | `lib/hooks/create-export-hook.ts`   | CSV export hooks                                                            |

- Skip `createMutationHook` only for hooks with `onMutate` (optimistic updates).
- Every factory-generated hook must return a consistent shape (LSP).

## Query Patterns

- **Resource keys:** Always use `createResourceKeys(prefix)` from `query-client.ts`.
- **Cache tiers:** Always use `CACHE_TIERS` from `cache-config.ts` — `{frequent, standard, stable}`.
- **Query filters:** Always use `buildQueryFilters(filters)` from `query-filters.ts`.
- **Error messages:** Always use `getApiErrorMessage(error, fallback)` from `query-filters.ts`.
- **Blob exports:** Always use `createBlobExport<TFilters>(url)` from `crud-factory.ts`.

## API Response Shape

`PaginatedResponse<T>` has `{ data: T[], meta: PaginationMeta }`.

- Access items via `response.data`.
- Access total via `response.meta.total`.
- Never assume `response.total` exists at the top level.

## Component Patterns

- **Components render UI only.** Extract data fetching into hooks, business logic into utils (SRP).
- **Props must be focused.** A display-only component must not accept edit/delete callbacks (ISP). Make a separate editable variant.
- **Status badges:** Always use `createStatusBadge` factory from `components/common/status-badge.tsx`.
- **CRUD dialogs:** Always use `useCrudDialogs<T>` hook for stable dialog state callbacks.
- **Role checks:** Always use `isOwnerOrAdmin(user?)` from `utils/user.ts`.
- **Search inputs:** Always use `useDeferredValue` + `useEffect` pattern (see `offers-list.tsx`).

## Hook Granularity (Interface Segregation)

- `useTaskFilters` for filter state.
- `useTaskList` for data fetching.
- `useTaskMutations` for mutations.
- Never bundle unrelated concerns into a single hook.

## Forms & Validation

- Always use DTO types for mutation arguments. Never use Zod-inferred types (Zod enum literals like `"WEBSITE"` don't match backend enum types like `LeadSource`).
- Always use `z.nativeEnum()` for enum fields in Zod schemas.

## Composition Over Conditionals

- Prefer adding a new route/page component over adding boolean props to existing components (OCP).
- Prefer hook factories with new config over editing existing factories.

## Legitimate Frontend Exceptions

### Legitimate Direct `fetch()` Usage

The following direct `fetch()` calls bypass `apiClient` because they use streaming APIs:

| Location                                | Reason                                |
| --------------------------------------- | ------------------------------------- |
| `use-email-client.ts` (AI reply stream) | Server-Sent Events streaming endpoint |
| `ai-agent.ts` (AI conversation stream)  | Server-Sent Events streaming endpoint |

Never use direct `fetch()` for standard REST endpoints. Always go through `apiClient`.

### Legitimate Direct `localStorage` Usage

| Location                          | Reason                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/auth/token-storage.ts`       | This IS the storage abstraction layer for auth tokens — it stores only an auth flag, never actual JWTs |
| `contexts/navigation-context.tsx` | Navigation state persistence (sidebar collapsed, etc.)                                                 |
| `contexts/theme-context.tsx`      | Theme preference persistence                                                                           |

All other code must use `appStorage` (which abstracts localStorage vs Capacitor Preferences).

## Context

- Split contexts by concern. Never combine unrelated state (theme + auth) in one context (ISP).
