<!-- Scope: Backend API rules — NestJS, TypeORM, PostgreSQL patterns -->
<!-- Source: Backend sections from CLAUDE.md and .claude/rules/solid-*.md -->

# Backend API Rules

Rules for all code under `apps/api/` and `libs/`.

## Module Structure

- Every feature module lives in `libs/modules/<name>/`.
- Adding a new module must not require editing existing modules (OCP).
- Module exports must be focused: `@accounting/common` (isomorphic), `@accounting/common/backend` (Node-only).

## Service Patterns

- **One domain per service.** `TasksService` handles tasks. Export/stats services are separate (e.g. `TimeTrackingExportService`).
- **Controllers handle HTTP only.** Parse input, call service, return response. Never put business logic in controllers.
- **Pagination:** Always use `getManyAndCount()` + `new PaginatedResponseDto(data, total, page, limit)`. Controllers return `PaginatedResponseDto<T>`.
- **Soft deletes:** Always name methods `softDelete*`. Never `remove` or `delete`.
- **Pagination math:** Always use `calculatePagination()` from `@accounting/common/backend`.

## Query Safety

- **ILIKE queries:** Always use `escapeLikePattern()` from `@accounting/common`.
- **FK violations:** Always use `isForeignKeyViolation()` from `@accounting/common`. Never match raw error codes.
- **Date range filters:** Always use `applyDateRangeFilter()` and `resolvePresetDateRange()` from `@accounting/common/backend`.
- **TypeORM `orderBy` alias bug:** Never use `.orderBy('aliasName', 'DESC')` with `.addSelect('COUNT(*)', 'aliasName')`. PostgreSQL lowercases unquoted identifiers but TypeORM quotes them. Always use `.orderBy('COUNT(*)', 'DESC')` directly.

## DTOs

- Separate `CreateDto` and `UpdateDto` for every entity. Never reuse one for both.
- Separate filter DTOs for listing vs export (e.g. `TaskFiltersDto` vs `TaskExportFiltersDto`).
- Use `PeriodFilterDto` from `@accounting/common` for shared date range filtering.

## Dependency Injection

- Always use constructor injection or `@Inject()`. Never `new ServiceName()`.
- Always use `ConfigService.get()` for environment variables in services. Never `process.env` in services.
- Always use `@InjectRepository(Entity)` for database access. Never raw SQL.
- Always use `createJwtModuleConfig()` from `@accounting/auth` for JWT setup.

### Legitimate `process.env` Uses

The following `process.env` usages are acceptable because they run outside the DI container:

| Location                                       | Reason                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `main.ts`                                      | Bootstrap — runs before DI container is ready                                                                        |
| `app.module.ts`                                | `TypeOrmModule.forRootAsync` factory — uses `ConfigService` where possible, but some pool defaults use `process.env` |
| `typeorm.config.ts` / `typeorm.prod.config.ts` | CLI migration tool — no DI available                                                                                 |
| `env.validator.ts`                             | Validates env vars before DI starts                                                                                  |
| `instrument.ts`                                | Sentry init — runs before DI                                                                                         |
| Gateway CORS (`@WebSocketGateway`)             | Can't inject `ConfigService` into decorator options                                                                  |
| `encryption.service.ts`                        | Reads `ENCRYPTION_KEY` at init time                                                                                  |
| `EMAIL_REJECT_UNAUTHORIZED`                    | Centralized in `@accounting/email` — module-scope constant for TLS config                                            |
| `auth.controller.ts` (`process.env.NODE_ENV`)  | Cookie security options — read at response time for secure flag configuration                                        |

- All business entities must have `companyId`.
- Always resolve via `SystemCompanyService.getCompanyIdForUser(user)`. Never inline the resolution logic.

## Guards & Auth

- `JwtAuthGuard` is global (registered via `APP_GUARD`). Do not include it in `@UseGuards()` — it runs automatically on all endpoints.
- Skip auth on public endpoints with `@Public()`.
- Use `@RequirePermission()` and `@RequireModule()` for authorization.
- Custom guards extending `AuthGuard` must still perform authentication (LSP).

## Utilities — Always Use Shared Versions

| Utility                    | Import From                  |
| -------------------------- | ---------------------------- |
| `escapeLikePattern()`      | `@accounting/common`         |
| `isForeignKeyViolation()`  | `@accounting/common`         |
| `parseCsvLine()`           | `@accounting/common`         |
| `sanitizeForLog()`         | `@accounting/common/backend` |
| `applyDateRangeFilter()`   | `@accounting/common/backend` |
| `resolvePresetDateRange()` | `@accounting/common/backend` |
| `calculatePagination()`    | `@accounting/common/backend` |
| `@ApiCsvResponse()`        | `@accounting/common`         |
| `createJwtModuleConfig()`  | `@accounting/auth`           |

## Logging

- Always use `sanitizeForLog()` for structured logging. Never log raw entities with sensitive fields.

## Swagger

- Always use `@ApiCsvResponse()` decorator for CSV endpoints.
- Swagger UI is guarded: only enabled when `NODE_ENV !== 'production'`.

## Delete Decision Tree

1. **Main business entity** (Client, Offer, Settlement, Document, Task, Conversation, Template)? → **Soft delete** (`softDelete*` methods)
2. **Join table / assignment** (TaskLabelAssignment, ClientIconAssignment, UserModulePermission)? → **Hard delete** is OK (`.delete()` or `.remove()`)
3. **Sub-entity cascading from parent** (TaskComment, TaskDependency, NotificationSettings)? → Match parent's delete strategy
4. When in doubt, default to soft delete.

Never name soft-delete methods `remove` or `delete` — always use `softDelete*` prefix.

## Controller Size Guideline

Controllers should stay under **300 lines**. If a controller grows larger:

1. Extract business logic into a dedicated service (controllers handle HTTP only).
2. Split by sub-resource into separate controllers (e.g. `task-comments.controller.ts` vs `tasks.controller.ts`).

Current known large controllers to consider refactoring:

- `icons.controller.ts` (615 lines)
- `settlements.controller.ts` (542 lines)
- `ai-conversation.controller.ts` (490 lines)
- `offers.controller.ts` (429 lines)

## Events

- Prefer `@OnEvent('domain.action')` for cross-module communication. The emitter must not know about listeners (OCP).
