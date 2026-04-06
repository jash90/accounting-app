# 🔧 Fix Plan — Accounting RBAC Platform

## ✅ Implementation Status

| Fix    | Status     | Notes                                                                                                      |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------- |
| FIX-01 | ✅ DONE    | Rotated JWT_SECRET, JWT_REFRESH_SECRET, AI_API_KEY_ENCRYPTION_KEY                                          |
| FIX-02 | ✅ DONE    | Split time-entries.service.ts (1089→530 LOC) into 4 services                                               |
| FIX-03 | ✅ DONE    | Bounded LRU cache (200/1000 max) + periodic cleanup + onModuleDestroy                                      |
| FIX-04 | ✅ DONE    | User cache in JwtStrategy (60s TTL, 500 max, tokenVersion-aware)                                           |
| FIX-05 | ✅ DONE    | Removed canAccessModule() & hasPermission(); updated all callers                                           |
| FIX-06 | ✅ DONE    | Dockerfile.api: bun.lockb\* → bun.lock                                                                     |
| FIX-07 | ✅ DONE    | authEventBus + useNavigate() replaces window.location.href                                                 |
| FIX-08 | ✅ DONE    | Retry interceptor for GET/HEAD on 502/503/504 + network errors                                             |
| FIX-09 | ✅ PARTIAL | client-form-dialog (1118→975), timer-widget (632→540); clients-list/condition-builder/offer-form remaining |
| FIX-10 | ✅ DONE    | All hardcoded Polish strings in services replaced with ErrorMessages.\*                                    |
| FIX-11 | ✅ DONE    | @types/pdfmake moved to devDependencies                                                                    |
| FIX-12 | ✅ DONE    | tasks (844→627), changelog (783→103+520), offers (760→723), clients (775→746)                              |
| FIX-13 | 🟡 BACKLOG | CompanyProfile entity extraction (next major entity change)                                                |
| FIX-14 | 🟡 BACKLOG | Redis cache (when scaling to multi-instance)                                                               |
| FIX-15 | 🟡 BACKLOG | Merged into FIX-08                                                                                         |

## Phase 1: 🔴 CRITICAL (Security & Data Integrity)

**Estimated effort: 2-3 days**

---

### FIX-01: Remove `.env` from Git history & rotate secrets

**Priority:** 🔴 P0 — Immediate
**Risk:** Exposed credentials in repository
**Files:**

- `.env` (already in `.gitignore` ✅ — but verify it's not tracked)
- `.env.example` (update instructions)

**Steps:**

1. `.env` is already in `.gitignore` and `git ls-files .env` returns empty — **NOT tracked** ✅
2. However, `.env` contains weak JWT_SECRET (`jshdlfhalsdhflhjaslkdhfjklasjdlf`) which matches weak defaults list in `env.validator.ts`
3. Rotate secrets locally:
   ```bash
   # Generate new secrets
   JWT_SECRET=$(openssl rand -base64 64)
   JWT_REFRESH_SECRET=$(openssl rand -base64 64)
   ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
   AI_API_KEY_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
   ```
4. Update `.env` locally with strong secrets
5. Verify Railway/production env vars are rotated separately

**Verification:** `validateEnvironment()` passes without warnings

---

### FIX-02: Refactor `time-entries.service.ts` (1,089 → ~4×250 LOC)

**Priority:** 🔴 P1 — High
**Risk:** Maintainability, SRP violation, merge conflicts
**Current file:** `libs/modules/time-tracking/src/lib/services/time-entries.service.ts`

**Extraction plan (4 new services):**

| New Service                      | Methods to Extract                                                         | Est. LOC |
| -------------------------------- | -------------------------------------------------------------------------- | -------- |
| `timer.service.ts`               | `startTimer`, `stopTimer`, `getActiveTimer`, `discardTimer`, `updateTimer` | ~200     |
| `time-entry-approval.service.ts` | `submitEntry`, `approveEntry`, `rejectEntry`, `bulkApprove`, `bulkReject`  | ~200     |
| `time-entry-locking.service.ts`  | `lockEntry`, `unlockEntry`, `enforceEntryNotLocked`                        | ~120     |
| `time-entry-overlap.service.ts`  | `enforceNoTimeOverlap`, `enforceNoTimeOverlapWithLock`                     | ~100     |

**Remaining in `time-entries.service.ts`:** `findAll`, `findOne`, `create`, `update`, `remove`, `validate*` (~400 LOC)

**Steps:**

1. Create 4 new service files in `libs/modules/time-tracking/src/lib/services/`
2. Extract methods preserving existing dependencies (`DataSource`, `ChangeLogService`, etc.)
3. Inject extracted services into `TimeEntriesService` for backward-compatible delegation
4. Update `time-tracking.module.ts` providers
5. Update barrel exports in `index.ts`
6. Run existing tests — all 5 spec files must pass unchanged
7. Move relevant test cases to new spec files

**New files:**

```
libs/modules/time-tracking/src/lib/services/
├── timer.service.ts                    (NEW)
├── timer.service.spec.ts               (NEW)
├── time-entry-approval.service.ts      (NEW)
├── time-entry-approval.service.spec.ts (NEW)
├── time-entry-locking.service.ts       (NEW)
├── time-entry-locking.service.spec.ts  (NEW)
├── time-entry-overlap.service.ts       (NEW)
├── time-entries.service.ts             (MODIFIED: ~400 LOC)
├── time-entries.service.spec.ts        (MODIFIED: remove extracted tests)
```

---

### FIX-03: Replace in-memory RBAC cache with bounded LRU + periodic cleanup

**Priority:** 🔴 P1 — High
**Risk:** Stale permissions in multi-instance deployments, memory leak
**Files:**

- `libs/rbac/src/lib/services/rbac.service.ts`
- `libs/rbac/src/lib/rbac.module.ts`

**Current problem:**

```typescript
private moduleCache = new Map<string, { module: Module; timestamp: number }>();      // grows unbounded
private companyAccessCache = new Map<string, { hasAccess: boolean; timestamp: number }>(); // grows unbounded
```

**Solution — 2 phases:**

**Phase A (immediate):** Add LRU eviction + periodic cleanup

1. Add max size constant: `MAX_MODULE_CACHE_SIZE = 200`, `MAX_ACCESS_CACHE_SIZE = 1000`
2. Implement LRU eviction on `set()` — when cache exceeds max, delete oldest entries
3. Add `@Cron('*/10 * * * *')` cleanup task to purge expired entries
4. Add cache size metrics to `getDiscoveryStats()`

**Phase B (future — when Redis available):** Migrate to Redis cache

- Use `@nestjs/cache-manager` with `cache-manager-redis-store`
- Module cache TTL: 5 min, Company access TTL: 30s (same as current)
- This is not urgent unless scaling to multiple instances

---

## Phase 2: 🟠 IMPORTANT (Performance & Architecture)

**Estimated effort: 3-4 days**

---

### FIX-04: Cache user lookup in JwtStrategy

**Priority:** 🟠 P2
**Risk:** DB query on every authenticated request
**Files:**

- `libs/auth/src/lib/strategies/jwt.strategy.ts`

**Current:** Every request → `userRepository.findOne({ where: { id: payload.sub } })`

**Solution:** Request-scoped user cache via NestJS middleware

1. Create `libs/auth/src/lib/middleware/user-cache.middleware.ts`:
   - Intercept after Passport, before guards
   - Cache `User` on `request.user` (already done by Passport)
   - Add short TTL in-process cache: `Map<userId, { user, timestamp }>` with 60s TTL
2. Register middleware in `AuthModule`
3. Invalidate cache entry on `user.tokenVersion` mismatch (already checked)

**Alternative (simpler):** Add `@Cacheable` decorator or use `nestjs-cls` (Continuation Local Storage) with per-request cache. No DB lookup if user was resolved in same request.

**Estimated DB query reduction:** ~50-70% for typical request patterns (multiple guard checks per request already share user via `request.user`)

---

### FIX-05: Remove deprecated RBAC methods

**Priority:** 🟠 P2
**Risk:** Dead code, potential misuse
**Files:**

- `libs/rbac/src/lib/services/rbac.service.ts` — remove `canAccessModule()`, `hasPermission()`
- `apps/api/src/modules/modules.service.ts:156` — only caller of `canAccessModule()`

**Steps:**

1. Replace `modules.service.ts:156` call:
   ```typescript
   // Before
   return this.rbacService.canAccessModule(userId, moduleSlug);
   // After
   const user = await this.userRepository.findOne({ where: { id: userId } });
   if (!user) return false;
   const result = await this.rbacService.checkModulePermission(user, moduleSlug);
   return result.hasAccess;
   ```
2. Remove `canAccessModule()` and `hasPermission()` from `RBACService`
3. Update `rbac.service.spec.ts` — remove deprecated method tests
4. Run full test suite

---

### FIX-06: Fix Dockerfile lockfile name

**Priority:** 🟠 P2
**Risk:** Docker builds ignore lockfile, non-deterministic installs
**File:** `Dockerfile.api`

**Change:**

```dockerfile
# Before
COPY package.json bun.lockb* ./
# After
COPY package.json bun.lock ./
```

---

### FIX-07: Replace `window.location.href` with event-driven navigation

**Priority:** 🟠 P2
**Risk:** Breaks SPA state, loses React Query cache
**Files:**

- `apps/web/src/lib/api/client.ts` (lines 77, 127)
- `apps/web/src/contexts/auth-context.tsx`

**Steps:**

1. Create `apps/web/src/lib/events/auth-events.ts`:
   ```typescript
   export const AUTH_EVENTS = {
     SESSION_EXPIRED: 'auth:session-expired',
     MODULE_ACCESS_DENIED: 'auth:module-access-denied',
   } as const;
   export const authEventBus = new EventTarget();
   ```
2. Replace in `client.ts`:
   ```typescript
   // Before
   window.location.href = '/login';
   // After
   authEventBus.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED));
   ```
3. Listen in `AuthProvider` or top-level component:
   ```typescript
   useEffect(() => {
     const handler = () => {
       logout();
       navigate('/login');
     };
     authEventBus.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handler);
     return () => authEventBus.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handler);
   }, []);
   ```
4. Same pattern for `MODULE_ACCESS_DENIED` → `/module-access-denied`

---

### FIX-08: Add retry logic for transient errors in API client

**Priority:** 🟠 P3
**Risk:** Poor UX on temporary network failures
**File:** `apps/web/src/lib/api/client.ts`

**Steps:**

1. Add retry interceptor for 5xx + network errors:
   ```typescript
   const MAX_RETRIES = 2;
   const RETRY_DELAY_MS = 1000;
   const RETRYABLE_STATUS = new Set([502, 503, 504]);
   ```
2. Implement exponential backoff: `delay * 2^attempt`
3. Skip retry for mutating methods (`POST`, `PUT`, `DELETE`) unless idempotent
4. Only retry `GET` and `HEAD` by default
5. Add `x-retry-count` header for observability

---

## Phase 3: 🟡 MODERATE (Code Quality & Consistency)

**Estimated effort: 4-5 days**

---

### FIX-09: Refactor oversized frontend components

**Priority:** 🟡 P3
**Risk:** Maintainability, testability

| Component                        | LOC                                                                                                                           | Refactoring Strategy |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `client-form-dialog.tsx` (1,118) | Extract: `ClientBasicInfoSection`, `ClientDatesSection`, `ClientTaxSection`, `ClientReliefSection` + keep dialog shell (~200) |
| `clients-list.tsx` (1,094)       | Extract: `ClientsTableColumns` config, `ClientsToolbar`, `ClientsBulkActions`, `ClientDialogManager`                          |
| `admin-configuration.tsx` (862)  | Extract: `ConfigurationForm` (already exists at L130), `ModelSelector`, `ApiKeySection`                                       |
| `condition-builder.tsx` (718)    | Extract: `ConditionRow`, `ConditionGroupControls`, `ConditionOperatorSelector`                                                |
| `offer-form-dialog.tsx` (679)    | Extract: `OfferBasicFields`, `OfferItemsTable`, `OfferSummary`                                                                |
| `timer-widget.tsx` (632)         | Extract: `TimerDisplay`, `TimerControls`, `TimerEntryForm`                                                                    |

**Approach per component:**

1. Identify logical sections (form sections, table columns, toolbars)
2. Extract to co-located files: `components/clients/sections/basic-info.tsx`
3. Pass state via props (not context) for simple sub-components
4. Preserve existing test coverage
5. Each resulting file ≤ 400 LOC

---

### FIX-10: Consolidate hardcoded Polish strings

**Priority:** 🟡 P3
**Risk:** i18n impossible, inconsistent messages
**Files:**

- `libs/modules/time-tracking/src/lib/services/time-entries.service.ts` (5 hardcoded strings)
- Other services with inline Polish strings

**Steps:**

1. Audit all hardcoded Polish strings in services:
   ```bash
   grep -rn "'Nie \|'Brak \|'Timer \|'Wpis \|'Oferta \|'Klient " libs/ apps/api/ --include="*.ts" | grep -v spec | grep -v node_modules
   ```
2. Move all to `ErrorMessages` in `libs/common/src/lib/constants/error-messages.ts`
3. Replace inline strings with `ErrorMessages.*` references
4. Example fix in `time-entries.service.ts`:
   ```typescript
   // Before
   throw new ForbiddenException('Nie masz uprawnień do zarządzania wpisami czasu');
   // After
   throw new ForbiddenException(ErrorMessages.TIME_TRACKING.CANNOT_MANAGE_ENTRIES);
   ```
   (This key already exists! Just not used.)
5. Same for `'Wpis czasu nie może być jednocześnie przypisany do zadania i rozliczenia.'`

---

### FIX-11: Move `@types/pdfmake` to devDependencies

**Priority:** 🟡 P4
**Risk:** Bloated production bundle
**File:** `package.json`

**Change:**

```json
// Remove from dependencies
"@types/pdfmake": "^0.3.1",
// Add to devDependencies
"@types/pdfmake": "^0.3.1",
```

---

### FIX-12: Refactor oversized backend services (>500 LOC)

**Priority:** 🟡 P3
**Files exceeding 500 LOC limit:**

| Service                                | LOC                                                                                                                                                                     | Strategy |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `tasks.service.ts` (844)               | Extract: `TaskStatisticsService` (getClientTaskStatistics, getGlobalStatistics ~150 LOC), `TaskKanbanService` (getKanbanBoard, getCalendarTasks, reorderTasks ~150 LOC) |
| `clients.service.ts` (775)             | Extract: `ClientPkdService` (searchPkdCodes, getPkdSections ~50 LOC), `ClientBulkService` (bulk operations ~100 LOC)                                                    |
| `client-changelog.service.ts` (783)    | Extract: `ClientDiffService` (diff calculation methods)                                                                                                                 |
| `offers.service.ts` (760)              | Extract: `OfferCalculationService`, `OfferValidationService`                                                                                                            |
| `openrouter-provider.service.ts` (598) | Extract: `OpenRouterModelMapper` (model mapping/conversion)                                                                                                             |
| `ai-conversation.service.ts` (529)     | Extract: `ConversationMemoryService`                                                                                                                                    |

---

## Phase 4: 🔵 NICE-TO-HAVE (Future Improvements)

**Estimated effort: 2-3 days (when needed)**

---

### FIX-13: Extract `CompanyProfile` from `Company` entity

**When:** Next major entity change
**File:** `libs/common/src/lib/entities/company.entity.ts`

- Extract 15+ profile columns (nip, regon, address, bank, owner details) into `CompanyProfile` entity
- Use `@OneToOne` relationship
- Migration to move data

### FIX-14: Add Redis-backed caching layer

**When:** Scaling to multi-instance

- Add `@nestjs/cache-manager` + `cache-manager-redis-store`
- Replace `RBACService` in-memory cache
- Replace `JwtStrategy` user lookup cache
- Add Redis to `docker-compose.yml`

### FIX-15: Add API client retry for network errors

**When:** Users report flaky network issues

- Implement axios-retry or custom interceptor
- Exponential backoff for GET requests
- Circuit breaker pattern for repeated failures

---

## 📅 Implementation Schedule

| Week        | Phase          | Fixes                                         | Est. Hours |
| ----------- | -------------- | --------------------------------------------- | ---------- |
| **Week 1**  | P0-P1 Critical | FIX-01, FIX-02, FIX-03                        | 16-20h     |
| **Week 2**  | P2 Important   | FIX-04, FIX-05, FIX-06, FIX-07                | 12-16h     |
| **Week 3**  | P3 Quality     | FIX-09 (3 largest components), FIX-10, FIX-11 | 16-20h     |
| **Week 4**  | P3 Quality     | FIX-09 (remaining), FIX-12, FIX-08            | 16-20h     |
| **Backlog** | P4 Future      | FIX-13, FIX-14, FIX-15                        | On demand  |

---

## ✅ Testing Strategy per Fix

| Fix    | Test Approach                                                        |
| ------ | -------------------------------------------------------------------- |
| FIX-01 | Manual verify `validateEnvironment()` passes                         |
| FIX-02 | Existing 5 spec files must pass; new specs for extracted services    |
| FIX-03 | `rbac.service.spec.ts` + integration tests for cache eviction        |
| FIX-04 | `auth.service.spec.ts` + load test for query reduction               |
| FIX-05 | `modules.service.spec.ts` + verify no other callers                  |
| FIX-06 | Docker build test: `docker build -f Dockerfile.api .`                |
| FIX-07 | `web-e2e` auth session tests + manual 401 simulation                 |
| FIX-08 | New test for retry interceptor with MSW mocking                      |
| FIX-09 | Existing frontend tests must pass; visual regression with Playwright |
| FIX-10 | grep for remaining hardcoded strings = 0                             |
| FIX-11 | `bun install && bun run build` succeeds                              |
| FIX-12 | Existing backend spec files must pass                                |
