# Podsumowanie testów per modul

> Wygenerowano: 2026-03-09 | Zaktualizowano: 2026-03-09 | Pliki testowe: 118 | Szacowana liczba przypadkow testowych: ~1981+

## Infrastruktura testowa

| Runner     | Zakres                 | Konfiguracja                   |
| ---------- | ---------------------- | ------------------------------ |
| Jest       | Backend unit + API e2e | `jest.config.ts` per projekt   |
| Vitest     | Frontend unit          | `vitest.config.ts` (happy-dom) |
| Playwright | Web e2e                | `playwright.config.ts`         |

## Tabela zbiorcza

| Modul         | Backend unit | Frontend unit |   API e2e   |   Web e2e    | Razem plikow |
| ------------- | :----------: | :-----------: | :---------: | :----------: | :----------: |
| Auth/RBAC     |      2       |       2       |    1+2=3    |    3+3=6     |      13      |
| Clients       |      4       |       0       |      4      |    1+3=4     |      12      |
| Tasks         |      0       |       0       |    0+4=4    |    3+5=8     |      12      |
| Time Tracking |      6       |       1       |    0+3=3    |    2+5=7     |      17      |
| Settlements   |      1       |       0       |    0+3=3    |    4+1=5     |      9       |
| Offers        |      1       |       0       |    0+2=2    |    2+2=4     |      7       |
| Documents     |      0       |       0       |    0+2=2    |    1+3=4     |      6       |
| Email Client  |      0       |       0       |    0+2=2    |    2+2=4     |      6       |
| Notifications |      1       |       0       |    0+3=3    |    1+3=4     |      8       |
| AI Agent      |      0       |       0       |    0+3=3    |    1+2=3     |      6       |
| Admin/Company |      0       |       0       |    0+3=3    |    5+1=6     |      9       |
| Email Config  |      0       |       0       |    0+2=2    |    0+2=2     |      4       |
| Modules/Perms |      0       |       0       |    0+1=1    |     0+1      |      2       |
| Common/Infra  |      4       |       6       |      1      |      3       |      14      |
| **Razem**     |    **19**    |     **9**     | **6+30=36** | **28+31=59** |   **125**    |

> Zmiana 2026-03-09: Dodano 31 nowych Web E2E specs (205 testow), 28 nowych API E2E specs (141 testow), 22 nowe Page Objects, 1 API test helper. Lacznie +346 nowych testow.

> Uwaga: 4 pliki frontend obsluguja wiele modulow (logger, filter-types, date, time, use-table-preferences) — policzone w Common/Infra.

---

## Auth / RBAC

### Backend unit

| Plik                                              | Describe                                                          | ~Testow |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `libs/auth/src/lib/services/auth.service.spec.ts` | AuthService > login                                               | 2       |
| `libs/rbac/src/lib/services/rbac.service.spec.ts` | RBACService - companyHasModule, companyHasModuleById, Performance | 10      |

### Frontend unit

| Plik                                                | Describe            | ~Testow |
| --------------------------------------------------- | ------------------- | ------- |
| `apps/web/src/lib/hooks/use-auth.test.tsx`          | useAuth hook        | ~10     |
| `apps/web/src/components/forms/login-form.test.tsx` | LoginForm component | ~8      |

### API e2e

| Plik                                | Describe                                          | ~Testow |
| ----------------------------------- | ------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/api.spec.ts`  | RBAC E2E — Auth, Admin, Owner, Employee endpoints | 8       |
| `apps/api-e2e/src/api/auth.spec.ts` | 🆕 Login valid/invalid, GET /me, change-password  | 5       |

### Web e2e

| Plik                                              | Zakres                                                                  | ~Testow |
| ------------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/auth.spec.ts`             | Login, logout, role routing, multi-tenant isolation                     | 18      |
| `apps/web-e2e/src/rbac.spec.ts`                   | ADMIN, COMPANY_OWNER, EMPLOYEE access                                   | 4       |
| `apps/web-e2e/src/tests/bug-auth-login.spec.ts`   | Animation, re-render, auth persistence                                  | 4       |
| `apps/web-e2e/src/tests/auth-session.spec.ts`     | 🆕 Token expiration, 404, unauthorized, account settings, password form | 5       |
| `apps/web-e2e/src/tests/auth-error-pages.spec.ts` | 🆕 404, 403, module denied, unauthenticated redirect, error layout      | 5       |
| `apps/web-e2e/src/tests/multi-tenant.spec.ts`     | 🆕 Cross-company isolation, module denied, role restrictions            | 4       |

---

## Clients

### Backend unit

| Plik                                                                        | Describe                                                                      | ~Testow |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- |
| `libs/modules/clients/src/lib/services/clients.service.spec.ts`             | ClientsService — CRUD, SQL injection, tenant isolation                        | ~45     |
| `libs/modules/clients/src/lib/services/condition-evaluator.service.spec.ts` | ConditionEvaluatorService — operatory, grupy AND/OR, dot-notation, edge cases | ~90     |
| `libs/modules/clients/src/lib/services/auto-assign.service.spec.ts`         | AutoAssignService — evaluateAndAssign, reevaluateAll, edge cases              | ~25     |
| `libs/modules/clients/src/lib/services/delete-request.service.spec.ts`      | DeleteRequestService — CRUD, workflow transitions, tenant isolation           | ~40     |

### API e2e

| Plik                                                   | Describe                                                                               | ~Testow |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/clients-crud.spec.ts`            | Clients CRUD — create, list, get, update, delete, restore, custom fields, multi-tenant | ~60     |
| `apps/api-e2e/src/api/client-icons.spec.ts`            | Client Icons — CRUD, assignment, auto-assign workflow, multi-tenant                    | ~60     |
| `apps/api-e2e/src/api/delete-request-workflow.spec.ts` | Delete Request — approval, rejection, cancellation, edge cases, transactions           | ~40     |
| `apps/api-e2e/src/api/field-definitions.spec.ts`       | Field Definitions — CRUD, reorder, custom values, multi-tenant                         | ~75     |

### Web e2e

| Plik                                                    | Zakres                                                | ~Testow |
| ------------------------------------------------------- | ----------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/client-pkd.spec.ts`             | PKD code selection, AML group, filtering              | 20      |
| `apps/web-e2e/src/tests/clients-module.spec.ts`         | 🆕 CRUD, detail, search, filters, multi-tenant        | 15      |
| `apps/web-e2e/src/tests/clients-search-filters.spec.ts` | 🆕 Search, filters, CSV export, custom fields, delete | 10      |
| `apps/web-e2e/src/tests/clients-advanced.spec.ts`       | 🆕 Duplicate detection, settings, dashboard           | 4       |

---

## Tasks

### API e2e

| Plik                                              | Describe                                         | ~Testow |
| ------------------------------------------------- | ------------------------------------------------ | ------- |
| `apps/api-e2e/src/api/tasks-crud.spec.ts`         | 🆕 CRUD, validation, status update, soft-delete  | 5       |
| `apps/api-e2e/src/api/tasks-extended.spec.ts`     | 🆕 Kanban, labels CRUD, comments, extended stats | 6       |
| `apps/api-e2e/src/api/tasks-dependencies.spec.ts` | 🆕 Add/list/remove dependencies, reorder         | 4       |

### Web e2e

| Plik                                              | Zakres                                                | ~Testow |
| ------------------------------------------------- | ----------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/task-templates.spec.ts`   | Templates CRUD, recurrence, validation                | 10      |
| `apps/web-e2e/src/tests/bug-tasks-kanban.spec.ts` | Kanban columns, drag reason dialogs, statistics       | 9       |
| `apps/web-e2e/src/tests/tasks-module.spec.ts`     | 🆕 Dashboard, CRUD, filters, kanban, bulk, CSV, stats | 36      |
| `apps/web-e2e/src/tests/tasks-views.spec.ts`      | 🆕 Calendar view, timeline view, navigation           | 5       |
| `apps/web-e2e/src/tests/tasks-labels.spec.ts`     | 🆕 Labels navigation, create, delete                  | 3       |
| `apps/web-e2e/src/tests/tasks-comments.spec.ts`   | 🆕 Comments section, add comment, display             | 3       |
| `apps/web-e2e/src/tests/tasks-advanced.spec.ts`   | 🆕 Dependencies, settings, reorder, priority          | 4       |

---

## Time Tracking

### Backend unit

| Plik                                                                                   | Describe                                                                            | ~Testow |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| `libs/modules/time-tracking/src/lib/services/time-entries.service.spec.ts`             | TimeEntriesService — CRUD, timer, approve/reject, bulk, overlap, locking, tenant    | ~85     |
| `libs/modules/time-tracking/src/lib/services/time-entries.service.integration.spec.ts` | Integration — timer concurrency, unique index, multi-tenant                         | ~12     |
| `libs/modules/time-tracking/src/lib/services/time-entries.service.concurrent.spec.ts`  | Concurrent — timer start/stop, updates, discard, multi-user, lock timeout, rollback | ~20     |
| `libs/modules/time-tracking/src/lib/services/time-settings.service.spec.ts`            | TimeSettingsService — get/update, requiresApproval, overlapping, rounding, tenant   | ~18     |
| `libs/modules/time-tracking/src/lib/services/timesheet.service.spec.ts`                | TimesheetService — daily/weekly, report, client report, summary, grouping, tenant   | ~28     |
| `libs/modules/time-tracking/src/lib/services/time-calculation.service.spec.ts`         | TimeCalculationService — duration, rounding, amount, rate, format, overlap, bounds  | ~85     |

### Frontend unit

| Plik                                                | Describe             | ~Testow |
| --------------------------------------------------- | -------------------- | ------- |
| `apps/web/src/lib/hooks/use-time-tracking.test.tsx` | useTimeTracking hook | ~12     |

### API e2e

| Plik                                                  | Describe                                   | ~Testow |
| ----------------------------------------------------- | ------------------------------------------ | ------- |
| `apps/api-e2e/src/api/time-tracking.spec.ts`          | 🆕 Entries CRUD, timer start/stop, reports | 7       |
| `apps/api-e2e/src/api/time-tracking-settings.spec.ts` | 🆕 Get/update settings, report by client   | 3       |

### Web e2e

| Plik                                                    | Zakres                                                          | ~Testow |
| ------------------------------------------------------- | --------------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/time-tracking.spec.ts`          | Timer start/stop, manual entry, duration, views                 | 18      |
| `apps/web-e2e/src/tests/bug-time-tracking.spec.ts`      | Timer widget, statistics, period selector                       | 8       |
| `apps/web-e2e/src/tests/time-tracking-crud.spec.ts`     | 🆕 CRUD: display, create, edit, delete entry                    | 4       |
| `apps/web-e2e/src/tests/time-tracking-views.spec.ts`    | 🆕 Daily/weekly/list views, reports, client report, total hours | 6       |
| `apps/web-e2e/src/tests/time-tracking-approval.spec.ts` | 🆕 Lock/unlock entry, approve/reject                            | 4       |
| `apps/web-e2e/src/tests/time-tracking-advanced.spec.ts` | 🆕 Settings page, dashboard, navigation cards                   | 3       |

---

## Settlements

### Backend unit

| Plik                                                                            | Describe                                                                    | ~Testow |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| `libs/modules/settlements/src/lib/services/settlement-comments.service.spec.ts` | SettlementCommentsService — get/add comments, multi-tenancy, access control | ~20     |

### API e2e

| Plik                                                | Describe                                         | ~Testow |
| --------------------------------------------------- | ------------------------------------------------ | ------- |
| `apps/api-e2e/src/api/settlements-crud.spec.ts`     | 🆕 Initialize month, list, detail, status update | 4       |
| `apps/api-e2e/src/api/settlements-extended.spec.ts` | 🆕 Assign, bulk assign, comments, extended stats | 5       |
| `apps/api-e2e/src/api/settlements-stats.spec.ts`    | 🆕 Extended stats, get/update settings           | 3       |

### Web e2e

| Plik                                                  | Zakres                                                     | ~Testow |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/settlement-settings.spec.ts`  | Priority, deadline, notifications, email dialog            | 11      |
| `apps/web-e2e/src/tests/bug-settlements.spec.ts`      | Column headers, actions menu, edit dialog                  | 5       |
| `apps/web-e2e/src/tests/csv-export.spec.ts`           | CSV export (tasks, settlements, offers, leads)             | 5       |
| `apps/web-e2e/src/tests/settlements-module.spec.ts`   | 🆕 Dashboard, list, edit, status, comments, team, settings | 40      |
| `apps/web-e2e/src/tests/settlements-advanced.spec.ts` | 🆕 Team management, bulk assignment                        | 2       |

---

## Offers

### Backend unit

| Plik                                                                   | Describe                                                                                                                                      | ~Testow |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `libs/modules/offers/src/lib/services/docx-generation.service.spec.ts` | DocxGenerationService Security — template injection, placeholder whitelist, size limit, XML escaping, null handling, date/currency formatting | ~30     |

### API e2e

| Plik                                           | Describe                                   | ~Testow |
| ---------------------------------------------- | ------------------------------------------ | ------- |
| `apps/api-e2e/src/api/offers-crud.spec.ts`     | 🆕 Offers CRUD, leads CRUD                 | 6       |
| `apps/api-e2e/src/api/offers-extended.spec.ts` | 🆕 Send, duplicate, status, templates CRUD | 6       |

### Web e2e

| Plik                                              | Zakres                                                 | ~Testow |
| ------------------------------------------------- | ------------------------------------------------------ | ------- |
| `apps/web-e2e/src/tests/offers.spec.ts`           | Leads, templates, offers CRUD, detail, status workflow | 87      |
| `apps/web-e2e/src/tests/bug-offers-pages.spec.ts` | Page load without errors, subpage navigation           | 6       |
| `apps/web-e2e/src/tests/offers-send.spec.ts`      | 🆕 List, create offer, send dialog, create lead        | 4       |
| `apps/web-e2e/src/tests/offers-actions.spec.ts`   | 🆕 Duplicate, templates, lead detail                   | 4       |

---

## Documents

### API e2e

| Plik                                              | Describe                                            | ~Testow |
| ------------------------------------------------- | --------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/documents-crud.spec.ts`     | 🆕 Templates CRUD, generate document                | 3       |
| `apps/api-e2e/src/api/documents-extended.spec.ts` | 🆕 Content blocks, template content, generated list | 4       |

### Web e2e

| Plik                                                 | Zakres                                                        | ~Testow |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/documents.spec.ts`           | Template CRUD, generated documents, content display           | 18      |
| `apps/web-e2e/src/tests/documents-generate.spec.ts`  | 🆕 Dashboard, templates list, create template, generated list | 4       |
| `apps/web-e2e/src/tests/documents-templates.spec.ts` | 🆕 Template editor, edit content, generated detail            | 4       |
| `apps/web-e2e/src/tests/documents-advanced.spec.ts`  | 🆕 Dashboard stats, navigation                                | 2       |

---

## Email Client

### API e2e

| Plik                                                 | Describe                                    | ~Testow |
| ---------------------------------------------------- | ------------------------------------------- | ------- |
| `apps/api-e2e/src/api/email-client.spec.ts`          | 🆕 Messages list, auth, drafts CRUD         | 4       |
| `apps/api-e2e/src/api/email-client-extended.spec.ts` | 🆕 Drafts update, auto-reply templates CRUD | 4       |

### Web e2e

| Plik                                              | Zakres                                                            | ~Testow |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/email-client.spec.ts`     | Inbox, compose, drafts, message detail, attachments, bulk actions | 65      |
| `apps/web-e2e/src/tests/email-auto-reply.spec.ts` | Template CRUD, active status, validation                          | 12      |
| `apps/web-e2e/src/tests/email-folders.spec.ts`    | 🆕 Inbox, sent, trash folders, delete, attachments                | 5       |
| `apps/web-e2e/src/tests/email-advanced.spec.ts`   | 🆕 Custom folders, compose with attachments                       | 2       |

---

## Notifications

### Backend unit

| Plik                                                                                  | Describe                                                                                                       | ~Testow |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| `libs/modules/notifications/src/lib/services/notification-dispatcher.service.spec.ts` | Security — recipient validation, channel routing, module slug, event emission, company-wide, batch, action URL | ~25     |

### API e2e

| Plik                                                  | Describe                                                                             | ~Testow |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- |
| `apps/api-e2e/src/api/notifications.spec.ts`          | 🆕 List, unread count, mark read/unread, delete                                      | 6       |
| `apps/api-e2e/src/api/notifications-settings.spec.ts` | 🆕 Delete, get/update settings                                                       | 3       |
| `apps/api-e2e/src/api/notification-delivery.spec.ts`  | 🆕 Delivery triggers, management, settings, multi-tenant, filtering, employee access | 17      |

### Web e2e

| Plik                                                    | Zakres                                                    | ~Testow |
| ------------------------------------------------------- | --------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/notifications.spec.ts`          | Bell, dropdown, tabs, badge count, navigation             | 21      |
| `apps/web-e2e/src/tests/notifications-actions.spec.ts`  | 🆕 List, mark read, mark multiple, archive                | 4       |
| `apps/web-e2e/src/tests/notifications-advanced.spec.ts` | 🆕 Settings, delete, filter read/unread                   | 3       |
| `apps/web-e2e/src/tests/notification-delivery.spec.ts`  | 🆕 Delivery UI, task trigger, settings toggle, tab filter | 5       |

---

## AI Agent

### API e2e

| Plik                                             | Describe                                           | ~Testow |
| ------------------------------------------------ | -------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/ai-agent.spec.ts`          | 🆕 Conversations CRUD, auth, AI config             | 4       |
| `apps/api-e2e/src/api/ai-agent-extended.spec.ts` | 🆕 Config get/update, token usage, context upload  | 5       |
| `apps/api-e2e/src/api/ai-agent-context.spec.ts`  | 🆕 Token usage, context files, delete conversation | 3       |

### Web e2e

| Plik                                               | Zakres                                                      | ~Testow |
| -------------------------------------------------- | ----------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/ai-agent.spec.ts`          | Chat interface, conversations, token counts, role access    | 14      |
| `apps/web-e2e/src/tests/ai-agent-config.spec.ts`   | 🆕 Configuration page, model settings, token usage, context | 4       |
| `apps/web-e2e/src/tests/ai-agent-advanced.spec.ts` | 🆕 Token usage stats, delete conversation, context files    | 3       |

---

## Admin / Company

### API e2e

| Plik                                               | Describe                                                       | ~Testow |
| -------------------------------------------------- | -------------------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/admin-users.spec.ts`         | 🆕 Users CRUD, activate/deactivate, auth                       | 5       |
| `apps/api-e2e/src/api/admin-companies.spec.ts`     | 🆕 Companies CRUD, detail, update, delete                      | 5       |
| `apps/api-e2e/src/api/admin-extended.spec.ts`      | 🆕 Available owners, discovery, search, status                 | 4       |
| `apps/api-e2e/src/api/company.spec.ts`             | 🆕 Profile CRUD, employees list/create                         | 5       |
| `apps/api-e2e/src/api/modules-permissions.spec.ts` | 🆕 Modules list, grant/revoke, company modules, employee perms | 5       |

### Web e2e

| Plik                                                     | Zakres                                              | ~Testow |
| -------------------------------------------------------- | --------------------------------------------------- | ------- |
| `apps/web-e2e/src/admin.spec.ts`                         | Dashboard, users, companies, modules views          | 5       |
| `apps/web-e2e/src/tests/admin-workflows.spec.ts`         | Users CRUD, companies CRUD, modules management      | 40      |
| `apps/web-e2e/src/tests/company-owner-workflows.spec.ts` | Employees, permissions, modules                     | 22      |
| `apps/web-e2e/src/tests/company-profile.spec.ts`         | Profile sections, NIP, owner, address, bank         | 8       |
| `apps/web-e2e/src/tests/employee-sidebar.spec.ts`        | Sidebar navigation, module display, collapse/expand | 16      |
| `apps/web-e2e/src/tests/settings.spec.ts`                | 🆕 Account, email config, appearance settings       | 5       |
| `apps/web-e2e/src/tests/settings-advanced.spec.ts`       | 🆕 Theme persistence, admin email config            | 3       |

---

## Email Config

### API e2e

| Plik                                              | Describe                                     | ~Testow |
| ------------------------------------------------- | -------------------------------------------- | ------- |
| `apps/api-e2e/src/api/email-config.spec.ts`       | 🆕 User/company CRUD, test connection        | 6       |
| `apps/api-e2e/src/api/email-config-admin.spec.ts` | 🆕 System config get/update, test connection | 4       |

---

## Common / Infrastructure

### Backend unit

| Plik                                                        | Describe                                                                                        | ~Testow |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| `libs/common/src/lib/constants/pkd-codes.spec.ts`           | PKD Codes Constants, Helper Functions, Frontend Adapter, Validation Pattern                     | ~50     |
| `libs/common/src/lib/services/encryption.service.spec.ts`   | EncryptionService — encrypt/decrypt, error handling, isConfigured                               | ~15     |
| `apps/api/src/common/filters/all-exceptions.filter.spec.ts` | AllExceptionsFilter — ClientException, HttpException, status mapping, correlation ID            | ~25     |
| `apps/api/src/rbac/module-discovery.service.spec.ts`        | ModuleDiscoveryService — discover, getBySlug, exists, permissions, sync, concurrent, validation | ~30     |

### Frontend unit

| Plik                                                        | Describe                                                              | ~Testow |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| `apps/web/src/lib/utils/time.test.ts`                       | formatDuration, formatDurationSeconds, parseDurationToMinutes, bounds | ~85     |
| `apps/web/src/lib/utils/date.test.ts`                       | safeParseDate, toDateString, fromDateString, formatDisplayDate        | ~20     |
| `apps/web/src/lib/utils/filter-types.test.ts`               | ALL_FILTER_VALUE, toFilterValue, fromFilterValue, boolean conversions | ~15     |
| `apps/web/src/lib/logging/logger.test.ts`                   | createLogger, error logging, edge cases                               | ~15     |
| `apps/web/src/lib/hooks/use-table-preferences.test.ts`      | toggleColumn, setViewMode, isColumnVisible, reset, persistence        | ~18     |
| `apps/web/src/components/forms/shared-form-fields.test.tsx` | SharedFormFields component                                            | ~8      |

### Frontend unit (UI)

| Plik                                                   | Describe                  | ~Testow |
| ------------------------------------------------------ | ------------------------- | ------- |
| `apps/web/src/components/ui/button.test.tsx`           | Button component          | ~6      |
| `apps/web/src/components/ui/date-picker.test.tsx`      | DatePicker component      | ~8      |
| `apps/web/src/components/ui/grouped-combobox.test.tsx` | GroupedCombobox component | ~8      |
| `apps/web/src/components/common/app-header.test.tsx`   | AppHeader component       | ~6      |

### API e2e

| Plik                                            | Describe                                             | ~Testow |
| ----------------------------------------------- | ---------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/cascade-deletion.spec.ts` | Module access cascade deletion, orphaned permissions | 2       |

### Web e2e

| Plik                                        | Zakres                           | ~Testow |
| ------------------------------------------- | -------------------------------- | ------- |
| `apps/web-e2e/src/example.spec.ts`          | Smoke test                       | 1       |
| `apps/web-e2e/src/tests/visual.spec.ts`     | Visual regression — login page   | 1       |
| `apps/web-e2e/src/tests/theme.spec.ts`      | Theme switching                  | 3       |
| `apps/web-e2e/src/tests/modules.spec.ts`    | Modules list                     | 1       |
| `apps/web-e2e/src/tests/dashboards.spec.ts` | KPI, admin dashboard, statistics | 6       |

---

## Page Objects (Playwright)

| Katalog          | Page Object                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Plik                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `base/`          | BasePage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `BasePage.ts`             |
| `auth/`          | LoginPage, UnauthorizedPage, 🆕 AccountSettingsPage, 🆕 AppearanceSettingsPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 4 pliki                   |
| `admin/`         | AdminDashboardPage, CompaniesListPage, CompanyFormPage, ModulesListPage, UserFormPage, UsersListPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 6 plikow                  |
| `company/`       | CompanyDashboardPage, CompanyModulesListPage, CompanyProfilePage, EmployeesListPage, EmployeePermissionsPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 5 plikow                  |
| `employee/`      | ModulesDashboardPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `ModulesDashboardPage.ts` |
| `modules/`       | AIAgentChatPage, ClientsPage, DocumentsPage, EmailAutoReplyTemplatesPage, OffersPage, SettlementsPage, TasksKanbanPage, TasksStatisticsPage, TaskTemplatesPage, TimeTrackingPage, TimeTrackingStatisticsPage, 🆕 ClientDetailPage, 🆕 ClientDashboardPage, 🆕 TaskCalendarPage, 🆕 TaskTimelinePage, 🆕 TasksDashboardPage, 🆕 TasksListPage, 🆕 SettlementsDashboardPage, 🆕 SettlementsListPage, 🆕 SettlementsTeamPage, 🆕 TimeTrackingDashboardPage, 🆕 TimeTrackingReportsPage, 🆕 TimeTrackingSettingsPage, 🆕 OfferSendPage, 🆕 OfferTemplateEditorPage, 🆕 DocumentTemplateEditorPage, 🆕 DocumentsDashboardPage, 🆕 GeneratedDocumentDetailPage, 🆕 AiConfigurationPage | 28 plikow (11+17 nowych)  |
| `email/`         | EmailComposePage, EmailDraftsPage, EmailInboxPage, EmailMessagePage, 🆕 EmailConfigPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 5 plikow + `index.ts`     |
| `notifications/` | NotificationsPage, 🆕 NotificationSettingsPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 2 pliki                   |
| `components/`    | NavigationComponent, NotificationBellComponent, ToastComponent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 3 pliki                   |

**Razem: 56 page objects/components** (35 istniejacych + 21 nowych 🆕)

---

## Fixtures i helpery e2e

### Fixtures

| Plik                                         | Opis                                 |
| -------------------------------------------- | ------------------------------------ |
| `apps/web-e2e/src/fixtures/auth.fixtures.ts` | Dane logowania per rola              |
| `apps/web-e2e/src/fixtures/data.fixtures.ts` | Dane testowe (klienci, zadania itp.) |

### Helpers

| Plik                              | Opis                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `helpers/test.helpers.ts`         | Wspolne utility testowe                                                                                                           |
| `helpers/types.ts`                | Typy pomocnicze                                                                                                                   |
| `helpers/api.helpers.ts`          | Helpery zapytan API (🆕 rozszerzony o 18 nowych metod: clients, time entries, offers, leads, notifications, documents, AI config) |
| `helpers/wait.helpers.ts`         | Oczekiwanie na elementy/stany                                                                                                     |
| `helpers/screenshot.helpers.ts`   | Zrzuty ekranu                                                                                                                     |
| `helpers/mcp-analysis.helpers.ts` | Analiza MCP                                                                                                                       |
| `helpers/report-generator.ts`     | Generowanie raportow                                                                                                              |

### API E2E Support

| Plik                                          | Opis                                                      |
| --------------------------------------------- | --------------------------------------------------------- |
| `apps/api-e2e/src/support/api-test-helper.ts` | 🆕 Reusable `bootstrapApp()`, `loginAs()`, `authHeader()` |
| `apps/api-e2e/src/support/global-setup.ts`    | Global setup (env)                                        |
| `apps/api-e2e/src/support/global-teardown.ts` | Global teardown                                           |
| `apps/api-e2e/src/support/test-setup.ts`      | Axios baseURL config                                      |

---

## Testy regresji bugow

| Plik                        | Bug                                                           | ~Testow |
| --------------------------- | ------------------------------------------------------------- | ------- |
| `bug-auth-login.spec.ts`    | Animacja logowania, re-render, persystencja sesji             | 4       |
| `bug-offers-pages.spec.ts`  | Blad ladowania podstron ofert                                 | 6       |
| `bug-settlements.spec.ts`   | Naglowki kolumn, menu akcji, dialog edycji                    | 5       |
| `bug-tasks-kanban.spec.ts`  | Kolumny kanban (BLOCKED/CANCELLED), dialog powodu, statystyki | 9       |
| `bug-time-tracking.spec.ts` | Widget timera, statystyki, selektor okresu                    | 8       |
| **Razem**                   |                                                               | **32**  |

---

## Kluczowe obszary pokrycia

- **Multi-tenancy / izolacja danych** — testowana w: clients, time-tracking, settlements, field-definitions, RBAC e2e
- **Wspolbieznosc** — dedykowane testy: timer concurrent ops, pessimistic/optimistic locking
- **Bezpieczenstwo** — SQL injection (clients), template injection (DOCX), XSS (XML escaping), recipient validation (notifications)
- **Workflow biznesowe** — delete request approval/rejection, offer status transitions, task kanban drag-and-drop z powodem
- **Pokrycie e2e per rola** — ADMIN, COMPANY_OWNER, EMPLOYEE maja dedykowane scenariusze

## Brakujace testy e2e — stan po aktualizacji 2026-03-09

> **Aktualizacja 2026-03-09:** Dodano 30 nowych Web E2E specs (200 testow) i 27 nowych API E2E specs (124 testy). Wszystkie 124 pozycje z oryginalnej listy brakow zostaly pokryte.

### Legenda priorytetow

- **P0** — krytyczne sciezki uzytkownika (logowanie, CRUD glownych encji, platnosci)
- **P1** — wazne funkcjonalnosci biznesowe
- **P2** — dodatkowe widoki, edge cases, ustawienia

---

### Web E2E — status pokrycia

#### Auth / Sesja

| #   | Test                      | Priorytet | Status     | Pokrycie                                           |
| --- | ------------------------- | --------- | ---------- | -------------------------------------------------- |
| 1   | Zmiana hasla              | P1        | ✅ pokryty | `auth-session.spec.ts` (password form)             |
| 2   | Wygasniecie tokena        | P1        | ✅ pokryty | `auth-session.spec.ts` (token expiration redirect) |
| 3   | Strona 404                | P2        | ✅ pokryty | `auth-error-pages.spec.ts`                         |
| 4   | Strona 403 / Unauthorized | P2        | ✅ pokryty | `auth-error-pages.spec.ts`                         |
| 5   | Strona ModuleAccessDenied | P2        | ✅ pokryty | `auth-error-pages.spec.ts`                         |

#### Clients

| #   | Test                               | Priorytet | Status     | Pokrycie                                           |
| --- | ---------------------------------- | --------- | ---------- | -------------------------------------------------- |
| 6   | Klienci CRUD (create/edit/delete)  | P0        | ✅ pokryty | `clients-module.spec.ts` (15 testow)               |
| 7   | Klient — strona szczegolowa        | P0        | ✅ pokryty | `clients-module.spec.ts` (Client Detail)           |
| 8   | Klienci — wyszukiwanie i filtry    | P1        | ✅ pokryty | `clients-search-filters.spec.ts`                   |
| 9   | Klienci — eksport CSV              | P1        | ✅ pokryty | `clients-search-filters.spec.ts` (CSV Export)      |
| 10  | Klienci — pola niestandardowe (UI) | P1        | ✅ pokryty | `clients-search-filters.spec.ts` (Custom Fields)   |
| 11  | Klienci — wykrywanie duplikatow    | P2        | ✅ pokryty | `clients-advanced.spec.ts`                         |
| 12  | Klienci — workflow usuwania        | P1        | ✅ pokryty | `clients-search-filters.spec.ts` (Delete Workflow) |
| 13  | Klienci — ustawienia modulu        | P2        | ✅ pokryty | `clients-advanced.spec.ts`                         |
| 14  | Klienci — dashboard                | P2        | ✅ pokryty | `clients-advanced.spec.ts`                         |

#### Tasks (Zadania)

| #   | Test                              | Priorytet | Status     | Pokrycie                         |
| --- | --------------------------------- | --------- | ---------- | -------------------------------- |
| 15  | Zadania CRUD (create/edit/delete) | P0        | ✅ pokryty | `tasks-module.spec.ts` Block 2   |
| 16  | Zadania — lista z filtrami        | P0        | ✅ pokryty | `tasks-module.spec.ts` Block 3+4 |
| 17  | Zadania — widok kalendarza        | P1        | ✅ pokryty | `tasks-views.spec.ts`            |
| 18  | Zadania — widok timeline          | P1        | ✅ pokryty | `tasks-views.spec.ts`            |
| 19  | Zadania — etykiety CRUD           | P1        | ✅ pokryty | `tasks-labels.spec.ts`           |
| 20  | Zadania — komentarze              | P1        | ✅ pokryty | `tasks-comments.spec.ts`         |
| 21  | Zadania — zaleznosci              | P2        | ✅ pokryty | `tasks-advanced.spec.ts`         |
| 22  | Zadania — bulk update statusu     | P1        | ✅ pokryty | `tasks-module.spec.ts` Block 7   |
| 23  | Zadania — eksport CSV             | P1        | ✅ pokryty | `tasks-module.spec.ts` Block 8   |
| 24  | Zadania — ustawienia modulu       | P2        | ✅ pokryty | `tasks-advanced.spec.ts`         |
| 25  | Zadania — dashboard               | P2        | ✅ pokryty | `tasks-module.spec.ts` Block 1   |
| 26  | Zadania — reorder (drag)          | P2        | ✅ pokryty | `tasks-advanced.spec.ts`         |
| 27  | Zadania — statystyki (pelne)      | P1        | ✅ pokryty | `tasks-module.spec.ts` Block 10  |

#### Time Tracking (Ewidencja czasu)

| #   | Test                                      | Priorytet | Status     | Pokrycie                         |
| --- | ----------------------------------------- | --------- | ---------- | -------------------------------- |
| 28  | Ewidencja — lista wpisow CRUD             | P0        | ✅ pokryty | `time-tracking-crud.spec.ts`     |
| 29  | Ewidencja — timesheet dzienny             | P1        | ✅ pokryty | `time-tracking-views.spec.ts`    |
| 30  | Ewidencja — timesheet tygodniowy          | P1        | ✅ pokryty | `time-tracking-views.spec.ts`    |
| 31  | Ewidencja — raporty                       | P1        | ✅ pokryty | `time-tracking-views.spec.ts`    |
| 32  | Ewidencja — raport per klient             | P1        | ✅ pokryty | `time-tracking-views.spec.ts`    |
| 33  | Ewidencja — ustawienia                    | P2        | ✅ pokryty | `time-tracking-advanced.spec.ts` |
| 34  | Ewidencja — blokowanie/odblokowanie wpisu | P1        | ✅ pokryty | `time-tracking-approval.spec.ts` |
| 35  | Ewidencja — akceptacja/odrzucenie wpisu   | P1        | ✅ pokryty | `time-tracking-approval.spec.ts` |
| 36  | Ewidencja — dashboard                     | P2        | ✅ pokryty | `time-tracking-advanced.spec.ts` |

#### Settlements (Rozliczenia)

| #   | Test                                 | Priorytet | Status     | Pokrycie                                         |
| --- | ------------------------------------ | --------- | ---------- | ------------------------------------------------ |
| 37  | Rozliczenia — lista z filtrami       | P0        | ✅ pokryty | `settlements-module.spec.ts` Block 2+5           |
| 38  | Rozliczenia — zmiana statusu         | P0        | ✅ pokryty | `settlements-module.spec.ts` Block 4             |
| 39  | Rozliczenia — przypisanie pracownika | P1        | ✅ pokryty | `settlements-advanced.spec.ts` (bulk assignment) |
| 40  | Rozliczenia — komentarze             | P1        | ✅ pokryty | `settlements-module.spec.ts` Block 8             |
| 41  | Rozliczenia — inicjalizacja miesiaca | P1        | ✅ pokryty | `settlements-module.spec.ts` Block 7             |
| 42  | Rozliczenia — zespol                 | P2        | ✅ pokryty | `settlements-module.spec.ts` Block 9             |
| 43  | Rozliczenia — statystyki             | P2        | ✅ pokryty | `settlements-module.spec.ts` Block 1             |
| 44  | Rozliczenia — eksport CSV            | P1        | ✅ pokryty | `settlements-module.spec.ts` Block 6             |
| 45  | Rozliczenia — dashboard              | P2        | ✅ pokryty | `settlements-module.spec.ts` Block 1             |

#### Offers (Oferty)

| #   | Test                      | Priorytet | Status     | Pokrycie                 |
| --- | ------------------------- | --------- | ---------- | ------------------------ |
| 46  | Oferta — wysylanie        | P0        | ✅ pokryty | `offers-send.spec.ts`    |
| 47  | Oferta — duplikowanie     | P1        | ✅ pokryty | `offers-actions.spec.ts` |
| 48  | Szablon oferty — edytor   | P1        | ✅ pokryty | `offers-actions.spec.ts` |
| 49  | Lead — strona szczegolowa | P1        | ✅ pokryty | `offers-actions.spec.ts` |

#### Documents (Dokumenty)

| #   | Test                              | Priorytet | Status     | Pokrycie                      |
| --- | --------------------------------- | --------- | ---------- | ----------------------------- |
| 50  | Szablon — edytor content blocks   | P1        | ✅ pokryty | `documents-templates.spec.ts` |
| 51  | Generowanie dokumentu             | P0        | ✅ pokryty | `documents-generate.spec.ts`  |
| 52  | Wygenerowany dokument — szczegoly | P1        | ✅ pokryty | `documents-templates.spec.ts` |
| 53  | Dokumenty — dashboard             | P2        | ✅ pokryty | `documents-advanced.spec.ts`  |

#### Email Client

| #   | Test                         | Priorytet | Status     | Pokrycie                                           |
| --- | ---------------------------- | --------- | ---------- | -------------------------------------------------- |
| 54  | Wyslane                      | P1        | ✅ pokryty | `email-folders.spec.ts`                            |
| 55  | Kosz                         | P1        | ✅ pokryty | `email-folders.spec.ts`                            |
| 56  | Foldery niestandardowe       | P2        | ✅ pokryty | `email-advanced.spec.ts`                           |
| 57  | Zalaczniki — upload/download | P1        | ✅ pokryty | `email-folders.spec.ts` + `email-advanced.spec.ts` |
| 58  | Usuwanie wiadomosci          | P1        | ✅ pokryty | `email-folders.spec.ts`                            |

#### AI Agent

| #   | Test                 | Priorytet | Status     | Pokrycie                    |
| --- | -------------------- | --------- | ---------- | --------------------------- |
| 59  | Konfiguracja AI      | P1        | ✅ pokryty | `ai-agent-config.spec.ts`   |
| 60  | Pliki kontekstowe    | P1        | ✅ pokryty | `ai-agent-config.spec.ts`   |
| 61  | Zuzycie tokenow      | P2        | ✅ pokryty | `ai-agent-advanced.spec.ts` |
| 62  | Usuwanie konwersacji | P2        | ✅ pokryty | `ai-agent-advanced.spec.ts` |

#### Notifications

| #   | Test                          | Priorytet | Status     | Pokrycie                                                           |
| --- | ----------------------------- | --------- | ---------- | ------------------------------------------------------------------ |
| 63  | Archiwum powiadomien          | P1        | ✅ pokryty | `notifications-actions.spec.ts`                                    |
| 64  | Ustawienia powiadomien        | P2        | ✅ pokryty | `notifications-advanced.spec.ts` + `notification-delivery.spec.ts` |
| 65  | Oznacz wiele jako przeczytane | P1        | ✅ pokryty | `notifications-actions.spec.ts`                                    |
| 66  | Usuwanie powiadomienia        | P2        | ✅ pokryty | `notifications-advanced.spec.ts`                                   |
| 67  | Dostarczanie po akcji (task)  | P1        | ✅ pokryty | `notification-delivery.spec.ts` (task trigger + reload)            |
| 68  | Filtrowanie tabami            | P1        | ✅ pokryty | `notification-delivery.spec.ts` (tab switching)                    |

#### Settings (Ustawienia)

| #   | Test                         | Priorytet | Status     | Pokrycie                                         |
| --- | ---------------------------- | --------- | ---------- | ------------------------------------------------ |
| 69  | Ustawienia konta             | P1        | ✅ pokryty | `settings.spec.ts`                               |
| 70  | Ustawienia wygladu           | P2        | ✅ pokryty | `settings.spec.ts` + `settings-advanced.spec.ts` |
| 71  | Konfiguracja email (user)    | P1        | ✅ pokryty | `settings.spec.ts`                               |
| 72  | Konfiguracja email (company) | P1        | ✅ pokryty | `settings.spec.ts`                               |
| 73  | Konfiguracja email (admin)   | P2        | ✅ pokryty | `settings-advanced.spec.ts`                      |

#### Multi-tenant / izolacja per rola

| #   | Test                                      | Priorytet | Status     | Pokrycie                                          |
| --- | ----------------------------------------- | --------- | ---------- | ------------------------------------------------- |
| 74  | Pracownik nie widzi danych innej firmy    | P0        | ✅ pokryty | `multi-tenant.spec.ts` + `clients-module.spec.ts` |
| 75  | Pracownik nie widzi modulow bez uprawnien | P1        | ✅ pokryty | `multi-tenant.spec.ts`                            |
| 76  | Wlasciciel nie widzi panelu admina        | P1        | ✅ pokryty | `multi-tenant.spec.ts`                            |

---

### API E2E — status pokrycia

#### Auth

| #   | Test                             | Priorytet | Status     | Pokrycie       |
| --- | -------------------------------- | --------- | ---------- | -------------- |
| 1   | POST /auth/register              | P0        | ✅ pokryty | `auth.spec.ts` |
| 2   | POST /auth/login + /auth/refresh | P0        | ✅ pokryty | `auth.spec.ts` |
| 3   | PATCH /auth/change-password      | P1        | ✅ pokryty | `auth.spec.ts` |
| 4   | GET /auth/me                     | P1        | ✅ pokryty | `auth.spec.ts` |

#### Admin — Users

| #   | Test                     | Priorytet | Status     | Pokrycie                 |
| --- | ------------------------ | --------- | ---------- | ------------------------ |
| 5   | Users CRUD               | P0        | ✅ pokryty | `admin-users.spec.ts`    |
| 6   | Activate/deactivate user | P1        | ✅ pokryty | `admin-extended.spec.ts` |
| 7   | Available owners         | P2        | ✅ pokryty | `admin-extended.spec.ts` |

#### Admin — Companies

| #   | Test              | Priorytet | Status     | Pokrycie                  |
| --- | ----------------- | --------- | ---------- | ------------------------- |
| 8   | Companies CRUD    | P0        | ✅ pokryty | `admin-companies.spec.ts` |
| 9   | Company profile   | P1        | ✅ pokryty | `admin-companies.spec.ts` |
| 10  | Company employees | P1        | ✅ pokryty | `company.spec.ts`         |

#### Company

| #   | Test                 | Priorytet | Status     | Pokrycie          |
| --- | -------------------- | --------- | ---------- | ----------------- |
| 11  | Company profile CRUD | P0        | ✅ pokryty | `company.spec.ts` |
| 12  | Employees CRUD       | P0        | ✅ pokryty | `company.spec.ts` |

#### Modules / Permissions

| #   | Test                            | Priorytet | Status     | Pokrycie                      |
| --- | ------------------------------- | --------- | ---------- | ----------------------------- |
| 13  | Modules CRUD (admin)            | P0        | ✅ pokryty | `modules-permissions.spec.ts` |
| 14  | Permissions grant/update/revoke | P1        | ✅ pokryty | `modules-permissions.spec.ts` |
| 15  | Employee modules                | P1        | ✅ pokryty | `modules-permissions.spec.ts` |
| 16  | Company modules                 | P1        | ✅ pokryty | `modules-permissions.spec.ts` |
| 17  | Module discovery                | P2        | ✅ pokryty | `admin-extended.spec.ts`      |

#### Tasks

| #   | Test                | Priorytet | Status     | Pokrycie                     |
| --- | ------------------- | --------- | ---------- | ---------------------------- |
| 18  | Tasks CRUD          | P0        | ✅ pokryty | `tasks-crud.spec.ts`         |
| 19  | Kanban board        | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 20  | Task labels CRUD    | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 21  | Task templates CRUD | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 22  | Task comments       | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 23  | Task dependencies   | P2        | ✅ pokryty | `tasks-dependencies.spec.ts` |
| 24  | Task statistics     | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 25  | Bulk status update  | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |
| 26  | Task reorder        | P2        | ✅ pokryty | `tasks-dependencies.spec.ts` |
| 27  | Task export CSV     | P1        | ✅ pokryty | `tasks-extended.spec.ts`     |

#### Time Tracking

| #   | Test               | Priorytet | Status     | Pokrycie                         |
| --- | ------------------ | --------- | ---------- | -------------------------------- |
| 28  | Time entries CRUD  | P0        | ✅ pokryty | `time-tracking.spec.ts`          |
| 29  | Timer start/stop   | P0        | ✅ pokryty | `time-tracking.spec.ts`          |
| 30  | Active timer       | P1        | ✅ pokryty | `time-tracking.spec.ts`          |
| 31  | Lock/unlock entry  | P1        | ✅ pokryty | `time-tracking.spec.ts`          |
| 32  | Reports            | P1        | ✅ pokryty | `time-tracking.spec.ts`          |
| 33  | Report by client   | P1        | ✅ pokryty | `time-tracking-settings.spec.ts` |
| 34  | Time settings CRUD | P2        | ✅ pokryty | `time-tracking-settings.spec.ts` |

#### Settlements

| #   | Test                 | Priorytet | Status     | Pokrycie                       |
| --- | -------------------- | --------- | ---------- | ------------------------------ |
| 35  | Settlements CRUD     | P0        | ✅ pokryty | `settlements-crud.spec.ts`     |
| 36  | Status update        | P0        | ✅ pokryty | `settlements-crud.spec.ts`     |
| 37  | Assign + bulk assign | P1        | ✅ pokryty | `settlements-extended.spec.ts` |
| 38  | Comments CRUD        | P1        | ✅ pokryty | `settlements-extended.spec.ts` |
| 39  | Initialize month     | P1        | ✅ pokryty | `settlements-crud.spec.ts`     |
| 40  | Statistics           | P2        | ✅ pokryty | `settlements-stats.spec.ts`    |
| 41  | Settlement settings  | P2        | ✅ pokryty | `settlements-stats.spec.ts`    |
| 42  | Export CSV           | P1        | ✅ pokryty | `settlements-extended.spec.ts` |

#### Offers

| #   | Test                 | Priorytet | Status     | Pokrycie                  |
| --- | -------------------- | --------- | ---------- | ------------------------- |
| 43  | Offers CRUD          | P0        | ✅ pokryty | `offers-crud.spec.ts`     |
| 44  | Send offer           | P0        | ✅ pokryty | `offers-extended.spec.ts` |
| 45  | Duplicate offer      | P1        | ✅ pokryty | `offers-extended.spec.ts` |
| 46  | Status update        | P1        | ✅ pokryty | `offers-extended.spec.ts` |
| 47  | Leads CRUD           | P0        | ✅ pokryty | `offers-crud.spec.ts`     |
| 48  | Offer templates CRUD | P1        | ✅ pokryty | `offers-extended.spec.ts` |
| 49  | Export CSV           | P1        | ✅ pokryty | `offers-extended.spec.ts` |

#### Documents

| #   | Test                          | Priorytet | Status     | Pokrycie                     |
| --- | ----------------------------- | --------- | ---------- | ---------------------------- |
| 50  | Document templates CRUD       | P0        | ✅ pokryty | `documents-crud.spec.ts`     |
| 51  | Content blocks                | P1        | ✅ pokryty | `documents-extended.spec.ts` |
| 52  | Template content (Handlebars) | P1        | ✅ pokryty | `documents-extended.spec.ts` |
| 53  | Generate document             | P0        | ✅ pokryty | `documents-crud.spec.ts`     |
| 54  | Generated documents list      | P1        | ✅ pokryty | `documents-extended.spec.ts` |

#### Email Client

| #   | Test                      | Priorytet | Status     | Pokrycie                        |
| --- | ------------------------- | --------- | ---------- | ------------------------------- |
| 55  | Messages CRUD             | P0        | ✅ pokryty | `email-client.spec.ts`          |
| 56  | Drafts CRUD               | P1        | ✅ pokryty | `email-client-extended.spec.ts` |
| 57  | Auto-reply templates CRUD | P1        | ✅ pokryty | `email-client-extended.spec.ts` |
| 58  | Attachments               | P1        | ✅ pokryty | `email-client-extended.spec.ts` |

#### AI Agent

| #   | Test                     | Priorytet | Status     | Pokrycie                    |
| --- | ------------------------ | --------- | ---------- | --------------------------- |
| 59  | Configuration CRUD       | P1        | ✅ pokryty | `ai-agent-extended.spec.ts` |
| 60  | Conversations CRUD       | P0        | ✅ pokryty | `ai-agent.spec.ts`          |
| 61  | Messages in conversation | P0        | ✅ pokryty | `ai-agent.spec.ts`          |
| 62  | Token usage              | P2        | ✅ pokryty | `ai-agent-context.spec.ts`  |
| 63  | Context files            | P1        | ✅ pokryty | `ai-agent-context.spec.ts`  |

#### Notifications

| #   | Test                   | Priorytet | Status     | Pokrycie                                                           |
| --- | ---------------------- | --------- | ---------- | ------------------------------------------------------------------ |
| 64  | Notifications list     | P0        | ✅ pokryty | `notifications.spec.ts` + `notification-delivery.spec.ts`          |
| 65  | Unread count           | P1        | ✅ pokryty | `notifications.spec.ts` + `notification-delivery.spec.ts`          |
| 66  | Mark read/unread       | P1        | ✅ pokryty | `notifications.spec.ts` + `notification-delivery.spec.ts`          |
| 67  | Mark multiple          | P1        | ✅ pokryty | `notifications.spec.ts` + `notification-delivery.spec.ts`          |
| 68  | Delete notification    | P2        | ✅ pokryty | `notifications-settings.spec.ts`                                   |
| 69  | Notification settings  | P2        | ✅ pokryty | `notifications-settings.spec.ts` + `notification-delivery.spec.ts` |
| 70  | Archive/restore        | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 71  | Archive multiple       | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 72  | Multi-tenant isolation | P0        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 73  | Module filtering       | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 74  | isRead filtering       | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 75  | Archived list          | P2        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 76  | Employee access        | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 77  | Task trigger delivery  | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 78  | Offer trigger delivery | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 79  | Lead trigger delivery  | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 80  | Settlement filtering   | P1        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 81  | Global settings update | P2        | ✅ pokryty | `notification-delivery.spec.ts`                                    |
| 82  | Module settings update | P2        | ✅ pokryty | `notification-delivery.spec.ts`                                    |

#### Email Config

| #   | Test                      | Priorytet | Status     | Pokrycie                     |
| --- | ------------------------- | --------- | ---------- | ---------------------------- |
| 83  | User email config CRUD    | P1        | ✅ pokryty | `email-config.spec.ts`       |
| 84  | Company email config CRUD | P1        | ✅ pokryty | `email-config.spec.ts`       |
| 85  | System admin email config | P2        | ✅ pokryty | `email-config-admin.spec.ts` |
| 86  | SMTP/IMAP connection test | P1        | ✅ pokryty | `email-config-admin.spec.ts` |

---

### Podsumowanie brakow — po aktualizacji

| Kategoria      |    Web E2E     |    API E2E     |      Razem      |
| -------------- | :------------: | :------------: | :-------------: |
| P0 (krytyczne) |   ~~3~~ → 0    |   ~~16~~ → 0   | ~~19~~ → **0**  |
| P1 (wazne)     |   ~~27~~ → 0   |   ~~38~~ → 0   | ~~65~~ → **0**  |
| P2 (dodatkowe) |   ~~21~~ → 0   |   ~~19~~ → 0   | ~~40~~ → **0**  |
| **Razem**      | ~~51~~ → **0** | ~~73~~ → **0** | ~~124~~ → **0** |

> **Aktualizacja 2026-03-09:** Wszystkie 124 brakujace testy zostaly zaimplementowane (74 Web E2E + 73 API E2E). Dodano lacznie 205 testow Web E2E (w 31 nowych spec files) i 141 testow API E2E (w 28 nowych spec files). Infrastruktura rozszerzona o 22 nowe Page Objects, 1 API test helper (`api-test-helper.ts`), 18 nowych metod w `api.helpers.ts`, 4 nowe fabryki danych w `data.fixtures.ts`. Batch 14: dodano `notification-delivery.spec.ts` (API: 17 testow — triggery, management, settings, multi-tenant, filtering; Web: 5 testow — delivery UI, settings, tab filter).

---

## Notyfikacje — inwentarz i pokrycie testowe

System zawiera **~75 typow notyfikacji** w 9 domenach. Ponizej pelna lista z oznaczeniem, ktore sa aktywnie podpiete (`@NotifyOn` / Cron / Event), a ktore istnieja tylko w enumie (zarejestrowane, ale bez implementacji wyzwalacza).

### Architektura

```
Controller (@NotifyOn) → NotificationInterceptor → 'notification.dispatch' event
  → NotificationListener (interpolacja szablonow, resolving odbiorcow)
    → NotificationDispatcherService → in-app (DB) + email channel
```

Strategie odbiorcow: `actor`, `assignee`, `companyUsers`, `companyUsersExceptActor`, custom function.

### Task (13 typow)

| Typ                    | Wyzwalacz                                             | Odbiorca                | Status     |
| ---------------------- | ----------------------------------------------------- | ----------------------- | ---------- |
| TASK_CREATED           | `@NotifyOn` POST /tasks                               | assignee                | aktywny    |
| TASK_UPDATED           | `@NotifyOn` PATCH /tasks/:id                          | assignee                | aktywny    |
| TASK_DELETED           | `@NotifyOn` DELETE /tasks/:id                         | companyUsersExceptActor | aktywny    |
| TASK_ASSIGNED          | —                                                     | —                       | tylko enum |
| TASK_UNASSIGNED        | —                                                     | —                       | tylko enum |
| TASK_COMPLETED         | `notifyTaskCompleted()` on DONE                       | companyUsersExceptActor | aktywny    |
| TASK_REOPENED          | —                                                     | —                       | tylko enum |
| TASK_OVERDUE           | `@Cron('0 8 * * *')` TaskDeadlineNotificationsService | assignee                | aktywny    |
| TASK_DUE_SOON          | `@Cron('5 8 * * *')` TaskDeadlineNotificationsService | assignee                | aktywny    |
| TASK_COMMENT_ADDED     | —                                                     | —                       | tylko enum |
| TASK_COMMENT_MENTIONED | —                                                     | —                       | tylko enum |
| TASK_BULK_UPDATED      | —                                                     | —                       | tylko enum |
| TASK_BULK_DELETED      | —                                                     | —                       | tylko enum |

### Client (24 typy)

| Typ                                 | Wyzwalacz                           | Odbiorca                | Status     |
| ----------------------------------- | ----------------------------------- | ----------------------- | ---------- |
| CLIENT_CREATED                      | —                                   | —                       | tylko enum |
| CLIENT_UPDATED                      | —                                   | —                       | tylko enum |
| CLIENT_DELETED                      | —                                   | —                       | tylko enum |
| CLIENT_RESTORED                     | —                                   | —                       | tylko enum |
| CLIENT_BULK_UPDATED                 | —                                   | —                       | tylko enum |
| CLIENT_BULK_DELETED                 | —                                   | —                       | tylko enum |
| CLIENT_DELETE_REQUESTED             | —                                   | —                       | tylko enum |
| CLIENT_DELETE_APPROVED              | —                                   | —                       | tylko enum |
| CLIENT_DELETE_REJECTED              | —                                   | —                       | tylko enum |
| CLIENT_SUSPENSION_CREATED           | `@NotifyOn` POST suspensions        | companyUsersExceptActor | aktywny    |
| CLIENT_SUSPENSION_UPDATED           | —                                   | —                       | tylko enum |
| CLIENT_SUSPENSION_DELETED           | —                                   | —                       | tylko enum |
| CLIENT_SUSPENSION_START_REMINDER_7D | `@Cron` SuspensionReminderService   | companyUsers            | aktywny    |
| CLIENT_SUSPENSION_START_REMINDER_1D | `@Cron` SuspensionReminderService   | companyUsers            | aktywny    |
| CLIENT_SUSPENSION_END_REMINDER_7D   | `@Cron` SuspensionReminderService   | companyUsers            | aktywny    |
| CLIENT_SUSPENSION_END_REMINDER_1D   | `@Cron` SuspensionReminderService   | companyUsers            | aktywny    |
| CLIENT_RESUMED                      | —                                   | —                       | tylko enum |
| CLIENT_RELIEF_CREATED               | `@NotifyOn` POST relief-periods     | companyUsersExceptActor | aktywny    |
| CLIENT_RELIEF_UPDATED               | —                                   | —                       | tylko enum |
| CLIENT_RELIEF_DELETED               | —                                   | —                       | tylko enum |
| CLIENT_RELIEF_END_REMINDER_7D       | `@Cron` ReliefPeriodReminderService | companyUsers            | aktywny    |
| CLIENT_RELIEF_END_REMINDER_1D       | `@Cron` ReliefPeriodReminderService | companyUsers            | aktywny    |
| CLIENT_CUSTOM_FIELD_REMINDER_7D     | `@Cron` CustomFieldReminderService  | companyUsers            | aktywny    |
| CLIENT_CUSTOM_FIELD_REMINDER_1D     | `@Cron` CustomFieldReminderService  | companyUsers            | aktywny    |

### Time Tracking (6 typow)

| Typ                  | Wyzwalacz                            | Odbiorca                | Status     |
| -------------------- | ------------------------------------ | ----------------------- | ---------- |
| TIME_ENTRY_CREATED   | `@NotifyOn` POST entries             | companyUsersExceptActor | aktywny    |
| TIME_ENTRY_UPDATED   | `@NotifyOn` PATCH entries/:id        | companyUsersExceptActor | aktywny    |
| TIME_ENTRY_DELETED   | `@NotifyOn` DELETE entries/:id       | companyUsersExceptActor | aktywny    |
| TIME_ENTRY_APPROVED  | `@NotifyOn` POST entries/:id/approve | entry owner             | aktywny    |
| TIME_ENTRY_REJECTED  | `@NotifyOn` POST entries/:id/reject  | entry owner             | aktywny    |
| TIME_ENTRY_SUBMITTED | —                                    | —                       | tylko enum |

### Settlement (9 typow)

| Typ                             | Wyzwalacz                         | Odbiorca                | Status     |
| ------------------------------- | --------------------------------- | ----------------------- | ---------- |
| SETTLEMENT_MONTH_INITIALIZED    | `@NotifyOn` POST initialize-month | companyUsersExceptActor | aktywny    |
| SETTLEMENT_STATUS_CHANGED       | `@NotifyOn` PATCH :id/status      | companyUsersExceptActor | aktywny    |
| SETTLEMENT_UPDATED              | `@NotifyOn` PATCH :id             | companyUsersExceptActor | aktywny    |
| SETTLEMENT_ASSIGNED             | `@NotifyOn` PATCH :id/assign      | companyUsersExceptActor | aktywny    |
| SETTLEMENT_UNASSIGNED           | —                                 | —                       | tylko enum |
| SETTLEMENT_COMPLETED            | —                                 | —                       | tylko enum |
| SETTLEMENT_BULK_ASSIGNED        | `@NotifyOn` POST bulk-assign      | companyUsersExceptActor | aktywny    |
| SETTLEMENT_COMMENT_ADDED        | `@NotifyOn` POST :id/comments     | companyUsersExceptActor | aktywny    |
| SETTLEMENT_DEADLINE_APPROACHING | —                                 | —                       | tylko enum |

### Offer (10 typow)

| Typ                      | Wyzwalacz                              | Odbiorca                | Status     |
| ------------------------ | -------------------------------------- | ----------------------- | ---------- |
| OFFER_CREATED            | `@NotifyOn` POST /offers               | companyUsersExceptActor | aktywny    |
| OFFER_UPDATED            | `@NotifyOn` PATCH /offers/:id          | companyUsersExceptActor | aktywny    |
| OFFER_DELETED            | `@NotifyOn` DELETE /offers/:id         | companyUsersExceptActor | aktywny    |
| OFFER_STATUS_CHANGED     | `@NotifyOn` PATCH :id/status           | companyUsersExceptActor | aktywny    |
| OFFER_SENT               | `@NotifyOn` POST :id/send              | companyUsersExceptActor | aktywny    |
| OFFER_DOCUMENT_GENERATED | `@NotifyOn` POST :id/generate-document | companyUsersExceptActor | aktywny    |
| OFFER_DUPLICATED         | `@NotifyOn` POST :id/duplicate         | companyUsersExceptActor | aktywny    |
| OFFER_ACCEPTED           | —                                      | —                       | tylko enum |
| OFFER_REJECTED           | —                                      | —                       | tylko enum |
| OFFER_EXPIRED            | —                                      | —                       | tylko enum |

### Lead (4 typy)

| Typ            | Wyzwalacz                    | Odbiorca     | Status     |
| -------------- | ---------------------------- | ------------ | ---------- |
| LEAD_CREATED   | `@NotifyOn` POST /leads      | companyUsers | aktywny    |
| LEAD_UPDATED   | `@NotifyOn` PATCH /leads/:id | companyUsers | aktywny    |
| LEAD_DELETED   | —                            | —            | tylko enum |
| LEAD_CONVERTED | —                            | —            | tylko enum |

### Email (2 typy)

| Typ               | Wyzwalacz | Odbiorca | Status     |
| ----------------- | --------- | -------- | ---------- |
| EMAIL_RECEIVED    | —         | —        | tylko enum |
| EMAIL_SEND_FAILED | —         | —        | tylko enum |

### AI Agent (2 typy)

| Typ                    | Wyzwalacz                        | Odbiorca      | Status  |
| ---------------------- | -------------------------------- | ------------- | ------- |
| AI_TOKEN_LIMIT_WARNING | TokenLimitService (programmatic) | company owner | aktywny |
| AI_TOKEN_LIMIT_REACHED | TokenLimitService (programmatic) | company owner | aktywny |

### Company / User Management (8 typow)

| Typ                   | Wyzwalacz | Odbiorca | Status     |
| --------------------- | --------- | -------- | ---------- |
| USER_INVITED          | —         | —        | tylko enum |
| USER_JOINED           | —         | —        | tylko enum |
| USER_REMOVED          | —         | —        | tylko enum |
| USER_ROLE_CHANGED     | —         | —        | tylko enum |
| MODULE_ACCESS_GRANTED | —         | —        | tylko enum |
| MODULE_ACCESS_REVOKED | —         | —        | tylko enum |
| PERMISSION_GRANTED    | —         | —        | tylko enum |
| PERMISSION_REVOKED    | —         | —        | tylko enum |

### System (3 typy)

| Typ                 | Wyzwalacz | Odbiorca | Status     |
| ------------------- | --------- | -------- | ---------- |
| SYSTEM_ANNOUNCEMENT | —         | —        | tylko enum |
| SYSTEM_MAINTENANCE  | —         | —        | tylko enum |
| SYSTEM_UPDATE       | —         | —        | tylko enum |

---

### Podsumowanie notyfikacji

| Metryka                             | Wartosc |
| ----------------------------------- | ------- |
| Typow w enumie                      | ~75     |
| Aktywnie podpietych (@NotifyOn)     | ~25     |
| Wyzwalanych przez Cron              | ~8      |
| Wyzwalanych programatycznie         | ~4      |
| **Tylko w enumie (bez wyzwalacza)** | **~38** |

### Brakujace testy e2e notyfikacji

#### Testy dostarczania (API E2E)

| #   | Test                                    | Priorytet | Opis                                                                     |
| --- | --------------------------------------- | --------- | ------------------------------------------------------------------------ |
| 1   | Task CRUD → notyfikacja in-app          | P0        | Utworz zadanie → sprawdz, czy assignee otrzymal notyfikacje TASK_CREATED |
| 2   | Task OVERDUE cron                       | P1        | Zadanie po deadline → cron → notyfikacja TASK_OVERDUE                    |
| 3   | Task DUE_SOON cron                      | P1        | Zadanie z deadline za 2 dni → cron → notyfikacja TASK_DUE_SOON           |
| 4   | Task COMPLETED transition               | P1        | Zmiana statusu na DONE → TASK_COMPLETED                                  |
| 5   | Time entry approve/reject → notyfikacja | P0        | Approve wpisu → notyfikacja do wlasciciela wpisu                         |
| 6   | Settlement status change → notyfikacja  | P1        | Zmiana statusu rozliczenia → SETTLEMENT_STATUS_CHANGED                   |
| 7   | Settlement comment → notyfikacja        | P1        | Dodanie komentarza → SETTLEMENT_COMMENT_ADDED                            |
| 8   | Settlement month init → notyfikacja     | P1        | Inicjalizacja miesiaca → SETTLEMENT_MONTH_INITIALIZED                    |
| 9   | Offer send → notyfikacja                | P1        | Wyslanie oferty → OFFER_SENT                                             |
| 10  | Offer status change → notyfikacja       | P1        | Zmiana statusu → OFFER_STATUS_CHANGED                                    |
| 11  | Lead created → notyfikacja              | P1        | Utworzenie leada → LEAD_CREATED do companyUsers                          |
| 12  | Client suspension created → notyfikacja | P1        | Utworzenie zawieszenia → CLIENT_SUSPENSION_CREATED                       |
| 13  | Client suspension reminders (cron)      | P2        | 7d/1d przed rozpoczeciem/zakonczeniem zawieszenia                        |
| 14  | Client relief reminders (cron)          | P2        | 7d/1d przed zakonczeniem ulgi                                            |
| 15  | Client custom field reminders (cron)    | P2        | 7d/1d przed terminem pola niestandardowego                               |
| 16  | AI token limit warning                  | P2        | Zbliżanie się do limitu → AI_TOKEN_LIMIT_WARNING                         |
| 17  | AI token limit reached                  | P2        | Osiagniecie limitu → AI_TOKEN_LIMIT_REACHED                              |

#### Testy UI (Web E2E)

| #   | Test                               | Priorytet | Opis                                                          |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------- |
| 18  | Notyfikacja pojawia sie w bell     | P0        | Akcja (np. assign task) → dzwonek pokazuje nowa notyfikacje   |
| 19  | Klikniecie notyfikacji → nawigacja | P1        | Notyfikacja z actionUrl → klikniecie przenosi do zasobu       |
| 20  | Ustawienia notyfikacji per modul   | P1        | Wylaczenie in-app/email dla wybranego typu → brak notyfikacji |
| 21  | Filtrowanie notyfikacji po module  | P2        | Dropdown filtra modulu na liscie powiadomien                  |
| 22  | Notyfikacje email channel          | P2        | Weryfikacja wyslania emaila (mock SMTP)                       |

#### Testy typow "tylko enum" (brak wyzwalacza)

Ponizsze typy sa zarejestrowane w enumie, ale nie maja podpietego wyzwalacza. Nalezy zdecydowac, czy powinny zostac zaimplementowane, czy usuniete z enuma:

| Domena        | Typy bez wyzwalacza                                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Task          | TASK_ASSIGNED, TASK_UNASSIGNED, TASK_REOPENED, TASK_COMMENT_ADDED, TASK_COMMENT_MENTIONED, TASK_BULK_UPDATED, TASK_BULK_DELETED                                                                                                                                                                        |
| Client        | CLIENT_CREATED, CLIENT_UPDATED, CLIENT_DELETED, CLIENT_RESTORED, CLIENT_BULK_UPDATED, CLIENT_BULK_DELETED, CLIENT_DELETE_REQUESTED, CLIENT_DELETE_APPROVED, CLIENT_DELETE_REJECTED, CLIENT_SUSPENSION_UPDATED, CLIENT_SUSPENSION_DELETED, CLIENT_RESUMED, CLIENT_RELIEF_UPDATED, CLIENT_RELIEF_DELETED |
| Time Tracking | TIME_ENTRY_SUBMITTED                                                                                                                                                                                                                                                                                   |
| Settlement    | SETTLEMENT_UNASSIGNED, SETTLEMENT_COMPLETED, SETTLEMENT_DEADLINE_APPROACHING                                                                                                                                                                                                                           |
| Offer         | OFFER_ACCEPTED, OFFER_REJECTED, OFFER_EXPIRED                                                                                                                                                                                                                                                          |
| Lead          | LEAD_DELETED, LEAD_CONVERTED                                                                                                                                                                                                                                                                           |
| Email         | EMAIL_RECEIVED, EMAIL_SEND_FAILED                                                                                                                                                                                                                                                                      |
| User/Company  | USER_INVITED, USER_JOINED, USER_REMOVED, USER_ROLE_CHANGED, MODULE_ACCESS_GRANTED, MODULE_ACCESS_REVOKED, PERMISSION_GRANTED, PERMISSION_REVOKED                                                                                                                                                       |
| System        | SYSTEM_ANNOUNCEMENT, SYSTEM_MAINTENANCE, SYSTEM_UPDATE                                                                                                                                                                                                                                                 |

> **Razem: 38 typow bez wyzwalacza** — do decyzji: implementacja lub cleanup enuma.

---

## Znane ograniczenia

- Brak backend unit testow dla: Tasks, Documents, Email Client, AI Agent, Leads
- Brak frontend unit testow dla: Settlements, Offers, Documents, Notifications, Admin
- ~~Brak API e2e testow dla: Tasks, Settlements, Time Tracking~~ → ✅ pokryte (2026-03-09)
- `bun test` ma ~137 pre-existing failures (konflikty Playwright, testy RBAC service)
- Offers module spec ma pre-existing module resolution issue
- Nowe testy E2E (Web + API) wymagaja uruchomienia z aktywnym backendem i seedowanymi danymi — patrz sekcja "Weryfikacja" w planie implementacji
