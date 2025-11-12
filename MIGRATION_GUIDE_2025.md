# Migration Guide - Frontend Stack 2025

**Date**: January 2025
**Purpose**: Step-by-step guide to migrate from 2024 frontend plan to 2025 stack
**Total Estimated Time**: 10-15 hours
**Risk Level**: LOW

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Phase 1: Core Upgrades](#phase-1-core-upgrades-4-6-hours)
4. [Phase 2: Code Updates](#phase-2-code-updates-2-3-hours)
5. [Phase 3: MSW Integration](#phase-3-msw-integration-4-6-hours)
6. [Phase 4: React Compiler](#phase-4-react-compiler-optional-2-4-hours)
7. [Post-Migration Validation](#post-migration-validation)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### What's Changing

| Component | Current (2024) | Target (2025) | Breaking Changes |
|-----------|---------------|---------------|------------------|
| React | 18.2+ | 19.x | Minimal |
| TypeScript | 5.0+ | 5.7 | None |
| Vite | 5.0+ | 6.0 | Minor |
| TanStack Query | v4 | v5 | YES - API changes |
| MSW | Not used | Latest | N/A - New addition |
| React Compiler | N/A | Optional | N/A - New feature |

### Benefits

**Performance**:
- 15% smaller bundle (450KB → 380KB)
- 20% faster builds (10s → 8s)
- 30-40% fewer re-renders (React Compiler)

**Developer Experience**:
- Auto-memoization (no more useMemo/useCallback)
- Better type checking
- Faster HMR

**Testing**:
- Unified API mocking with MSW
- Same mocks for dev/test/E2E

### Risk Assessment

**Overall Risk**: LOW (2.5/10)

**Low Risk Components**:
- React 19: Stable release, backward compatible
- TypeScript 5.7: Incremental update
- Vite 6: Minor version bump
- MSW: Dev/test only

**Medium Risk Components**:
- TanStack Query v5: Breaking API changes (but simple)
- React Compiler: New feature (but optional)

---

## Pre-Migration Checklist

### 1. Backup Current State

```bash
# Create a branch for migration
git checkout -b migration/frontend-2025

# Tag current state
git tag v1.0-pre-migration

# Commit any pending work
git add .
git commit -m "Pre-migration checkpoint"
```

### 2. Verify Current Setup

```bash
# Check Node.js version (need 20+)
node --version
# Should be >= 20.0.0

# Check npm version
npm --version
# Should be >= 9.0.0

# Verify current app works
nx serve web
# Test in browser: http://localhost:4200
```

### 3. Document Current Dependencies

```bash
# Save current package versions
npm list --depth=0 > pre-migration-packages.txt

# Save current bundle size
nx build web --configuration=production
ls -lh dist/apps/web/assets/*.js > pre-migration-bundle.txt
```

### 4. Run Current Tests

```bash
# Ensure all tests pass before migration
nx test web
nx e2e web-e2e

# Save results
nx test web > pre-migration-tests.txt
```

---

## Phase 1: Core Upgrades (4-6 hours)

### Step 1.1: Update React to 19

**Estimated Time**: 1-2 hours

```bash
# Upgrade React packages
npm install react@19 react-dom@19

# Verify installation
npm list react react-dom
# Should show 19.x for both
```

**Verify**:
```bash
nx serve web
# Check browser console for errors
# Test basic navigation
```

**Common Issues**:
- Third-party libraries may need updates
- Check React DevTools compatibility

**Fix**:
```bash
# Update React DevTools browser extension
# Update @types/react if using TypeScript
npm install -D @types/react@19 @types/react-dom@19
```

### Step 1.2: Update TypeScript to 5.7

**Estimated Time**: 30 minutes

```bash
# Upgrade TypeScript
npm install -D typescript@5.7

# Verify installation
npx tsc --version
# Should show 5.7.x
```

**Run Type Check**:
```bash
nx run web:typecheck
# or
npx tsc --noEmit
```

**Fix New Errors** (if any):
```typescript
// TS 5.7 catches uninitialized variables in nested functions
function processUser(user?: User) {
  let name;

  function inner() {
    console.log(name.toUpperCase()); // ERROR: name might be undefined
  }

  if (user) {
    name = user.name;
  }

  inner(); // Move inside if block or add check
}

// Fixed:
function processUser(user?: User) {
  if (user) {
    const name = user.name;
    function inner() {
      console.log(name.toUpperCase()); // OK
    }
    inner();
  }
}
```

### Step 1.3: Update Vite to 6.0

**Estimated Time**: 30 minutes - 1 hour

```bash
# Upgrade Vite
npm install -D vite@6

# Verify installation
npm list vite
# Should show 6.x
```

**Update `vite.config.ts`**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

export default defineConfig({
  // ... existing config

  plugins: [
    react(), // Updated for Vite 6 + React 19
    nxViteTsPaths(),
  ],

  // ... rest of config
});
```

**Test Build**:
```bash
nx build web --configuration=production

# Verify output
ls -lh dist/apps/web/
```

### Step 1.4: Upgrade TanStack Query to v5

**Estimated Time**: 1-2 hours

```bash
# Upgrade TanStack Query
npm install @tanstack/react-query@5
npm install -D @tanstack/react-query-devtools@5

# Verify installation
npm list @tanstack/react-query
# Should show ^5.0.0
```

**Update Query Client Configuration**:

```typescript
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // CHANGED: was cacheTime in v4
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Breaking Changes to Fix** (next phase):
- `isLoading` → `isPending`
- `cacheTime` → `gcTime` (already done above)

### Step 1.5: Install MSW

**Estimated Time**: 1 hour

```bash
# Install MSW
npm install -D msw@latest

# Initialize MSW
npx msw init public/ --save

# Verify installation
npm list msw
```

**Create Directory Structure**:
```bash
mkdir -p apps/web/src/lib/api/mocks
```

---

## Phase 2: Code Updates (2-3 hours)

### Step 2.1: Find and Replace `isLoading` → `isPending`

**Estimated Time**: 30 minutes

**Search Pattern**:
```typescript
// Find all instances of isLoading from useQuery/useMutation
const { data, isLoading } = useQuery(...)
const { mutate, isLoading } = useMutation(...)
```

**Replace With**:
```typescript
const { data, isPending } = useQuery(...)
const { mutate, isPending } = useMutation(...)
```

**VS Code Search & Replace**:
1. Open Find in Files (Cmd/Ctrl + Shift + F)
2. Search: `isLoading`
3. Filter: `apps/web/src/**/*.{ts,tsx}`
4. Review each occurrence
5. Replace with `isPending` where it's from TanStack Query

**Files to Update** (estimated):
- `lib/hooks/use-*.ts` (5-7 files)
- `pages/**/*.tsx` (10-15 files)
- `components/**/*.tsx` (5-10 files)

**Example**:
```typescript
// BEFORE
export const useUsers = () => {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading, // ❌ OLD
  };
};

// AFTER
export const useUsers = () => {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  return {
    users: usersQuery.data ?? [],
    isPending: usersQuery.isPending, // ✅ NEW
  };
};
```

### Step 2.2: Update Loading Checks

**Estimated Time**: 30 minutes

**Find**:
```typescript
if (isLoading) return <Spinner />;
```

**Replace**:
```typescript
if (isPending) return <Spinner />;
```

**Comprehensive Search**:
```bash
# Find all loading checks
grep -r "isLoading" apps/web/src --include="*.tsx"

# Review and update each file
```

### Step 2.3: Update Query Key Patterns (if needed)

**Estimated Time**: 30 minutes

**Review Current Query Keys**:
```typescript
// If using simple query keys
queryKey: ['users']

// If using factory pattern (recommended)
queryKey: queryKeys.users.all
```

**No changes needed if using factory pattern** (already in current plan)

### Step 2.4: Test All Queries and Mutations

**Estimated Time**: 1 hour

```bash
# Run unit tests
nx test web

# Run dev server
nx serve web

# Manual testing:
# 1. Login
# 2. Navigate to each page
# 3. Perform CRUD operations
# 4. Check loading states
# 5. Verify error handling
```

**Checklist**:
- [ ] Login works
- [ ] Users list loads
- [ ] Create user works
- [ ] Update user works
- [ ] Delete user works
- [ ] All other entities work
- [ ] Loading states show correctly
- [ ] Error states show correctly

---

## Phase 3: MSW Integration (4-6 hours)

### Step 3.1: Create MSW Handlers

**Estimated Time**: 2-3 hours

**Create `lib/api/mocks/handlers.ts`**:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    if (email && password) {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: '1',
          email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMIN',
          isActive: true,
        },
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/auth/refresh', async () => {
    return HttpResponse.json({
      access_token: 'new-mock-access-token',
    });
  }),

  // User endpoints
  http.get('/admin/users', () => {
    return HttpResponse.json([
      {
        id: '1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
      {
        id: '2',
        email: 'owner@test.com',
        firstName: 'Company',
        lastName: 'Owner',
        role: 'COMPANY_OWNER',
        isActive: true,
        company: { id: '1', name: 'Acme Corp' },
      },
    ]);
  }),

  // Add handlers for all 47 endpoints...
  // (See FRONTEND_IMPLEMENTATION_PLAN_2025.md for complete example)
];
```

**Tip**: Create handlers incrementally:
1. Start with auth endpoints
2. Add user endpoints
3. Test in browser
4. Add remaining endpoints

### Step 3.2: Setup Browser Worker

**Estimated Time**: 30 minutes

**Create `lib/api/mocks/browser.ts`**:

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Update `main.tsx`**:

```typescript
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/App';

async function enableMocking() {
  // Only enable MSW in development
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('./lib/api/mocks/browser');

  return worker.start({
    onUnhandledRequest: 'bypass', // Don't warn for unhandled requests
  });
}

enableMocking().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
```

**Update `.env.local`**:

```bash
VITE_ENABLE_MSW=true
```

### Step 3.3: Setup Node Worker (Tests)

**Estimated Time**: 30 minutes

**Create `lib/api/mocks/server.ts`**:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Create `lib/api/mocks/setup.ts`**:

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

**Update `vite.config.ts`**:

```typescript
export default defineConfig({
  // ... other config

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/lib/api/mocks/setup.ts'], // ADD THIS
    // ... other test config
  },
});
```

### Step 3.4: Test MSW Integration

**Estimated Time**: 1 hour

```bash
# Test in browser
nx serve web

# Open browser, check Network tab
# Should see "[MSW]" prefix on intercepted requests

# Test in unit tests
nx test web

# Verify MSW intercepts API calls in tests
```

**Verification**:
1. Browser console shows: `[MSW] Mocking enabled`
2. Network tab shows intercepted requests
3. App works with mock data
4. Tests pass with MSW

---

## Phase 4: React Compiler (Optional, 2-4 hours)

**Note**: This phase is optional but highly recommended for performance benefits.

### Step 4.1: Install React Compiler

**Estimated Time**: 30 minutes

```bash
# Install Babel plugin
npm install -D babel-plugin-react-compiler

# Verify installation
npm list babel-plugin-react-compiler
```

### Step 4.2: Configure Babel

**Estimated Time**: 30 minutes

**Create `babel.config.js`**:

```javascript
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19',
    }],
  ],
};
```

**Update `vite.config.ts`**:

```typescript
export default defineConfig({
  // ... other config

  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
    nxViteTsPaths(),
  ],
});
```

### Step 4.3: Test Compiler

**Estimated Time**: 1 hour

```bash
# Build with compiler
nx build web --configuration=production

# Verify no errors
# Check bundle size (should be similar or smaller)
```

**Manual Testing**:
1. Serve production build: `nx serve web --configuration=production`
2. Test all features
3. Check console for errors
4. Verify performance (should feel snappier)

### Step 4.4: Remove Manual Memoization (Optional)

**Estimated Time**: 1-2 hours

**Before**:
```typescript
import { useMemo, useCallback, memo } from 'react';

const MemoizedTable = memo(DataTable);

function Component({ data }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const handleClick = useCallback((id) => {
    onClick(id);
  }, [onClick]);

  return <MemoizedTable data={sortedData} onClick={handleClick} />;
}
```

**After** (React Compiler handles it):
```typescript
function Component({ data }) {
  const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

  const handleClick = (id) => {
    onClick(id);
  };

  return <DataTable data={sortedData} onClick={handleClick} />;
}
```

**Gradual Approach**:
1. Test with manual memoization still in place
2. Remove memoization from one component
3. Test thoroughly
4. Repeat for other components
5. Keep memoization if compiler doesn't optimize well

---

## Post-Migration Validation

### Performance Testing

**Bundle Size**:
```bash
# Build production
nx build web --configuration=production

# Check sizes
ls -lh dist/apps/web/assets/*.js

# Compare to pre-migration-bundle.txt
# Target: 15% reduction (450KB → 380KB)
```

**Build Time**:
```bash
# Time production build
time nx build web --configuration=production

# Compare to baseline
# Target: 20% faster (10s → 8s)
```

**Runtime Performance**:
```bash
# Serve production build
nx preview web

# Open browser DevTools
# Run Lighthouse audit
# Check Core Web Vitals:
# - LCP < 2.0s
# - INP < 150ms
# - CLS < 0.1
```

### Functionality Testing

**Manual Test Checklist**:
- [ ] Login works
- [ ] Register works
- [ ] Logout works
- [ ] Token refresh works
- [ ] Users CRUD works
- [ ] Companies CRUD works
- [ ] Modules CRUD works
- [ ] Employees CRUD works
- [ ] Permissions management works
- [ ] SimpleText module works
- [ ] Role-based routing works
- [ ] Error handling works
- [ ] Loading states show correctly

### Automated Testing

```bash
# Run all tests
nx test web

# Run E2E tests
nx e2e web-e2e

# Check test coverage
nx test web --coverage

# Target: >80% coverage
```

### Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Rollback Procedures

### Quick Rollback (if issues found)

```bash
# Stash current work
git stash

# Return to pre-migration state
git checkout v1.0-pre-migration

# Reinstall dependencies
npm ci

# Test
nx serve web
```

### Partial Rollback (roll back specific upgrades)

**Rollback React 19**:
```bash
npm install react@18.2.0 react-dom@18.2.0
```

**Rollback TypeScript 5.7**:
```bash
npm install -D typescript@5.0.0
```

**Rollback Vite 6**:
```bash
npm install -D vite@5.0.0
```

**Rollback TanStack Query v5**:
```bash
npm install @tanstack/react-query@4
npm install -D @tanstack/react-query-devtools@4

# Revert code changes
# - isPending → isLoading
# - gcTime → cacheTime
```

**Remove MSW**:
```bash
npm uninstall msw

# Remove files
rm -rf apps/web/src/lib/api/mocks

# Revert main.tsx changes
```

**Disable React Compiler**:
```javascript
// vite.config.ts
plugins: [
  react(), // Remove babel.plugins configuration
]

// Or comment out in babel.config.js
// plugins: [
//   ['babel-plugin-react-compiler', { target: '19' }],
// ],
```

### Full Rollback to Baseline

```bash
# Abandon migration branch
git checkout main

# Delete migration branch
git branch -D migration/frontend-2025

# Delete migration tag
git tag -d v1.0-pre-migration
```

---

## Troubleshooting

### Issue: Build Fails After React 19 Upgrade

**Symptoms**:
```
Error: Cannot find module 'react/jsx-runtime'
```

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Nx cache
nx reset

# Rebuild
nx build web
```

### Issue: Type Errors with TypeScript 5.7

**Symptoms**:
```
Error: Variable 'name' is used before being assigned
```

**Solution**:
```typescript
// Add explicit initialization or type guards
let name: string | undefined;

// Or use optional chaining
console.log(name?.toUpperCase());

// Or ensure assignment before use
if (user) {
  const name = user.name; // Scoped to if block
  console.log(name.toUpperCase());
}
```

### Issue: TanStack Query v5 Errors

**Symptoms**:
```
Error: isLoading is not a property of useQuery
```

**Solution**:
```bash
# Verify all instances replaced
grep -r "isLoading" apps/web/src --include="*.tsx"

# Replace remaining instances with isPending
```

### Issue: MSW Not Intercepting Requests

**Symptoms**:
- Browser console doesn't show `[MSW] Mocking enabled`
- API calls go to real backend

**Solution**:
```bash
# Verify MSW initialized
cat apps/web/public/mockServiceWorker.js

# Re-initialize if missing
npx msw init public/ --save

# Check environment variable
echo $VITE_ENABLE_MSW
# Should be 'true'

# Restart dev server
nx serve web
```

### Issue: React Compiler Breaking Component

**Symptoms**:
- Component rendering incorrectly
- Infinite re-renders
- Performance regression

**Solution**:
```javascript
// Disable compiler for specific component
'use no memo'; // Add at top of component

function ProblematicComponent() {
  'use no memo';
  // Component code...
}

// Or disable compiler entirely
// Remove from babel.config.js
```

### Issue: Slow Build After Migration

**Symptoms**:
- Build takes longer than before
- CPU usage high during build

**Solution**:
```bash
# Clear all caches
nx reset
rm -rf node_modules/.vite
rm -rf dist

# Rebuild
nx build web

# If still slow, check Node.js version
node --version
# Should be 20+ for TypeScript 5.7 compile caching
```

### Issue: Tests Failing with MSW

**Symptoms**:
```
Error: [MSW] Failed to execute 'fetch' on 'Window'
```

**Solution**:
```typescript
// Verify setup.ts is loaded
// vite.config.ts
test: {
  setupFiles: ['./src/lib/api/mocks/setup.ts'], // Check path
}

// Ensure server is started
// setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Success Metrics

### Performance Improvements

**Target**:
- Bundle size: -15% (450KB → 380KB)
- Build time: -20% (10s → 8s)
- Type check: -30% (5s → 3.5s)
- Re-renders: -30-40% (React Compiler)

**Measure**:
```bash
# Bundle size
ls -lh dist/apps/web/assets/*.js

# Build time
time nx build web --configuration=production

# Type check
time npx tsc --noEmit
```

### Functionality Verification

**All Features Working**:
- [ ] Authentication (login, register, logout)
- [ ] User management (CRUD)
- [ ] Company management (CRUD)
- [ ] Module management (CRUD)
- [ ] Employee management (CRUD)
- [ ] Permission management
- [ ] SimpleText module
- [ ] Role-based routing
- [ ] Token refresh

### Quality Metrics

**Tests**:
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Coverage >80%

**Code Quality**:
- [ ] No TypeScript errors
- [ ] No console errors in production
- [ ] No ESLint warnings

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Pre-Migration Checklist | 1h | 1h |
| Phase 1: Core Upgrades | 4-6h | 5-7h |
| Phase 2: Code Updates | 2-3h | 7-10h |
| Phase 3: MSW Integration | 4-6h | 11-16h |
| Phase 4: React Compiler (optional) | 2-4h | 13-20h |
| Post-Migration Validation | 2h | 15-22h |
| **Total** | **15-22h** | - |

**Recommended Schedule**:
- Day 1: Pre-migration + Phase 1 (6-8h)
- Day 2: Phase 2 + Phase 3 start (6-8h)
- Day 3: Phase 3 finish + Phase 4 (6-8h)
- Day 4: Validation + fixes (4-6h)

**Team of 2**: 2-3 days
**Team of 3**: 1.5-2 days

---

## Final Checklist

Before considering migration complete:

### Pre-Production
- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Performance metrics meet targets
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Bundle size within target
- [ ] Build time within target

### Documentation
- [ ] Update package.json
- [ ] Update README if needed
- [ ] Document any breaking changes
- [ ] Update team on changes

### Deployment
- [ ] Test in staging environment
- [ ] Verify MSW disabled in production
- [ ] Check environment variables
- [ ] Test production build
- [ ] Monitor error tracking (Sentry, etc.)

### Communication
- [ ] Notify team of migration completion
- [ ] Share performance improvements
- [ ] Document any gotchas
- [ ] Provide training on new features (React Compiler, MSW)

---

## Support & Resources

### Official Documentation
- React 19: https://react.dev/blog/2024/12/05/react-19
- TypeScript 5.7: https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/
- Vite 6: https://vitejs.dev/blog/announcing-vite6
- TanStack Query v5: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5
- MSW: https://mswjs.io/docs/

### Migration Guides
- TanStack Query v4 → v5: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5
- React 18 → 19: https://react.dev/blog/2024/12/05/react-19

### Community Support
- React Discord: https://discord.gg/react
- TanStack Discord: https://discord.gg/tanstack
- Stack Overflow: Tag questions with `react-19`, `tanstack-query-v5`, `msw`

---

**Migration Guide Version**: 1.0
**Last Updated**: January 2025
**Estimated Completion**: 15-22 hours
**Risk Level**: LOW
**Rollback Available**: YES

**Ready to migrate. Good luck! 🚀**
