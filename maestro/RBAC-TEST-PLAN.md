# RBAC Test Backlog

Backlog of role-based access control scenarios that should be covered by Maestro web smoke flows. Audit done against `apps/web/src/app/routes.tsx` route gates (`ADMIN_ROLES`, `OWNER_ROLES`, `EMPLOYEE_OWNER_ROLES`) and `EmployeePermissionsPage` per-module Read/Write/Delete matrix.

This is a planning doc, not a how-to. The composition principle, gotchas, and template come from `README.md`. Pick an item, follow that template.

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

| #   | Setup                                         | Test                                                              |
| --- | --------------------------------------------- | ----------------------------------------------------------------- |
| 21  | EMPLOYEE without Read on `Klienci`            | open `/modules/clients` → `/module-access-denied` or empty layout |
| 22  | EMPLOYEE with Read but no Write on `Klienci`  | "Dodaj klienta" button hidden / disabled                          |
| 23  | EMPLOYEE with Read but no Delete on `Klienci` | per-row action menu lacks `Usuń`                                  |
| 24  | (repeat for each of 8 modules × 3 perms)      | 24 sub-cases                                                      |

### Blockers

1. **No way to toggle permissions via UI from a Maestro flow** — `Zarządzaj uprawnieniami` button is icon-only with `aria-label`, Maestro Web's `tapOn` doesn't match aria. See `company/employees-permissions.yaml` (tagged `wip`).
2. **Demo seeder grants ALL permissions to both seeded employees**. Need either:
   - A new seeded employee with deliberately reduced permissions (e.g. `e.read-only@biuro-nowak.pl`), or
   - A second EmployeePermissionsPage flow that mutates state — but this contradicts the "read-only smoke" default.

### Recommended unblock path

- Add visible text or HTML `id="..."` to the `Zarządzaj uprawnieniami` / `Edytuj pracownika` / `Usuń pracownika` buttons in `employees-list.tsx` (UX win + testability)
- Add a third seeded employee with a curated permission profile to `demo-data-seeder.service.ts` (e.g. read-only on Klienci, no Documents access at all)
- Then implement the 24-case matrix as ~3 flow files (one per scope: page-access, write-buttons, delete-buttons)

**Effort:** large, multi-day, requires app + seeder changes. Park until P1-P3 done.

---

## Priority 5 — Token edge cases

Out of scope for Maestro Web. Better in Playwright (`apps/web-e2e/`) or backend e2e (`apps/api-e2e/`).

| #   | Scenario                                                    | Where to test                     |
| --- | ----------------------------------------------------------- | --------------------------------- |
| 25  | Expired access token                                        | Playwright with `--clock` mocking |
| 26  | Tampered JWT signature                                      | API e2e                           |
| 27  | User from deleted Company                                   | API e2e                           |
| 28  | User deactivated mid-session (`setUserActiveStatus(false)`) | Playwright                        |
| 29  | `tokenVersion` bump invalidates active sessions             | Playwright + DB seeding           |

These scenarios need API mocking, clock manipulation, or DB writes mid-test — features Maestro Web does not have.

---

## Priority 6 — Cross-tenant data isolation

The most security-critical class. Currently zero coverage in any test layer.

| #   | Scenario                                                            | Expected           |
| --- | ------------------------------------------------------------------- | ------------------ |
| 30  | Company A owner navigates to `/clients/<id-of-Company-B-client>`    | 404                |
| 31  | Company A employee navigates to `/tasks/<id-of-Company-B-task>`     | 404                |
| 32  | Company A direct API call `GET /api/clients/<companyB-id>`          | 403                |
| 33  | Company A creates an offer with `companyId=B` in payload            | 403 / silent strip |
| 34  | Cross-tenant settlement / invoice / lead / time-entry detail access | 404 each           |

### Blockers

- Demo seeder has only Company B ("Biuro Rachunkowe Nowak"). Need Company A added (e.g. "Test Company A" with its own owner + employees + clients) for cross-tenant scenarios.
- Maestro Web is not the right layer for #32-#33 (raw API). API e2e (`apps/api-e2e/`) is.
- #30, #31, #34 are reachable from Maestro Web once the seeder has two companies — but require knowing a Company B entity ID, which means the test must first log in as the OTHER company to read it. Two browser sessions in one Maestro run is unsupported.

### Recommended unblock path

- API e2e (`apps/api-e2e/`) with both companies seeded — cleanest, fastest, exercises the actual security boundary.
- Maestro web only for the "owner sees friendly 404" UI affordance, after seeder grows a second company.

**Effort:** medium for API e2e (existing harness in `apps/api-e2e/`), large for Maestro web (needs seeder work first).

---

## Suggested execution order

1. ✅ **P2 — sidebar visibility** — DONE in commit (see git log)
2. ✅ **P1 — denied-access matrix** — 4 new flow files DONE
3. ✅ **P3 — logged-out redirects** — 1 new flow file DONE
4. **P4 — module permissions** — only after employees-list buttons get visible text or `id="..."` (separate ticket)
5. **P5 — token edge cases** — defer to Playwright in `apps/web-e2e/` (existing fixtures already model auth)
6. **P6 — cross-tenant isolation** — defer to `apps/api-e2e/`, add second company to seeder first

Coverage summary (Maestro web):

| Priority | Coverage                      | Flows added              |
| -------- | ----------------------------- | ------------------------ |
| P1       | 16/16 routes                  | 4 files (consolidated)   |
| P2       | 3/3 roles                     | 0 files (edits in place) |
| P3       | 4/4 routes                    | 1 file                   |
| P4       | 0% (blocked)                  | —                        |
| P5       | 0% (out of scope for Maestro) | —                        |
| P6       | 0% (out of scope for Maestro) | —                        |

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
