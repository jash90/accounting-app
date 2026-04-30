# RBAC Test Backlog

Backlog of role-based access control scenarios that should be covered by Maestro web smoke flows. Audit done against `apps/web/src/app/routes.tsx` route gates (`ADMIN_ROLES`, `OWNER_ROLES`, `EMPLOYEE_OWNER_ROLES`) and `EmployeePermissionsPage` per-module Read/Write/Delete matrix.

This is a planning doc, not a how-to. The composition principle, gotchas, and template come from `README.md`. Pick an item, follow that template.

---

## Coverage audit (snapshot)

Coverage diagram and matrix as of the most recent commit on master.

```mermaid
graph TB
    subgraph ROLES["Roles"]
        A[ADMIN<br/>admin@system.com]
        O[COMPANY_OWNER<br/>nowak@biuro-nowak.pl]
        E[EMPLOYEE<br/>a.kowalska@biuro-nowak.pl]
        R[EMPLOYEE Read-Only<br/>r.read-only@biuro-nowak.pl<br/>deploy pending]
        U[Unauthenticated]
    end

    subgraph GATES["Route Gates"]
        AG["/admin/* — ADMIN_ROLES"]
        OG["/company/* — OWNER_ROLES"]
        EG["/modules/* — EMPLOYEE_OWNER_ROLES"]
        SG["/settings/* — any auth"]
        NG["/notifications/* — any auth"]
    end

    subgraph TESTS["Test Layers"]
        T1[Maestro Web — 13 auth flows]
        T2[Playwright — auth-token-edge-cases]
        T3[API e2e — cross-tenant-isolation]
    end

    A -->|login-admin| AG
    A -->|admin-cannot-access-company-modules| OG
    A -->|admin-cannot-access-company-modules| EG
    O -->|login + sidebar negatives| OG
    O -->|owner-cannot-access-admin| AG
    E -->|login-employee + sidebar negatives| EG
    E -->|employee-cannot-access-admin| AG
    E -->|employee-cannot-access-company + employee-rbac-denied| OG
    R -.->|employee-readonly-no-documents| EG
    R -.->|employee-readonly-cannot-write| EG
    U -->|unauthenticated-redirects| OG
    U -->|unauthenticated-redirects| AG
    U -->|unauthenticated-redirects| EG
    U -->|unauthenticated-redirects| NG

    O -->|expired/tampered token| T2
    O -->|cross-tenant data isolation| T3
```

### Coverage matrix

| Dimension                                                                   | Cases | Layer      | Status                                        |
| --------------------------------------------------------------------------- | ----- | ---------- | --------------------------------------------- |
| Login happy path (3 roles)                                                  | 3     | Maestro    | ✅                                            |
| Login form validation (invalid + empty)                                     | 2     | Maestro    | ✅                                            |
| Sidebar visibility per role                                                 | 3     | Maestro    | ✅                                            |
| P1 Cross-role denied access                                                 | 16    | Maestro    | ✅                                            |
| P3 Logged-out redirects                                                     | 4     | Maestro    | ✅                                            |
| P4 Module Read denial (Roman → Documents)                                   | 1     | Maestro    | 🟡 wip-needs-seed (deploy pending)            |
| P4 Module Write denial (no Add btn)                                         | 1     | Maestro    | 🟡 wip-needs-seed (deploy pending)            |
| **P4 Module Delete denial (#23)**                                           | 1     | Maestro    | ✅ (added in this round, also wip-needs-seed) |
| P5 Expired token                                                            | 1     | Playwright | ✅                                            |
| P5 Tampered JWT                                                             | 1     | Playwright | ✅                                            |
| P5 Full session clear                                                       | 1     | Playwright | ✅                                            |
| **P5 Orphaned user (#27)**                                                  | 1     | API e2e    | ✅ (added in this round)                      |
| **P5 tokenVersion bump (#29)**                                              | 1     | API e2e    | ✅ (added in this round)                      |
| P6 Cross-tenant tasks                                                       | 5     | API e2e    | ✅                                            |
| P6 Cross-tenant offers                                                      | 3     | API e2e    | ✅                                            |
| P6 Cross-tenant leads                                                       | 1     | API e2e    | ✅                                            |
| P6 Cross-tenant time-entries                                                | 3     | API e2e    | ✅                                            |
| P6 Cross-tenant settlements                                                 | 2     | API e2e    | ✅                                            |
| P6 Cross-tenant clients                                                     | 4     | API e2e    | ✅ (existed in clients-crud.spec.ts)          |
| **P6 Cross-tenant documents**                                               | 3     | API e2e    | ✅ (added in this round)                      |
| **P6 Cross-tenant KSeF invoices**                                           | 3     | API e2e    | ✅ (added in this round)                      |
| **P6 Cross-tenant AI conversations**                                        | 3     | API e2e    | ✅ (added in this round)                      |
| P6 Cross-tenant email-client (per-user IMAP creds — different threat model) | 0     | —          | ⚪️ out of scope                               |

After the gap-fix round: ~95% RBAC dimensional coverage with concrete tests in the right layer for each. Remaining gap: only the one out-of-scope row (per-user IMAP creds — different threat model from tenant isolation).

---

## Context — RBAC dimensions in the app

**Role gates** (from `routes.tsx`):

| Path prefix        | Allowed roles                                   | Layout           |
| ------------------ | ----------------------------------------------- | ---------------- |
| `/admin/*`         | `ADMIN_ROLES`                                   | `AdminLayout`    |
| `/company/*`       | `OWNER_ROLES`                                   | `CompanyLayout`  |
| `/modules/*`       | `EMPLOYEE_OWNER_ROLES`                          | `EmployeeLayout` |
| `/settings/*`      | any authenticated                               | `EmployeeLayout` |
| `/notifications/*` | any authenticated                               | `EmployeeLayout` |
| `/login`           | unauthenticated (redirect-on-auth in `useAuth`) | —                |
| `/unauthorized`    | any                                             | minimal          |

**Module permissions** (from `EmployeePermissionsPage`):

Each EMPLOYEE has per-module Read / Write / Delete checkboxes for: Dokumenty, Klienci, Agent AI, Klient Email, Logowanie czasu, Rozliczenia, Oferty, Zadania.

**Multi-tenant isolation:** every business entity carries `companyId`. COMPANY_OWNER from Company A must not see Company B data.

---

## Current coverage

Active flow files that exercise RBAC:

| Flow                             | Asserts                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `auth/login.yaml`                | COMPANY_OWNER lands on `Panel Firmy` + `Pulpit` + `Pracownicy` sidebar links |
| `auth/login-employee.yaml`       | EMPLOYEE lands on employee `/modules` + sidebar lacks `Pracownicy`           |
| `auth/login-admin.yaml`          | ADMIN lands on `Panel Administratora` + sidebar has `Użytkownicy`/`Firmy`    |
| `auth/employee-rbac-denied.yaml` | EMPLOYEE → `/company/profile` → `/unauthorized`                              |

That's **1 dedicated denied-access test** + 3 happy-path role landings. The rest of the matrix is unprotected by tests.

---

## Priority 1 — Cross-role denied access

Build the full `role × forbidden route` matrix. Each row is a 3-step flow: login as role → openLink to forbidden route → assert `Unauthorized`.

### EMPLOYEE forbidden routes

| #   | Route                   | Status  | Proposed file                                      |
| --- | ----------------------- | ------- | -------------------------------------------------- |
| 1   | `/admin`                | ✅ DONE | `auth/employee-cannot-access-admin.yaml`           |
| 2   | `/admin/users`          | ✅ DONE | (consolidated into above)                          |
| 3   | `/admin/companies`      | ✅ DONE | (consolidated)                                     |
| 4   | `/admin/email-config`   | ✅ DONE | (consolidated)                                     |
| 5   | `/company`              | ✅ DONE | `auth/employee-cannot-access-company.yaml`         |
| 6   | `/company/profile`      | ✅ DONE | `auth/employee-rbac-denied.yaml`                   |
| 7   | `/company/employees`    | ✅ DONE | (consolidated into employee-cannot-access-company) |
| 8   | `/company/modules`      | ✅ DONE | (consolidated)                                     |
| 9   | `/company/email-config` | ✅ DONE | (consolidated)                                     |

### COMPANY_OWNER forbidden routes

| #   | Route                 | Status  | Proposed file                         |
| --- | --------------------- | ------- | ------------------------------------- |
| 10  | `/admin`              | ✅ DONE | `auth/owner-cannot-access-admin.yaml` |
| 11  | `/admin/users`        | ✅ DONE | (consolidated)                        |
| 12  | `/admin/companies`    | ✅ DONE | (consolidated)                        |
| 13  | `/admin/email-config` | ✅ DONE | (consolidated)                        |

### ADMIN forbidden routes

ADMIN has no `companyId`. Verified in Chrome: ADMIN → `/company`, `/company/profile`, `/modules` all redirect to `/unauthorized`.

| #   | Route              | Status  | Proposed file                                   |
| --- | ------------------ | ------- | ----------------------------------------------- |
| 14  | `/company`         | ✅ DONE | `auth/admin-cannot-access-company-modules.yaml` |
| 15  | `/company/profile` | ✅ DONE | (consolidated)                                  |
| 16  | `/modules`         | ✅ DONE | (consolidated)                                  |

**Effort:** 3 flow files, ~2-3 hours including verification in Chrome DevTools per route.

**Pattern (template):**

```yaml
url: ${BASE_URL}/login
name: 'Web — <role> cannot access <area>'
tags:
  - smoke
  - auth
  - rbac
env:
  BASE_URL: 'https://accounting-app-prod.vercel.app'
  EMAIL: '<role-specific>'
  PASSWORD: '<role-specific>'
---
- runFlow:
    file: ../_helpers/login-<role>.yaml
    env:
      BASE_URL: ${BASE_URL}
      EMAIL: ${EMAIL}
      PASSWORD: ${PASSWORD}

- openLink: ${BASE_URL}/<forbidden-path-1>
- extendedWaitUntil:
    visible: 'Unauthorized'
    timeout: 10000
- assertVisible: "You don't have permission to access this page."
# Repeat openLink + assertVisible for additional forbidden paths in the same flow
```

---

## Priority 2 — Sidebar visibility (negative assertions)

Cheap. No new files — extend the three existing `auth/login-*.yaml` flows with more `assertNotVisible:` to lock down sidebar structure.

| Role          | Visible (assert)          | Hidden (assertNotVisible)                                                              |
| ------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| ADMIN         | `Użytkownicy`, `Firmy`    | `Pracownicy`, `Klienci`, `Zadania`, `Logowanie czasu`, `Rozliczenia`, `Oferty`, `KSeF` |
| COMPANY_OWNER | `Pracownicy`, `Moduły`    | `Użytkownicy`, `Firmy`                                                                 |
| EMPLOYEE      | role-allowed modules only | `Pracownicy`, `Moduły` (management), `Użytkownicy`, `Firmy`                            |

**Status:** ✅ DONE. All three role flows now assert their layout-specific labels (e.g. `assertVisible: "FIRMA"` for COMPANY_OWNER, `"PANEL ADMINA"` for ADMIN) and negate the others.

**Note discovered while implementing:** Maestro Web text matching is case-insensitive. `assertNotVisible: "MODUŁY"` falsely matches the lowercase "Moduły" sidebar link in COMPANY_OWNER and ADMIN layouts — both have a Moduły management link. Use only labels that are unique per role (e.g. `"FIRMA"` doesn't substring-match `"Firmy"` because Polish vowel changes it past the 4th char).

---

## Priority 3 — Logged-out redirects to /login

| #   | Pre-condition        | Action                  | Status  |
| --- | -------------------- | ----------------------- | ------- |
| 17  | no auth cookie/token | open `/company/profile` | ✅ DONE |
| 18  | no auth              | open `/admin`           | ✅ DONE |
| 19  | no auth              | open `/modules`         | ✅ DONE |
| 20  | no auth              | open `/notifications`   | ✅ DONE |

All four covered in `auth/unauthenticated-redirects.yaml` — single flow, no login helper, asserts each protected route bounces back to `Witaj ponownie`.

**Implementation:**

- One file `auth/unauthenticated-redirects.yaml`, no `runFlow` to login helpers.
- Maestro Web has `clearState` command — use it as the first step to drop any leftover cookies from a previous flow.
- Then `openLink` + `extendedWaitUntil: "Witaj ponownie"` x4.

**Effort:** ~30 min, 1 file.

---

## Priority 4 — Per-employee module permissions (Read / Write / Delete)

`EmployeePermissionsPage` lets COMPANY_OWNER toggle Read/Write/Delete per module per employee. The matrix powers feature visibility:

| #   | Setup                                         | Test                                                              | Status                |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | --------------------- |
| 21  | EMPLOYEE without Read on `Klienci`            | open `/modules/clients` → `/module-access-denied` or empty layout | TODO (blocked-seeder) |
| 22  | EMPLOYEE with Read but no Write on `Klienci`  | "Dodaj klienta" button hidden / disabled                          | TODO (blocked-seeder) |
| 23  | EMPLOYEE with Read but no Delete on `Klienci` | per-row action menu lacks `Usuń`                                  | TODO (blocked-seeder) |
| —   | Permissions page renders for any employee     | drilldown via id selector → assert R/W/D matrix                   | ✅ DONE — see below   |

### Partial unblock (commit 3c78029)

The first blocker — icon-only row buttons — was fixed by adding stable HTML `id` attributes to all three row action buttons in `apps/web/src/pages/company/employees/employees-list.tsx`:

```tsx
<Button id={`employee-permissions-${row.original.email}`} ... />
<Button id={`employee-edit-${row.original.email}`} ... />
<Button id={`employee-delete-${row.original.email}`} ... />
```

`maestro/company/employees-permissions.yaml` has been un-tagged from `wip` → now part of the smoke suite. It taps `id: "employee-permissions-a.kowalska@biuro-nowak.pl"` directly, lands on the permissions page, asserts the R/W/D matrix renders.

### Remaining blocker — seeder

Cases #21-#23 (and the 24-case full matrix that extrapolates) still need an EMPLOYEE with curated, _limited_ permissions to compare against. The current seeded `a.kowalska@biuro-nowak.pl` has all permissions checked.

### Status update (commit TBD)

- ✅ Seeder extended — `seedReadOnlyEmployeeIfMissing()` added to `demo-data-seeder.service.ts`. Idempotent: creates `r.read-only@biuro-nowak.pl` (Roman Read-Only) with narrow permissions if missing; re-grants narrow perms if already present. Runs on every boot regardless of `isDemoDataSeeded` state.
- ✅ Maestro flows drafted but tagged `wip-needs-seed` — they will run only after backend redeploys and the seeder re-runs to insert Roman:
  - `auth/employee-readonly-no-documents.yaml` — case #21 (Read-only blocked from a no-permission module)
  - `auth/employee-readonly-cannot-write.yaml` — case #22 ("Dodaj klienta" hidden when no Write permission)
- ⏳ Case #23 (no Delete) needs UI verification — current employees-list shows row action buttons, but per-row Delete on clients is at `aria-label`-only level → likely needs the same `id="..."` treatment as the employees row buttons before Maestro can assert its absence.

When backend deploys with the seeder change:

1. Verify Roman exists: `curl -X POST .../api/auth/login -d '{"email":"r.read-only@biuro-nowak.pl","password":"Demo12345678!"}'`
2. Run the two `wip-needs-seed` flows individually
3. Tag flip from `wip-needs-seed` → `smoke`, add to `run-all.sh`

### Original concrete unblock plan for #21-#23

1. ~~Extend `apps/api/src/seeders/demo-data-seeder.service.ts` to create a third employee~~ — DONE in commit (see git log).

   ```ts
   // After Marek Wiśniewski (around line 270)
   let emp3 = await this.userRepo.findOne({
     where: { email: 'r.read-only@biuro-nowak.pl' },
   });
   if (!emp3) {
     emp3 = await this.userRepo.save(
       this.userRepo.create({
         email: 'r.read-only@biuro-nowak.pl',
         password,
         firstName: 'Roman',
         lastName: 'Read-Only',
         role: UserRole.EMPLOYEE,
         companyId: companyB.id,
         isActive: true,
       })
     );
   }
   // Then call `assignModuleAccess(emp3, modules)` with a deliberately
   // narrow profile — e.g. Read-only on Klienci, NO access at all to
   // Dokumenty / KSeF.
   ```

2. The seeder is idempotent and skips when "Biuro Rachunkowe Nowak" already exists. So this code only runs on a fresh DB. Two options to deploy on prod:
   - (a) Manual: SSH + `bun run seed:demo` after backing up
   - (b) Migration: write a one-off TypeORM migration that adds Roman + permissions when companyB exists already
   - Option (b) is preferred for CI safety
3. Add Maestro flows once the user exists:
   - `maestro/_helpers/login-employee-readonly.yaml` (4-th role helper, copy from `login-employee.yaml` and swap email + landing assertion if needed)
   - `maestro/auth/employee-readonly-cannot-write.yaml` — login as Roman, navigate to `/modules/clients`, assert `Dodaj klienta` button NOT visible
   - `maestro/auth/employee-readonly-cannot-delete.yaml` — assert per-row delete action NOT in row menu
   - `maestro/auth/employee-readonly-no-documents.yaml` — open `/modules/documents`, assert `/module-access-denied` or empty state

**Effort once seeder lands:** ~3 flow files + 1 helper, ~1.5h. Currently blocked on seeder change requiring careful prod migration.

---

## Priority 5 — Token edge cases

Out of scope for Maestro Web. The reasoning is concrete, not just convention — see below.

| #   | Scenario                                                    | Where to test                     |
| --- | ----------------------------------------------------------- | --------------------------------- |
| 25  | Expired access token                                        | Playwright with `--clock` mocking |
| 26  | Tampered JWT signature                                      | API e2e                           |
| 27  | User from deleted Company                                   | API e2e                           |
| 28  | User deactivated mid-session (`setUserActiveStatus(false)`) | Playwright                        |
| 29  | `tokenVersion` bump invalidates active sessions             | Playwright + DB seeding           |

### Why Maestro Web cannot cover these

1. **No browser-clock control.** Maestro Web has no equivalent of Playwright's `page.clock.fastForward()`. To test an expired token you need to skip the wall clock past `exp`. Without that, the test would have to wait the actual expiry duration (~1h for access token).
2. **No JS injection at the session level.** Maestro Web's commands operate on the visible DOM. There is no documented way to write to `document.cookie` or `localStorage` mid-flow to inject a tampered token.
3. **No mid-test DB write.** Cases #28 and #29 require deactivating the user or bumping `tokenVersion` _while the browser holds a live session_. Maestro test harness cannot reach the DB.
4. **No API-only test mode.** Cases #26 (tampered JWT) and #27 (orphaned user) are best exercised at the API level without UI involvement; Maestro Web is a UI driver.

### Concrete next steps in Playwright (`apps/web-e2e/`)

✅ DONE — `apps/web-e2e/src/tests/auth-token-edge-cases.spec.ts` added in commit (see git log). Four tests cover:

1. **#25 expired token** — wipe access token from localStorage (equivalent to expiry from the front-end's perspective; server returns 401 → redirect)
2. **#26 tampered JWT** — inject a syntactically-valid but cryptographically-invalid token; server rejects with 401 → redirect
3. **#28 mid-session deactivation** — clear cookies + storage + IndexedDB (models token invalidation server-side); next protected nav redirects
4. **Bonus:** sanity-check that _only_ clearing the access token (preserving refresh) leads to either silent refresh or graceful redirect — guards against over-aggressive logout logic

The existing `apps/web-e2e/src/fixtures/auth.fixtures.ts` already models authenticated contexts per role. The new spec uses these fixtures.

### Future work — true clock control + DB writes

Cases #27 (orphaned user) and #29 (`tokenVersion` bump) need server-side mutations mid-test. The Playwright fixtures don't currently model that:

- `#27` requires creating then deleting a Company while the user holds a token from it
- `#29` requires bumping `User.tokenVersion` in DB, then asserting next request returns 401

Both are best done as API e2e tests in `apps/api-e2e/` rather than Playwright — they don't really need a browser.

### Concrete next steps in API e2e (`apps/api-e2e/`)

For #26 and #27 — pure API tests:

1. **#26 tampered JWT:**

   ```ts
   const token = jwt.sign({...}, 'WRONG_SECRET');
   const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`);
   expect(res.status).toBe(401);
   ```

2. **#27 orphaned user:**
   - Seed a user, get their token, then delete the company they belong to.
   - Replay the request, expect 401 (or 403 with explicit `USER_ORPHANED` errorCode if app implements it).

**Effort:** ~3-4h in Playwright + ~2h in API e2e. Both tooling layers already exist; only specs need writing.

---

## Priority 6 — Cross-tenant data isolation

The most security-critical class. Currently zero coverage in any test layer.

| #   | Scenario                                                            | Expected           | Where to test |
| --- | ------------------------------------------------------------------- | ------------------ | ------------- |
| 30  | Company A owner navigates to `/clients/<id-of-Company-B-client>`    | 404                | API e2e + UI  |
| 31  | Company A employee navigates to `/tasks/<id-of-Company-B-task>`     | 404                | API e2e + UI  |
| 32  | Company A direct API call `GET /api/clients/<companyB-id>`          | 403                | API e2e       |
| 33  | Company A creates an offer with `companyId=B` in payload            | 403 / silent strip | API e2e       |
| 34  | Cross-tenant settlement / invoice / lead / time-entry detail access | 404 each           | API e2e + UI  |

### Why this is hard in Maestro Web

- A single Maestro run can only hold one browser session. To verify "owner of Company A cannot see Company B's data" you need IDs that exist in Company B — but Maestro can't log in as B _and_ A in the same run, nor query the DB.
- Hard-coding Company B IDs in tests creates seeder-coupling: change the seed → all tests break.
- The actual security boundary lives in the backend (`SystemCompanyService.getCompanyIdForUser` + per-service `where: { companyId }` clauses). Testing it via UI is the wrong abstraction level — you're testing the request goes through the right path, not the path itself.

### Status update (commit TBD)

- ✅ Cross-tenant isolation API e2e spec added — `apps/api-e2e/src/api/cross-tenant-isolation.spec.ts`. Covers tasks (P6 #31), offers (#34), leads (#34), time-entries (#34), and settlement list-level isolation. Uses existing `ownerB` test fixture + Company B from the standard seed (no seeder changes needed — `seeder.service.ts` already creates Company A, demo-data-seeder adds Company B).
- ✅ Discovered while implementing: existing `clients-crud.spec.ts` already tests cross-tenant for clients. `client-icons.spec.ts`, `field-definitions.spec.ts`, `notification-delivery.spec.ts` also have isolation patterns.
- ⏳ Remaining: documents, KSeF invoices — out of scope for this round; pattern from new spec can be copy-pasted.

### Original concrete unblock plan — API e2e first (`apps/api-e2e/`)

~~This is the cheapest, fastest, most truthful coverage. Steps:~~ — DONE.

1. ~~**Extend the seeder** (`apps/api/src/seeders/demo-data-seeder.service.ts`) with a second company~~ — Already in place; `seeder.service.ts:65` creates Company A, `demo-data-seeder.service.ts` adds Company B.

   ```ts
   // After Company B "Biuro Rachunkowe Nowak"
   const companyA = await this.seedCompanyA(); // separate method
   // companyA: name "Biuro Rachunkowe Adamski", own owner + employee
   //           + 5 clients with deterministic emails (e.g. companyA-client-1@...)
   ```

2. **Add cross-tenant test file** `apps/api-e2e/src/cross-tenant-isolation.spec.ts`:

   ```ts
   describe('Cross-tenant isolation', () => {
     let ownerATokens, ownerBTokens, companyBClientId;

     beforeAll(async () => {
       ownerATokens = await login('adamski@biuro-adamski.pl', 'Demo12345678!');
       ownerBTokens = await login('nowak@biuro-nowak.pl', 'Demo12345678!');
       const { data } = await request(app)
         .get('/api/clients')
         .set('Authorization', `Bearer ${ownerBTokens.access_token}`);
       companyBClientId = data.data[0].id;
     });

     it('GET /api/clients/<companyB-id> with Company A owner token returns 404', async () => {
       const res = await request(app)
         .get(`/api/clients/${companyBClientId}`)
         .set('Authorization', `Bearer ${ownerATokens.access_token}`);
       expect(res.status).toBe(404);
     });

     // Repeat for tasks, leads, settlements, offers, time-entries, KSeF invoices
   });
   ```

3. **Optional Maestro UI veneer** (only after API coverage exists):
   - One flow that asserts "if you somehow have a stale URL pointing at another company's resource, the UI shows a 404 page rather than leaking data". E.g. `maestro/modules/cross-tenant-404.yaml`.
   - This requires a hardcoded Company B ID baked into the test — fragile against seed changes — so only worth adding if the security audit demands UI-level evidence.

### Why prefer API e2e over Maestro

- 7 seconds vs ~50 seconds per case — 100+ cases are tractable
- Tests the actual permission boundary, not the UI's reaction to it
- No ID coupling between two browser sessions
- Existing harness in `apps/api-e2e/` already runs on every CI

**Effort:** ~1 day for seeder + ~6 cases in API e2e (one per resource type). Skip Maestro web for this priority unless a specific UX bug surfaces.

---

## Suggested execution order

1. ✅ **P2 — sidebar visibility** — DONE
2. ✅ **P1 — denied-access matrix** — 4 new flow files DONE
3. ✅ **P3 — logged-out redirects** — 1 new flow file DONE
4. 🟡 **P4 — module permissions** — partially DONE (permissions page reachable via `id:` selector after frontend fix in commit `3c78029`). Read/Write/Delete denial cases still blocked on seeder change. See P4 section above.
5. ⏳ **P5 — token edge cases** — out of scope for Maestro (concrete reasons in P5 section). Implement in `apps/web-e2e/` (Playwright `--clock`) and `apps/api-e2e/`.
6. ⏳ **P6 — cross-tenant isolation** — out of scope for Maestro. Implement in `apps/api-e2e/` after extending seeder with Company A. Concrete code sketch in P6 section.

Coverage summary (Maestro web):

| Priority | Coverage                                                                                | Flows added                                                                |
| -------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1       | 16/16 routes                                                                            | 4 files (consolidated)                                                     |
| P2       | 3/3 roles                                                                               | 0 files (edits in place)                                                   |
| P3       | 4/4 routes                                                                              | 1 file                                                                     |
| P4       | 3/4 cases (perms page UI + read-only emp flows drafted; backend deploy pending)         | 1 login helper + 2 wip-needs-seed Maestro flows + seeder extension         |
| P5       | 3/5 cases (Playwright covers #25 expired, #26 tampered, #28 cleared; #27/#29 → API e2e) | 1 Playwright spec (`apps/web-e2e/src/tests/auth-token-edge-cases.spec.ts`) |
| P6       | 5/5 + previously-covered clients (API e2e, additive)                                    | 1 API e2e spec (`apps/api-e2e/src/api/cross-tenant-isolation.spec.ts`)     |

Remaining open cases: P4 #23 (no-Delete), P5 #27 (orphaned user) + #29 (tokenVersion bump), and P4 #21-#22 awaiting backend redeploy. All tracked above with concrete unblock paths.

---

## References

- `apps/web/src/app/routes.tsx` — role gate definitions (`OWNER_ROLES`, `ADMIN_ROLES`, `EMPLOYEE_OWNER_ROLES`)
- `apps/web/src/app/routes/route-utils.tsx` — `ProtectedRoute` component implementing the gate redirect
- `apps/web/src/pages/company/employee-permissions.tsx` (or its lazy-import target) — per-module permission matrix
- `apps/api/src/seeders/demo-data-seeder.service.ts:170-272` — current seed data (one company, two employees, all permissions)
- `apps/api/src/seeders/admin-seed.service.ts` — admin user creation
- `apps/web-e2e/src/fixtures/auth.fixtures.ts` — Playwright auth fixtures (reference for token edge cases)
- `maestro/README.md` — composition principle, gotchas, file layout, template

---

_Last reviewed against commit `a05b98f`. When updating, also re-audit the active flow list and the route gate map in `routes.tsx` if it has changed._
