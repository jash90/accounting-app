# Podsumowanie testów per modul

> Wygenerowano: 2026-03-06 | Pliki testowe: 56 | Szacowana liczba przypadkow testowych: ~1560+

## Infrastruktura testowa

| Runner     | Zakres                 | Konfiguracja                   |
| ---------- | ---------------------- | ------------------------------ |
| Jest       | Backend unit + API e2e | `jest.config.ts` per projekt   |
| Vitest     | Frontend unit          | `vitest.config.ts` (happy-dom) |
| Playwright | Web e2e                | `playwright.config.ts`         |

## Tabela zbiorcza

| Modul         | Backend unit | Frontend unit | API e2e | Web e2e | Razem plikow |
| ------------- | :----------: | :-----------: | :-----: | :-----: | :----------: |
| Auth/RBAC     |      2       |       2       |    1    |    3    |      8       |
| Clients       |      4       |       0       |    4    |    1    |      9       |
| Tasks         |      0       |       0       |    0    |    2    |      2       |
| Time Tracking |      6       |       1       |    0    |    2    |      9       |
| Settlements   |      1       |       0       |    0    |    3    |      4       |
| Offers        |      1       |       0       |    0    |    2    |      3       |
| Documents     |      0       |       0       |    0    |    1    |      1       |
| Email Client  |      0       |       0       |    0    |    2    |      2       |
| Notifications |      1       |       0       |    0    |    1    |      2       |
| AI Agent      |      0       |       0       |    0    |    1    |      1       |
| Admin/Company |      0       |       0       |    0    |    5    |      5       |
| Common/Infra  |      4       |       6       |    1    |    3    |      14      |
| **Razem**     |    **19**    |     **9**     |  **6**  | **26**  |    **60**    |

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

| Plik                               | Describe                                          | ~Testow |
| ---------------------------------- | ------------------------------------------------- | ------- |
| `apps/api-e2e/src/api/api.spec.ts` | RBAC E2E — Auth, Admin, Owner, Employee endpoints | 8       |

### Web e2e

| Plik                                            | Zakres                                              | ~Testow |
| ----------------------------------------------- | --------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/auth.spec.ts`           | Login, logout, role routing, multi-tenant isolation | 18      |
| `apps/web-e2e/src/rbac.spec.ts`                 | ADMIN, COMPANY_OWNER, EMPLOYEE access               | 4       |
| `apps/web-e2e/src/tests/bug-auth-login.spec.ts` | Animation, re-render, auth persistence              | 4       |

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

| Plik                                        | Zakres                                   | ~Testow |
| ------------------------------------------- | ---------------------------------------- | ------- |
| `apps/web-e2e/src/tests/client-pkd.spec.ts` | PKD code selection, AML group, filtering | 20      |

---

## Tasks

### Web e2e

| Plik                                              | Zakres                                          | ~Testow |
| ------------------------------------------------- | ----------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/task-templates.spec.ts`   | Templates CRUD, recurrence, validation          | 10      |
| `apps/web-e2e/src/tests/bug-tasks-kanban.spec.ts` | Kanban columns, drag reason dialogs, statistics | 9       |

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

### Web e2e

| Plik                                               | Zakres                                          | ~Testow |
| -------------------------------------------------- | ----------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/time-tracking.spec.ts`     | Timer start/stop, manual entry, duration, views | 18      |
| `apps/web-e2e/src/tests/bug-time-tracking.spec.ts` | Timer widget, statistics, period selector       | 8       |

---

## Settlements

### Backend unit

| Plik                                                                            | Describe                                                                    | ~Testow |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| `libs/modules/settlements/src/lib/services/settlement-comments.service.spec.ts` | SettlementCommentsService — get/add comments, multi-tenancy, access control | ~20     |

### Web e2e

| Plik                                                 | Zakres                                          | ~Testow |
| ---------------------------------------------------- | ----------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/settlement-settings.spec.ts` | Priority, deadline, notifications, email dialog | 11      |
| `apps/web-e2e/src/tests/bug-settlements.spec.ts`     | Column headers, actions menu, edit dialog       | 5       |
| `apps/web-e2e/src/tests/csv-export.spec.ts`          | CSV export (tasks, settlements, offers, leads)  | 5       |

---

## Offers

### Backend unit

| Plik                                                                   | Describe                                                                                                                                      | ~Testow |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `libs/modules/offers/src/lib/services/docx-generation.service.spec.ts` | DocxGenerationService Security — template injection, placeholder whitelist, size limit, XML escaping, null handling, date/currency formatting | ~30     |

### Web e2e

| Plik                                              | Zakres                                                 | ~Testow |
| ------------------------------------------------- | ------------------------------------------------------ | ------- |
| `apps/web-e2e/src/tests/offers.spec.ts`           | Leads, templates, offers CRUD, detail, status workflow | 87      |
| `apps/web-e2e/src/tests/bug-offers-pages.spec.ts` | Page load without errors, subpage navigation           | 6       |

---

## Documents

### Web e2e

| Plik                                       | Zakres                                              | ~Testow |
| ------------------------------------------ | --------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/documents.spec.ts` | Template CRUD, generated documents, content display | 18      |

---

## Email Client

### Web e2e

| Plik                                              | Zakres                                                            | ~Testow |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/email-client.spec.ts`     | Inbox, compose, drafts, message detail, attachments, bulk actions | 65      |
| `apps/web-e2e/src/tests/email-auto-reply.spec.ts` | Template CRUD, active status, validation                          | 12      |

---

## Notifications

### Backend unit

| Plik                                                                                  | Describe                                                                                                       | ~Testow |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| `libs/modules/notifications/src/lib/services/notification-dispatcher.service.spec.ts` | Security — recipient validation, channel routing, module slug, event emission, company-wide, batch, action URL | ~25     |

### Web e2e

| Plik                                           | Zakres                                        | ~Testow |
| ---------------------------------------------- | --------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/notifications.spec.ts` | Bell, dropdown, tabs, badge count, navigation | 21      |

---

## AI Agent

### Web e2e

| Plik                                      | Zakres                                                   | ~Testow |
| ----------------------------------------- | -------------------------------------------------------- | ------- |
| `apps/web-e2e/src/tests/ai-agent.spec.ts` | Chat interface, conversations, token counts, role access | 14      |

---

## Admin / Company

### Web e2e

| Plik                                                     | Zakres                                              | ~Testow |
| -------------------------------------------------------- | --------------------------------------------------- | ------- |
| `apps/web-e2e/src/admin.spec.ts`                         | Dashboard, users, companies, modules views          | 5       |
| `apps/web-e2e/src/tests/admin-workflows.spec.ts`         | Users CRUD, companies CRUD, modules management      | 40      |
| `apps/web-e2e/src/tests/company-owner-workflows.spec.ts` | Employees, permissions, modules                     | 22      |
| `apps/web-e2e/src/tests/company-profile.spec.ts`         | Profile sections, NIP, owner, address, bank         | 8       |
| `apps/web-e2e/src/tests/employee-sidebar.spec.ts`        | Sidebar navigation, module display, collapse/expand | 16      |

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

| Katalog          | Page Object                                                                                                                                                                                                  | Plik                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `base/`          | BasePage                                                                                                                                                                                                     | `BasePage.ts`                         |
| `auth/`          | LoginPage, UnauthorizedPage                                                                                                                                                                                  | `LoginPage.ts`, `UnauthorizedPage.ts` |
| `admin/`         | AdminDashboardPage, CompaniesListPage, CompanyFormPage, ModulesListPage, UserFormPage, UsersListPage                                                                                                         | 6 plikow                              |
| `company/`       | CompanyDashboardPage, CompanyModulesListPage, CompanyProfilePage, EmployeesListPage, EmployeePermissionsPage                                                                                                 | 5 plikow                              |
| `employee/`      | ModulesDashboardPage                                                                                                                                                                                         | `ModulesDashboardPage.ts`             |
| `modules/`       | AIAgentChatPage, ClientsPage, DocumentsPage, EmailAutoReplyTemplatesPage, OffersPage, SettlementsPage, TasksKanbanPage, TasksStatisticsPage, TaskTemplatesPage, TimeTrackingPage, TimeTrackingStatisticsPage | 11 plikow                             |
| `email/`         | EmailComposePage, EmailDraftsPage, EmailInboxPage, EmailMessagePage                                                                                                                                          | 4 pliki + `index.ts`                  |
| `notifications/` | NotificationsPage                                                                                                                                                                                            | `NotificationsPage.ts`                |
| `components/`    | NavigationComponent, NotificationBellComponent, ToastComponent                                                                                                                                               | 3 pliki                               |

**Razem: 35 page objects/components**

---

## Fixtures i helpery e2e

### Fixtures

| Plik                                         | Opis                                 |
| -------------------------------------------- | ------------------------------------ |
| `apps/web-e2e/src/fixtures/auth.fixtures.ts` | Dane logowania per rola              |
| `apps/web-e2e/src/fixtures/data.fixtures.ts` | Dane testowe (klienci, zadania itp.) |

### Helpers

| Plik                              | Opis                          |
| --------------------------------- | ----------------------------- |
| `helpers/test.helpers.ts`         | Wspolne utility testowe       |
| `helpers/types.ts`                | Typy pomocnicze               |
| `helpers/api.helpers.ts`          | Helpery zapytan API           |
| `helpers/wait.helpers.ts`         | Oczekiwanie na elementy/stany |
| `helpers/screenshot.helpers.ts`   | Zrzuty ekranu                 |
| `helpers/mcp-analysis.helpers.ts` | Analiza MCP                   |
| `helpers/report-generator.ts`     | Generowanie raportow          |

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

## Znane ograniczenia

- Brak backend unit testow dla: Tasks, Documents, Email Client, AI Agent, Leads
- Brak frontend unit testow dla: Settlements, Offers, Documents, Notifications, Admin
- `bun test` ma ~137 pre-existing failures (konflikty Playwright, testy RBAC service)
- Offers module spec ma pre-existing module resolution issue
