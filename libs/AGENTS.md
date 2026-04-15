<!-- Scope: Shared library rules — exports, cross-module boundaries, isomorphic code -->
<!-- Source: Architecture and ISP/DIP sections from CLAUDE.md and .claude/rules/ -->

# Shared Libraries Rules

Rules for all code under `libs/`.

## Export Boundaries (Interface Segregation)

Never force consumers to import what they don't need.

| Export Path                  | Audience         | Contents                                                            |
| ---------------------------- | ---------------- | ------------------------------------------------------------------- |
| `@accounting/common`         | All (isomorphic) | Enums, entities, DTOs, types, shared utilities                      |
| `@accounting/common/backend` | Node-only        | EncryptionService, TypeORM utils, PDF bootstrap, date range filters |
| `@accounting/common/browser` | Browser-only     | Browser-specific exports                                            |

- Never put Node-only code in the isomorphic export.
- Never put browser-only code in the isomorphic export.

## Feature Modules (`libs/modules/*`)

- Every module is self-contained. Adding a module must not require editing other modules (OCP).
- Modules expose a public API via their index barrel file. Never import from a module's internal file paths.

## Shared Utilities — Canonical Locations

When a utility already exists in `@accounting/common`, always use it. Never create local copies.

| Utility                    | Path             | Notes                                                             |
| -------------------------- | ---------------- | ----------------------------------------------------------------- |
| `escapeLikePattern()`      | `common`         | For all ILIKE queries                                             |
| `isForeignKeyViolation()`  | `common`         | Cross-DB FK error detection                                       |
| `parseCsvLine()`           | `common`         | RFC 4180 CSV parsing                                              |
| `getErrorMessage()`        | `common`         | Replaces `error instanceof Error ? error.message : String(error)` |
| `sanitizeForLog()`         | `common/backend` | Structured logging field picker                                   |
| `applyDateRangeFilter()`   | `common/backend` | TypeORM date range query builder                                  |
| `resolvePresetDateRange()` | `common/backend` | Preset date ranges (30d, 90d, 365d)                               |
| `calculatePagination()`    | `common/backend` | Pagination math                                                   |
| `ensurePdfmakeFonts()`     | `common/backend` | PDF generation bootstrap                                          |
| `@ApiCsvResponse()`        | `common`         | Swagger CSV endpoint decorator                                    |
| `PeriodFilterDto`          | `common`         | Shared start/end date DTO                                         |
| `EmployeeRankingItemDto`   | `common`         | Shared ranking DTOs                                               |

## Auth Library (`libs/auth`)

- Always use `createJwtModuleConfig()` for JWT module registration.
- Guards: `@Public()` to skip auth, `@Roles()` for role checks, `@CurrentUser()` for user extraction.

## RBAC Library (`libs/rbac`)

- Always use `@RequireModule()` and `@RequirePermission()` decorators.
- Never implement custom permission checking logic outside this library.

## Infrastructure (`libs/infrastructure/*`)

- Storage abstracts S3 vs local filesystem. Services must depend on the storage interface, never the S3 SDK directly (DIP).
- Email provides configuration — the actual transport (SMTP, SES) is injected, never hardcoded (DIP).

## Adding New Utilities

Before creating a new utility:

1. Check if it already exists in `@accounting/common` or `@accounting/common/backend`.
2. If it's domain-specific, put it in the relevant feature module.
3. If it's genuinely shared across 2+ modules, add it to `@accounting/common`.
4. Never add utilities speculatively. Wait for the second consumer.
