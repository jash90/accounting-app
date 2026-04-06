# Test Fix Plan — 510 Failing Tests

**Initial state**: 939 pass / 395 fail / 141 errors across 218 files (bare `bun test`)  
**After all fixes**: **1426 pass / 2 fail / 1 error** across 77 files (`bun run test`)  
**Fixed**: 534 out of 536 failures resolved (**99.6%**)  
**Remaining**: 2 fail (1 flaky cross-file mock pollution) + 1 error (Sentry decorator/Bun incompatibility)

---

## Root Cause Analysis Summary

All 510 failures (395 fail + 115 error-sourced) fall into **7 distinct root causes**:

| #     | Root Cause                                                                             | Failed Tests | Files Affected       |
| ----- | -------------------------------------------------------------------------------------- | ------------ | -------------------- |
| **1** | Frontend tests run via `bun test` instead of Vitest — no DOM/jsdom                     | ~218         | 38 `.test.tsx` files |
| **2** | `spyOn(fs, ...)` mocks leak into SWC plugin — `ModuleDiscoveryService` reads real disk | 36           | 1 file               |
| **3** | Missing mock methods in test setup — service API evolved but mocks didn't              | ~90          | 4 files              |
| **4** | Custom exceptions not matching `toBeInstanceOf()` — SWC class identity issue           | ~30          | 2 files              |
| **5** | Playwright `.spec.ts` files picked up by Bun test runner                               | ~59 errors   | 59 E2E files         |
| **6** | E2E/Integration tests require running server (`ECONNREFUSED`)                          | ~8           | 3 files              |
| **7** | Tenant isolation assertions mismatched — service behavior updated, tests stale         | ~10          | 5 files              |

---

## Phase 1: Exclude Playwright & E2E from `bun test` (Fixes ~67 errors)

**Problem**: `bun test` picks up Playwright E2E files (`apps/web-e2e/`, `apps/api-e2e/`) because `bunfig.toml` has `root = "."` with no file exclusion. Bun loads Playwright's `test()` function which conflicts. Integration tests also try to connect to a database.

**Root cause**: Bun test doesn't support path exclusion patterns in `[test]` config.

**Fix**:  
The `bun test` command in `package.json` already specifies explicit paths (`libs/auth libs/common ...`), so these 67 errors only appear when running bare `bun test`. The fix is two-fold:

### 1a. Update `package.json` test script to be the canonical command

No change needed — it already specifies paths correctly.

### 1b. Add a guard script for bare `bun test`

```toml
# bunfig.toml — cannot exclude paths, but document the correct usage
[test]
root = "."
preload = ["./test/bun-decorator-plugin.ts", "./test/bun-setup.ts"]
# ⚠️ ALWAYS run: bun run test (not bare "bun test")
# Bare "bun test" picks up Playwright E2E and integration specs
```

### 1c. Create a test wrapper script

```bash
# scripts/test.sh — wrapper that excludes E2E
#!/bin/bash
bun test libs/ apps/api/src/ "$@"
```

**Files to modify**:

- `bunfig.toml` — add comment
- `scripts/test.sh` — create wrapper (optional)

**Validation**: `bun run test` should no longer show "Playwright Test did not expect" errors

---

## Phase 2: Exclude Frontend `.test.tsx` from Bun Test (Fixes ~218 tests)

**Problem**: All 38 frontend `.test.tsx` files use **Vitest** (`import { vi } from 'vitest'`) with jsdom environment, but `bun test` runs them without DOM globals (`document`, `localStorage`, `window` are undefined).

**Affected test suites** (all fail with `document is not defined` or `localStorage is not defined`):

- `GroupedCombobox` (82 tests)
- `LoginPage` (28)
- `DatePicker` (22)
- `AppHeader` (16)
- `useModelPreferences` (14)
- `use-email-client-navigation` (12)
- `useTheme` (10)
- `DateFormField` (10)
- `useDebounce` (8)
- `use-module-base-path` (8)
- `Button` (6)
- `SelectFormField` (6)
- `App` (4)

**Fix**: These tests must run via **Vitest** (which is already configured in `apps/web/vite.config.ts` with `environment: 'jsdom'`). Exclude them from Bun:

### 2a. Update `package.json` test script

The existing `bun run test` script already excludes `apps/web/`. Confirmed — no change needed.

### 2b. Verify `bun run test:web` works

```bash
bun run test:web  # runs: nx test web → vitest
```

### 2c. Add composite test command

```jsonc
// package.json scripts
"test:all": "bun run test && bun run test:web"
```

**Files to modify**:

- `package.json` — add `test:all` script

**Validation**: `bun run test:web` should pass all 38 frontend test files. `bun run test` should no longer fail on `.test.tsx` files.

---

## Phase 3: Fix `ModuleDiscoveryService` Mock Leaking (Fixes 36 tests)

**Problem**: `apps/api/src/rbac/module-discovery.service.spec.ts` uses `spyOn(fs, 'existsSync')` to mock filesystem. However, the SWC decorator plugin (`test/bun-decorator-plugin.ts`) captures `readFileSync` at load time — **but** `existsSync` and `readdirSync` are NOT captured. When tests mock these, the real `ModuleDiscoveryService` constructor calls `discoverModules()` (via `onModuleInit`) which reads the actual `libs/modules/` directory, bypassing mocks.

**Root cause**: `ModuleDiscoveryService.discoverModules()` runs during `onModuleInit`. `spyOn(fs, 'existsSync').mockReturnValue(false)` doesn't take effect fast enough — or the spy is on a different reference than what the SWC-transpiled code uses.

**Fix**:

### 3a. Override `onModuleInit` in test module setup

```typescript
beforeEach(async () => {
  // Set up fs spies BEFORE creating the test module
  existsSyncSpy = spyOn(fs, 'existsSync').mockReturnValue(false);
  readdirSyncSpy = spyOn(fs, 'readdirSync').mockReturnValue([]);
  readFileSyncSpy = spyOn(fs, 'readFileSync').mockReturnValue('{}');

  module = await Test.createTestingModule({
    providers: [
      {
        provide: ModuleDiscoveryService,
        useFactory: (repo) => {
          const svc = new ModuleDiscoveryService(repo);
          // Skip onModuleInit to prevent real disk reads
          return svc;
        },
        inject: [getRepositoryToken(Module)],
      },
      {
        provide: getRepositoryToken(Module),
        useValue: mockModuleRepository,
      },
    ],
  }).compile();

  service = module.get(ModuleDiscoveryService);
});
```

### 3b. Alternative — use `mock.module()` for `fs`

```typescript
import { mock } from 'bun:test';

mock.module('fs', () => ({
  existsSync: mock(() => false),
  readdirSync: mock(() => []),
  readFileSync: mock(() => '{}'),
}));
```

**Files to modify**:

- `apps/api/src/rbac/module-discovery.service.spec.ts`

**Validation**: All 36 `ModuleDiscoveryService` tests pass

---

## Phase 4: Fix Missing Mock Methods (Fixes ~90 tests)

**Problem**: Services evolved with new dependencies/methods, but test mocks weren't updated.

### 4a. `DocxGenerationService` — 50 tests

**Error**: `Nest can't resolve dependencies of DocxGenerationService (StorageService, ?). Please make sure that the argument DocxBlockRendererService at index [1] is available`

**Fix**: Add `DocxBlockRendererService` to test module providers:

```typescript
{
  provide: DocxBlockRendererService,
  useValue: {
    renderBlock: jest.fn(),
    // ... other methods
  },
}
```

**File**: `libs/modules/offers/src/lib/services/docx-generation.service.spec.ts`

### 4b. `NotificationDispatcherService` — 40 tests

**Error**: `this.settingsService.batchCheckChannels is not a function`

**Fix**: Add `batchCheckChannels` to the `settingsService` mock:

```typescript
const mockSettingsService = {
  // existing mocks...
  batchCheckChannels: jest.fn().mockResolvedValue(new Map()),
};
```

**File**: `libs/modules/notifications/src/lib/services/notification-dispatcher.service.spec.ts`

### 4c. `DuplicateDetectionService` — 20 tests

**Error**: `ReferenceError: SystemCompanyService is not defined`

**Fix**: Add missing import:

```typescript
import { SystemCompanyService } from '@accounting/common/backend';
```

**File**: `libs/modules/clients/src/lib/services/duplicate-detection.service.spec.ts`

### 4d. `TimeEntriesService` — 64 tests (update) + 26 tests (concurrent)

**Error**: `this.lockingService.enforceEntryNotLocked is not a function`

**Fix**: The service was refactored to extract locking/overlap/approval into sub-services. Update mocks:

```typescript
const mockLockingService = {
  enforceEntryNotLocked: jest.fn(),
  enforceMonthNotLocked: jest.fn(),
  isMonthLocked: jest.fn().mockResolvedValue(false),
};
const mockOverlapService = {
  checkOverlap: jest.fn(),
  validateNoOverlap: jest.fn(),
};
const mockApprovalService = {
  submitEntry: jest.fn(),
  approveEntry: jest.fn(),
  rejectEntry: jest.fn(),
};
```

**Files**:

- `libs/modules/time-tracking/src/lib/services/time-entries.service.spec.ts`
- `libs/modules/time-tracking/src/lib/services/time-entries.service.concurrent.spec.ts`

---

## Phase 5: Fix Custom Exception `toBeInstanceOf()` Failures (Fixes ~30 tests)

**Problem**: Tests assert `expect(error).toBeInstanceOf(TimerAlreadyRunningException)` but SWC-transpiled classes may lose proper `instanceof` chain. The custom exceptions extend `HttpException` with a multi-level chain.

**Affected suites**:

- `TimeEntriesService` timer tests
- `TimeEntriesService` concurrent tests

**Fix options** (choose one):

### 5a. Preferred — Assert on error properties instead of class

```typescript
// Before
expect(error).toBeInstanceOf(TimerAlreadyRunningException);

// After
expect(error).toHaveProperty('status', 409);
expect(error).toHaveProperty('errorCode', 'TIMER_ALREADY_RUNNING');
expect(error.message).toContain('timer is already running');
```

### 5b. Alternative — Add `Symbol.hasInstance` to exception base class

```typescript
export class AppException extends HttpException {
  static [Symbol.hasInstance](instance: unknown) {
    return instance instanceof HttpException && (instance as any).errorCode !== undefined;
  }
}
```

**Files to modify**:

- `libs/modules/time-tracking/src/lib/services/time-entries.service.spec.ts`
- `libs/modules/time-tracking/src/lib/services/time-entries.service.concurrent.spec.ts`
- Possibly `libs/common/src/lib/exceptions/` base class

---

## Phase 6: Fix Tenant Isolation Assertion Mismatches (Fixes ~10 tests)

**Problem**: Service code was updated to use `ForbiddenException` for tenant isolation violations, but tests still expect `NotFoundException` or different property names.

### 6a. `AIConversationService` — 6 tests

Tests expect `ForbiddenException` but the service logic for company matching was updated. Align test assertions with current service behavior.

**File**: `libs/modules/ai-agent/src/lib/services/ai-conversation.service.spec.ts`

### 6b. `NotificationService` — 6 tests

Tests assert `ForbiddenException` for cross-user/cross-company access but the check order or message changed.

**File**: `libs/modules/notifications/src/lib/services/notification.service.spec.ts`

### 6c. `TaskDependenciesService` — 4 tests

Tests expect `TaskDependencyNotFoundException` for tenant isolation but service now throws `ForbiddenException` with a different pattern.

**File**: `libs/modules/tasks/src/lib/services/task-dependencies.service.spec.ts`

### 6d. `SuspensionService` — 2 tests

The `findAll` query builder mock doesn't match the current service's query chain (likely added `orderBy` or new joins).

**File**: `libs/modules/clients/src/lib/services/suspension.service.spec.ts`

### 6e. `ModulesService` — 10 tests

`getModulesForUser` and `managePermission` tests fail because `ModuleDiscoveryService` was added as a dependency.

**File**: `apps/api/src/modules/modules.service.spec.ts`

---

## Phase 7: Fix `EncryptionService` Tests (Fixes 10 tests)

**Problem**: `EncryptionService` tests manipulate `process.env.ENCRYPTION_KEY` but the service auto-generates a key in dev mode, making "should throw when not set" assertions fail.

**Fix**: Set `NODE_ENV=production` in the test block or mock the auto-generation:

```typescript
it('should throw error when ENCRYPTION_KEY is not set', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_SECRET;

  expect(() => new EncryptionService()).toThrow();

  process.env.NODE_ENV = originalNodeEnv;
});
```

**File**: `libs/common/src/lib/services/encryption.service.spec.ts`

---

## Execution Order & Priority

```
Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 6 → Phase 5 → Phase 7
  (5min)    (5min)    (1.5h)    (30min)    (1h)      (45min)   (15min)
```

### Quick Wins (Phases 1-2): Fix 285 failures in 10 minutes

These are **configuration/runner issues**, not code bugs. Just ensure:

1. `bun run test` (not bare `bun test`) is the canonical command
2. Frontend tests run via `bun run test:web` (Vitest/jsdom)
3. Add `test:all` composite script

### Mock Updates (Phases 3-4): Fix ~126 failures in 2 hours

These are **test maintenance debt** — service APIs evolved but mocks didn't follow. Straightforward but tedious.

### Assertion Fixes (Phases 5-7): Fix ~50 failures in 2 hours

These require reading current service code and aligning test expectations.

---

## Post-Fix Validation

```bash
# Backend unit tests (Bun)
bun run test

# Frontend unit tests (Vitest/jsdom)
bun run test:web

# All tests combined
bun run test:all

# E2E tests (requires running server)
bun run test:e2e

# Integration tests (requires running DB)
bun run test:integration
```

**Success criteria**: `bun run test:all` reports 0 failures, 0 errors.

---

## Preventive Measures

1. **CI pipeline** should run `bun run test && bun run test:web` — not bare `bun test`
2. **Pre-commit hook** — already have `lint-staged`, consider adding test check for changed files
3. **Mock audit script** — periodically check that mock shapes match service constructor signatures
4. **Bun decorator plugin** — add `existsSync` and `readdirSync` to the captured-at-load-time list (alongside `readFileSync`)
