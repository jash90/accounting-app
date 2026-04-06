# 🔧 Fix Plan — Code Review Issues

**Based on**: `docs/CODE_REVIEW.md` (2026-04-03)
**Total issues**: 12 (3 critical, 5 important, 4 minor)
**Estimated effort**: ~5-6 working days

---

## Phase 1 — 🔴 CRITICAL Security Fixes (Day 1–2)

### FIX-01: Git Secret Audit & Rotation

**Issue**: Secrets may have leaked into git history
**Risk**: Encryption keys and passwords exposed in VCS
**Effort**: ~2h

#### Steps

1. **Audit git history for leaked secrets**:

   ```bash
   # Check if .env or .encryption-key.dev were ever committed
   git log --all --diff-filter=A -- '.env' '.encryption-key.dev'
   git log --all -p -- '.env' '.encryption-key.dev' | grep -i "ENCRYPTION_KEY\|ENCRYPTION_SECRET\|PASSWORD\|JWT_SECRET"
   ```

2. **Add missing entries to `.gitignore`**:

   ```gitignore
   # Already present:
   .env
   .encryption-key.dev

   # Verify these are also present:
   .env.local
   .env*.local
   ```

3. **Rotate all secrets if any were found in history**:
   - Generate new `ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Generate new `ENCRYPTION_SECRET`: same command
   - Generate new `JWT_SECRET`: `openssl rand -base64 64`
   - Generate new `JWT_REFRESH_SECRET`: same command
   - Update Railway environment variables
   - Re-encrypt all encrypted data in database with new keys

4. **Verify `.env.example` contains only placeholder values** (already confirmed safe — uses `CHANGE_ME_*` placeholders ✅)

#### Files

- `.gitignore` — verify completeness
- `.env.example` — verify no real secrets
- Railway/deployment env vars — rotate if leaked

---

### FIX-02: Eliminate `Object.assign` Mass Assignment (25+ locations)

**Issue**: `Object.assign(entity, dto)` allows overwriting protected fields
**Risk**: Privilege escalation if DTO ever gains a field matching a protected entity column
**Effort**: ~6h

#### Strategy

Create a shared utility function `applyUpdate()` that only copies explicitly allowed fields, then replace all 25+ occurrences.

#### Step 1: Create shared utility

**File**: `libs/common/src/lib/utils/entity-update.utils.ts`

```typescript
/**
 * Safely applies DTO updates to an entity, only copying fields that are
 * explicitly present (not undefined) in the DTO.
 *
 * Unlike Object.assign, this prevents mass-assignment attacks by ensuring
 * only DTO-declared fields are applied. The TypeScript compiler ensures
 * that only valid fields are in the DTO, and class-validator's whitelist
 * strips unknown fields at runtime.
 *
 * @param entity - Target entity to update
 * @param dto - Source DTO with optional fields
 * @param excludeKeys - Fields to never copy (e.g., 'id', 'companyId', 'role')
 */
export function applyUpdate<T extends Record<string, unknown>>(
  entity: T,
  dto: Partial<Record<string, unknown>>,
  excludeKeys: readonly string[] = []
): void {
  const excludeSet = new Set(excludeKeys);
  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined && !excludeSet.has(key)) {
      (entity as Record<string, unknown>)[key] = value;
    }
  }
}
```

#### Step 2: Export from barrel

**File**: `libs/common/src/index.ts` — add export

#### Step 3: Replace all 25+ occurrences

Each replacement follows the same pattern — replace `Object.assign(entity, dto)` with `applyUpdate(entity, dto, [protectedFields])`.

| #   | File                                                                              | Line | Old                                          | New                                                                                                                         | Excluded Keys                                                       |
| --- | --------------------------------------------------------------------------------- | ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `apps/api/src/admin/services/admin.service.ts`                                    | 142  | `Object.assign(user, updateUserDto)`         | `applyUpdate(user, updateUserDto, ['id', 'createdAt', 'updatedAt', 'tokenVersion'])`                                        | `id`, `createdAt`, `updatedAt`, `tokenVersion`                      |
| 2   | `apps/api/src/admin/services/admin.service.ts`                                    | 241  | `Object.assign(company, updateCompanyDto)`   | `applyUpdate(company, updateCompanyDto, ['id', 'ownerId', 'isSystemCompany', 'createdAt', 'updatedAt'])`                    | `id`, `ownerId`, `isSystemCompany`, `createdAt`, `updatedAt`        |
| 3   | `apps/api/src/admin/services/admin.service.ts`                                    | 274  | `Object.assign(company, dto)`                | `applyUpdate(company, dto, ['id', 'ownerId', 'isSystemCompany', 'createdAt', 'updatedAt'])`                                 | Same as above                                                       |
| 4   | `apps/api/src/company/services/company.service.ts`                                | 194  | `Object.assign(employee, updateEmployeeDto)` | `applyUpdate(employee, updateEmployeeDto, ['id', 'role', 'companyId', 'createdAt', 'updatedAt', 'tokenVersion'])`           | `id`, `role`, `companyId`, `createdAt`, `updatedAt`, `tokenVersion` |
| 5   | `apps/api/src/company/services/company.service.ts`                                | 229  | `Object.assign(company, dto)`                | `applyUpdate(company, dto, ['id', 'ownerId', 'isSystemCompany', 'createdAt', 'updatedAt'])`                                 | Same as company                                                     |
| 6   | `apps/api/src/email-config/services/email-config.service.ts`                      | 145  | `Object.assign(config, updateData)`          | `applyUpdate(config, updateData, ['id', 'userId', 'companyId', 'createdAt', 'updatedAt'])`                                  | `id`, `userId`, `companyId`                                         |
| 7   | `apps/api/src/email-config/services/email-config.service.ts`                      | 169  | `Object.assign(config, updateData)`          | Same pattern                                                                                                                | Same                                                                |
| 8   | `apps/api/src/email-config/services/email-config.service.ts`                      | 265  | `Object.assign(config, updateData)`          | Same pattern                                                                                                                | Same                                                                |
| 9   | `apps/api/src/modules/modules.service.ts`                                         | 123  | `Object.assign(module, updateModuleDto)`     | `applyUpdate(module, updateModuleDto, ['id', 'slug', 'createdAt', 'updatedAt'])`                                            | `id`, `slug`                                                        |
| 10  | `libs/modules/clients/src/lib/services/clients.service.ts`                        | 303  | `Object.assign(client, {...})`               | `applyUpdate(client, { ...dto, pkdCode: normalizedPkdCode }, ['id', 'companyId', 'createdById', 'createdAt', 'updatedAt'])` | `id`, `companyId`, `createdById`                                    |
| 11  | `libs/modules/clients/src/lib/services/clients.service.ts`                        | 586  | `Object.assign(client, updatePayload)`       | Same pattern                                                                                                                | Same                                                                |
| 12  | `libs/modules/clients/src/lib/services/client-icons.service.ts`                   | 235  | `Object.assign(icon, {...})`                 | `applyUpdate(icon, {...}, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                                   | `id`, `companyId`                                                   |
| 13  | `libs/modules/clients/src/lib/services/custom-fields.service.ts`                  | 165  | `Object.assign(definition, dto)`             | `applyUpdate(definition, dto, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                               | `id`, `companyId`                                                   |
| 14  | `libs/modules/clients/src/lib/services/export.service.ts`                         | 243  | `Object.assign(existingClient, ...)`         | `applyUpdate(existingClient, ..., ['id', 'companyId', 'createdById', 'createdAt'])`                                         | `id`, `companyId`, `createdById`                                    |
| 15  | `libs/modules/clients/src/lib/services/notification-settings.service.ts`          | 88   | `Object.assign(settings, dto)`               | `applyUpdate(settings, dto, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                                 | `id`, `companyId`                                                   |
| 16  | `libs/modules/tasks/src/lib/services/tasks.service.ts`                            | 583  | `Object.assign(task, taskData)`              | `applyUpdate(task, taskData, ['id', 'companyId', 'createdById', 'createdAt', 'updatedAt'])`                                 | `id`, `companyId`, `createdById`                                    |
| 17  | `libs/modules/tasks/src/lib/services/task-labels.service.ts`                      | 77   | `Object.assign(label, dto)`                  | `applyUpdate(label, dto, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                                    | `id`, `companyId`                                                   |
| 18  | `libs/modules/documents/src/lib/services/document-templates.service.ts`           | 47   | `Object.assign(template, dto)`               | `applyUpdate(template, dto, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                                 | `id`, `companyId`                                                   |
| 19  | `libs/modules/time-tracking/src/lib/services/time-entries.service.ts`             | 398  | `Object.assign(lockedEntry, {...})`          | `applyUpdate(lockedEntry, {...}, ['id', 'companyId', 'userId', 'createdAt'])`                                               | `id`, `companyId`, `userId`                                         |
| 20  | `libs/modules/time-tracking/src/lib/services/time-entries.service.ts`             | 660  | `Object.assign(runningEntry, dto)`           | Same pattern                                                                                                                | Same                                                                |
| 21  | `libs/modules/email-client/src/lib/services/email-auto-reply-template.service.ts` | 56   | `Object.assign(template, dto)`               | `applyUpdate(template, dto, ['id', 'companyId', 'createdAt', 'updatedAt'])`                                                 | `id`, `companyId`                                                   |
| 22  | `libs/modules/email-client/src/lib/services/email-draft.service.ts`               | 133  | `Object.assign(draft, dto)`                  | `applyUpdate(draft, dto, ['id', 'userId', 'companyId', 'createdAt'])`                                                       | `id`, `userId`, `companyId`                                         |
| 23  | `libs/modules/email-client/src/lib/services/email-draft-sync.service.ts`          | 227  | `Object.assign(draft, updates)`              | `applyUpdate(draft, updates, ['id', 'userId', 'companyId', 'createdAt'])`                                                   | Same                                                                |
| 24  | `libs/modules/notifications/src/lib/services/notification-settings.service.ts`    | 67   | `Object.assign(settings, dto)`               | `applyUpdate(settings, dto, ['id', 'userId', 'companyId', 'createdAt', 'updatedAt'])`                                       | `id`, `userId`, `companyId`                                         |
| 25  | `libs/modules/offers/src/lib/services/docx-generation.service.ts`                 | 259  | `Object.assign(data, validatedPlaceholders)` | This is data transformation, not entity mutation — **KEEP AS-IS** (safe)                                                    |

#### Step 4: Write unit tests for `applyUpdate()`

**File**: `libs/common/src/lib/utils/entity-update.utils.spec.ts`

Test cases:

- Copies allowed fields
- Skips excluded keys
- Skips undefined values
- Handles empty DTO
- Handles empty excludeKeys array

---

### FIX-03: Admin Self-Demotion Guard

**Issue**: Admin can change own role/companyId, locking themselves out
**Risk**: System lockout, data integrity
**Effort**: ~1h

#### Changes

**File**: `apps/api/src/admin/services/admin.service.ts`

In `updateUser()` method, add guard after line `const user = await this.findUserById(id);`:

```typescript
async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
  const user = await this.findUserById(id);

  // Prevent admin from demoting themselves
  if (id === currentUserId) {
    if (updateUserDto.role && updateUserDto.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        ErrorMessages.ADMIN.CANNOT_SELF_DEMOTE // new message constant
      );
    }
    if (updateUserDto.isActive === false) {
      throw new BadRequestException(
        ErrorMessages.ADMIN.CANNOT_SELF_DEACTIVATE // new message constant
      );
    }
  }

  // ... rest of method
}
```

**File**: `apps/api/src/admin/controllers/admin.controller.ts`

Update the controller to pass `currentUserId`:

```typescript
@Patch('users/:id')
async updateUser(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateUserDto,
  @CurrentUser() currentUser: User
) {
  return this.adminService.updateUser(id, dto, currentUser.id);
}
```

**File**: `libs/common/src/lib/constants/error-messages.ts`

Add new messages:

```typescript
ADMIN: {
  CANNOT_SELF_DEMOTE: 'Nie można zmienić własnej roli administratora',
  CANNOT_SELF_DEACTIVATE: 'Nie można dezaktywować własnego konta administratora',
},
```

---

## Phase 2 — 🟡 Code Quality Fixes (Day 3–4)

### FIX-04: Route Deduplication

**Issue**: ~700 lines of triplicated route definitions
**Risk**: Maintenance burden, bugs from inconsistent changes
**Effort**: ~4h

#### Strategy

Extract module routes into a declarative config array and generate route groups dynamically.

#### Step 1: Create route config

**File**: `apps/web/src/app/routes/module-route-config.ts`

```typescript
import { type ComponentType, type LazyExoticComponent } from 'react';

export interface ModuleRouteConfig {
  /** Module path prefix (e.g., 'tasks', 'clients') */
  path: string;
  /** Sub-routes within the module */
  routes: SubRoute[];
}

export interface SubRoute {
  /** Route path relative to module (empty string = index) */
  path: string;
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType>;
  /** Only include in these layout groups. Default: all */
  layouts?: ('admin' | 'company' | 'employee')[];
}
```

#### Step 2: Define module routes once

**File**: `apps/web/src/app/routes/module-routes.ts`

Define all 9 modules (~150 lines total instead of ~700):

```typescript
import { TasksDashboardPage, TasksKanbanPage /* ... */, TasksListPage } from './lazy-imports';
import { MODULE_ROUTE_CONFIGS } from './module-route-config';

export const MODULE_ROUTES: ModuleRouteConfig[] = [
  {
    path: 'tasks',
    routes: [
      { path: '', component: TasksDashboardPage },
      { path: 'list', component: TasksListPage },
      { path: 'kanban', component: TasksKanbanPage },
      { path: 'calendar', component: TasksCalendarPage },
      { path: 'timeline', component: TasksTimelinePage },
      { path: 'settings', component: TasksSettingsPage, layouts: ['admin', 'company'] },
      { path: 'create', component: TaskCreatePage },
      { path: 'templates', component: TaskTemplatesListPage },
      { path: 'statistics', component: TasksStatisticsPage },
    ],
  },
  // ... clients, email-client, time-tracking, settlements, documents, offers
];
```

#### Step 3: Create route generator component

**File**: `apps/web/src/app/routes/generate-module-routes.tsx`

```typescript
export function generateModuleRoutes(
  layout: 'admin' | 'company' | 'employee',
  prefix: string // 'modules/' for admin/company, '' for employee
): ReactNode {
  return MODULE_ROUTES.map((module) => {
    const routes = module.routes.filter(
      (r) => !r.layouts || r.layouts.includes(layout)
    );
    return routes.map((route) => (
      <Route
        key={`${module.path}/${route.path}`}
        path={`${prefix}${module.path}/${route.path}`}
        element={<LazyRoute><route.component /></LazyRoute>}
      />
    ));
  });
}
```

#### Step 4: Refactor `routes.tsx`

Replace the three 250-line functions with calls to `generateModuleRoutes()`. Keep layout-specific routes (admin dashboard, company profile, etc.) inline.

**Result**: `routes.tsx` shrinks from ~850 lines to ~200 lines.

---

### FIX-05: Centralize Error Messages (129 inline strings)

**Issue**: 129 hardcoded error strings, mixed PL/EN
**Risk**: Inconsistent UX, localization impossible
**Effort**: ~4h

#### Strategy

Extend existing `ErrorMessages` const in `libs/common/src/lib/constants/error-messages.ts`.

#### Step 1: Add missing message categories

```typescript
// Add to ErrorMessages:
ADMIN: {
  CANNOT_SELF_DEMOTE: 'Nie można zmienić własnej roli administratora',
  CANNOT_SELF_DEACTIVATE: 'Nie można dezaktywować własnego konta administratora',
  COMPANY_ID_REQUIRED_FOR_EMPLOYEE: 'ID firmy jest wymagane dla roli EMPLOYEE',
  COMPANY_NAME_REQUIRED_FOR_OWNER: 'Nazwa firmy jest wymagana dla roli COMPANY_OWNER',
  OWNER_MUST_BE_COMPANY_OWNER: 'Właściciel musi mieć rolę COMPANY_OWNER',
  OWNER_ALREADY_ASSIGNED: 'Ten właściciel jest już przypisany do innej firmy',
  CANNOT_DELETE_SYSTEM_COMPANY: 'Nie można usunąć firmy System Admin',
},

EMAIL_CONFIG: {
  NOT_FOUND: 'Konfiguracja email nie została znaleziona',
  COMPANY_NOT_FOUND: 'Konfiguracja email firmy nie została znaleziona',
  SYSTEM_NOT_FOUND: 'Konfiguracja email System Admin nie została znaleziona',
  USER_ALREADY_EXISTS: 'Użytkownik posiada już konfigurację email',
  COMPANY_ALREADY_EXISTS: 'Firma posiada już konfigurację email',
  SYSTEM_ALREADY_EXISTS: 'System Admin posiada już konfigurację email',
},

MODULES: {
  NOT_FOUND: 'Moduł nie został znaleziony',
  SLUG_EXISTS: 'Moduł o tym identyfikatorze już istnieje',
  NO_ACCESS: 'Nie masz dostępu do tego modułu',
  NOT_AVAILABLE: 'Moduł nie jest dostępny dla Twojej firmy',
  ADMIN_ONLY: 'Operacja dostępna tylko dla administratorów',
  OWNER_ONLY: 'Operacja dostępna tylko dla właścicieli firm',
  OWNER_MUST_BELONG_TO_COMPANY: 'Właściciel firmy musi być przypisany do firmy',
  PERMISSIONS_REQUIRED: 'Tablica uprawnień jest wymagana',
  DISCOVERY_NOT_AVAILABLE: 'Usługa odkrywania modułów jest niedostępna',
},

SUCCESS: {
  LOGOUT: 'Wylogowano pomyślnie',
  DELETED: 'Usunięto pomyślnie',
  RESTORED: 'Przywrócono pomyślnie',
  UPDATED: 'Zaktualizowano pomyślnie',
},
```

#### Step 2: Replace all 129 inline strings

Work module-by-module:

| Module          | Files to update                                                | ~Inline strings |
| --------------- | -------------------------------------------------------------- | --------------- |
| `admin`         | `admin.service.ts`                                             | 5               |
| `company`       | `company.service.ts`                                           | 2               |
| `email-config`  | `email-config.service.ts`, `smtp-imap.service.ts`              | 10              |
| `modules`       | `modules.service.ts`, `employee-module-permissions.service.ts` | 12              |
| `uploads`       | `uploads.controller.ts`                                        | 2               |
| `auth`          | `auth.controller.ts`                                           | 1               |
| `clients`       | various services                                               | ~20             |
| `tasks`         | various services                                               | ~15             |
| `time-tracking` | various services                                               | ~15             |
| `settlements`   | various services                                               | ~10             |
| `documents`     | various services                                               | ~10             |
| `email-client`  | various services                                               | ~15             |
| `offers`        | various services                                               | ~10             |
| `notifications` | various services                                               | ~5              |

**Total**: ~129 replacements across ~30 files.

---

### FIX-06: Add Response DTOs for Admin/Company Services

**Issue**: Services return raw entities, exposing all columns
**Risk**: Accidental data leakage when adding new sensitive fields
**Effort**: ~3h

#### Step 1: Create Admin Response DTOs

**File**: `apps/api/src/admin/dto/admin-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() role!: string;
  @ApiPropertyOptional() companyId!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  // NOTE: password, tokenVersion intentionally excluded
}

export class AdminCompanyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isSystemCompany!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
```

#### Step 2: Add explicit mapping methods to `AdminService`

```typescript
private toUserResponse(user: User): AdminUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    companyId: user.companyId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
```

#### Step 3: Apply to all return points

Update `findAllUsers()`, `findUserById()`, `createUser()`, `updateUser()`, etc. to return mapped DTOs.

#### Step 4: Same pattern for `CompanyService`

Create `CompanyEmployeeResponseDto` and apply mapping.

---

### FIX-07: RBAC Query Optimization

**Issue**: `canAccessModule()` makes 3 sequential DB queries per request
**Risk**: Performance bottleneck under load
**Effort**: ~3h

#### Strategy

The `checkModulePermission()` method (used by guards) is already optimized — it uses the `User` from `request.user` (no user query) and module cache. The non-optimized `canAccessModule()` and `hasPermission()` are legacy methods used in some controllers.

#### Step 1: Deprecate legacy methods

```typescript
/**
 * @deprecated Use checkModulePermission() instead. This method makes 3 DB queries.
 */
async canAccessModule(userId: string, moduleSlug: string): Promise<boolean> {
```

#### Step 2: Replace legacy method calls with optimized version

Search for all usages of `canAccessModule()` and `hasPermission()` in service code and replace with `checkModulePermission()` where a `User` object is available.

#### Step 3: Add company access caching

Add short-lived cache (30s TTL) for company module access lookups in `checkModulePermission()`:

```typescript
private companyAccessCache = new Map<string, { hasAccess: boolean; timestamp: number }>();
private readonly companyAccessCacheTTL = 30_000; // 30 seconds

private getCachedCompanyAccess(companyId: string, moduleId: string): boolean | null {
  const key = `${companyId}:${moduleId}`;
  const cached = this.companyAccessCache.get(key);
  if (cached && Date.now() - cached.timestamp < this.companyAccessCacheTTL) {
    return cached.hasAccess;
  }
  return null;
}
```

---

### FIX-08: Company Entity Refactoring (Deferred)

**Issue**: Company entity has 30+ columns and 10+ relations
**Risk**: Maintenance complexity, performance on eager loads
**Effort**: ~8h (migration required)
**Priority**: Defer to next sprint — requires migration + frontend changes

#### Recommended approach (when ready)

1. Extract `CompanyAddress` embedded entity (TypeORM `@Column(() => CompanyAddress)`)
2. Keep owner details as-is (they represent company registration info, not User duplication)
3. Consider lazy-loading AI relations

**No action in this phase** — document as future tech debt.

---

## Phase 3 — 🔵 Minor Fixes (Day 5)

### FIX-09: Replace Dynamic `require()` with Lazy Import

**Issue**: `require()` breaks tree-shaking and type checking
**Effort**: ~30min

**File**: `apps/api/src/app/app.module.ts`

Replace:

```typescript
const { DemoDataSeedersModule } = require('../seeders/demo-data-seeders.module');
optionalModules.push(DemoDataSeedersModule);
```

With environment-based conditional import at top level:

```typescript
// At module level, conditionally define the imports array
const conditionalImports = [];
if (process.env.ENABLE_DEMO_SEEDER === 'true' && process.env.NODE_ENV !== 'production') {
  // Import is still static — the module is excluded from production by env check
  const { DemoDataSeedersModule } = await import('../seeders/demo-data-seeders.module');
  conditionalImports.push(DemoDataSeedersModule);
}
```

Or simpler: always import the module but make it a no-op in production:

```typescript
import { DemoDataSeedersModule } from '../seeders/demo-data-seeders.module';

const optionalModules =
  process.env.ENABLE_DEMO_SEEDER === 'true' && process.env.NODE_ENV !== 'production'
    ? [DemoDataSeedersModule]
    : [];
```

---

### FIX-10: API Client Timeout Configuration

**Issue**: Hardcoded 30s timeout
**Effort**: ~30min

**File**: `apps/web/src/lib/api/client.ts`

```typescript
const API_TIMEOUTS = {
  default: 30_000, // 30s for standard requests
  upload: 120_000, // 2min for file uploads
  ai: 180_000, // 3min for AI operations
} as const;

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUTS.default,
  withCredentials: true,
});

// Export for per-request overrides
export { API_TIMEOUTS };
```

---

### FIX-11: Pagination Max Limit Guard

**Issue**: `calculatePagination()` has no upper bound on `limit`
**Risk**: DoS via `?limit=999999`
**Effort**: ~30min

**Good news**: `PaginationQueryDto` already has `@Max(100)` validator ✅. But `calculatePagination()` utility doesn't enforce this — it's a defense-in-depth gap.

**File**: `libs/common/src/lib/utils/pagination.utils.ts`

```typescript
const MAX_LIMIT = 100;

export function calculatePagination(
  params?: PaginationInput,
  defaultLimit = 20
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params?.limit ?? defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
```

---

### FIX-12: Test Coverage Reporting

**Issue**: No coverage measurement or thresholds
**Effort**: ~1h

#### Step 1: Add coverage script to `package.json`

```json
"test:coverage": "bun test --coverage libs/auth libs/common libs/rbac libs/modules apps/api/src"
```

#### Step 2: Add coverage configuration to `bunfig.toml`

```toml
[test]
coverage = true
coverageThreshold = { line = 70, function = 70, branch = 60 }
coverageReporter = ["text", "lcov"]
```

#### Step 3: Add coverage to CI pipeline (if using GitHub Actions)

```yaml
- name: Run tests with coverage
  run: bun test:coverage
- name: Upload coverage
  uses: codecov/codecov-action@v4
```

---

## 📋 Summary & Execution Order

| Phase | Fix                                       | Priority     | Effort | Dependencies            |
| ----- | ----------------------------------------- | ------------ | ------ | ----------------------- |
| **1** | FIX-01: Git secret audit                  | 🔴 Critical  | 2h     | None                    |
| **1** | FIX-02: `Object.assign` → `applyUpdate()` | 🔴 Critical  | 6h     | None                    |
| **1** | FIX-03: Admin self-demotion guard         | 🔴 Critical  | 1h     | FIX-05 (error messages) |
| **2** | FIX-04: Route deduplication               | 🟡 Important | 4h     | None                    |
| **2** | FIX-05: Centralize error messages         | 🟡 Important | 4h     | None                    |
| **2** | FIX-06: Response DTOs                     | 🟡 Important | 3h     | FIX-02 (applyUpdate)    |
| **2** | FIX-07: RBAC query optimization           | 🟡 Important | 3h     | None                    |
| **2** | FIX-08: Company entity refactor           | 🟡 Deferred  | 8h     | Migration planning      |
| **3** | FIX-09: Dynamic require → import          | 🔵 Minor     | 30min  | None                    |
| **3** | FIX-10: API timeout config                | 🔵 Minor     | 30min  | None                    |
| **3** | FIX-11: Pagination max limit              | 🔵 Minor     | 30min  | None                    |
| **3** | FIX-12: Test coverage reporting           | 🔵 Minor     | 1h     | None                    |

**Total estimated effort**: ~26h (~5 working days, excluding FIX-08)

### Recommended Git Branch Strategy

```
main
 └── fix/code-review-2026-04
      ├── fix/cr-01-secret-audit          (Phase 1)
      ├── fix/cr-02-mass-assignment        (Phase 1)
      ├── fix/cr-03-self-demotion-guard    (Phase 1)
      ├── fix/cr-04-route-dedup            (Phase 2)
      ├── fix/cr-05-error-messages         (Phase 2)
      ├── fix/cr-06-response-dtos          (Phase 2)
      ├── fix/cr-07-rbac-optimization      (Phase 2)
      ├── fix/cr-09-dynamic-require        (Phase 3)
      ├── fix/cr-10-api-timeout            (Phase 3)
      ├── fix/cr-11-pagination-guard       (Phase 3)
      └── fix/cr-12-test-coverage          (Phase 3)
```

Each branch gets its own PR for isolated review. Phase 1 branches are merged first.
