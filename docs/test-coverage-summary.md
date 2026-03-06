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

## Brakujace testy e2e

### Legenda priorytetow

- **P0** — krytyczne sciezki uzytkownika (logowanie, CRUD glownych encji, platnosci)
- **P1** — wazne funkcjonalnosci biznesowe
- **P2** — dodatkowe widoki, edge cases, ustawienia

---

### Web E2E — brakujace testy

#### Auth / Sesja

| #   | Test                      | Priorytet | Opis                                                                                        |
| --- | ------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| 1   | Zmiana hasla              | P1        | `/settings/account` — formularz zmiany hasla, walidacja starego hasla, potwierdzenie nowego |
| 2   | Wygasniecie tokena        | P1        | Symulacja wygasniecia JWT → automatyczne odswiezenie lub redirect do `/login`               |
| 3   | Strona 404                | P2        | Nawigacja do nieistniejacego URL → wyswietlenie strony NotFound                             |
| 4   | Strona 403 / Unauthorized | P2        | Proba dostepu do chronionej trasy bez uprawnien → `/unauthorized`                           |
| 5   | Strona ModuleAccessDenied | P2        | Pracownik bez modulu → `/module-access-denied`                                              |

#### Clients

| #   | Test                               | Priorytet | Opis                                                              |
| --- | ---------------------------------- | --------- | ----------------------------------------------------------------- |
| 6   | Klienci CRUD (create/edit/delete)  | P0        | Tworzenie klienta, edycja pol, soft-delete, przywracanie          |
| 7   | Klient — strona szczegolowa        | P0        | `/modules/clients/:id` — wyswietlenie danych, zakladki, changelog |
| 8   | Klienci — wyszukiwanie i filtry    | P1        | Filtrowanie po nazwie, NIP, statusie; paginacja                   |
| 9   | Klienci — eksport CSV              | P1        | Przycisk eksportu → pobranie pliku CSV                            |
| 10  | Klienci — pola niestandardowe (UI) | P1        | Tworzenie/edycja definicji pol, wypelnianie wartosci na kliencie  |
| 11  | Klienci — wykrywanie duplikatow    | P2        | Formularz tworzenia → ostrzezenie o duplikacie NIP                |
| 12  | Klienci — workflow usuwania        | P1        | Pracownik sklada wniosek → wlasciciel zatwierdza/odrzuca          |
| 13  | Klienci — ustawienia modulu        | P2        | `/modules/clients/settings` — konfiguracja auto-assign, ikon      |
| 14  | Klienci — dashboard                | P2        | `/modules/clients` — widok dashboard z podsumowaniem              |

#### Tasks (Zadania)

| #   | Test                              | Priorytet | Opis                                                                                    |
| --- | --------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| 15  | Zadania CRUD (create/edit/delete) | P0        | Tworzenie zadania z formularzem, edycja, soft-delete                                    |
| 16  | Zadania — lista z filtrami        | P0        | `/modules/tasks/list` — filtrowanie po statusie, priorytecie, przypisanym, kliencie     |
| 17  | Zadania — widok kalendarza        | P1        | `/modules/tasks/calendar` — wyswietlenie zadan na kalendarzu                            |
| 18  | Zadania — widok timeline          | P1        | `/modules/tasks/timeline` — os czasu zadan                                              |
| 19  | Zadania — etykiety CRUD           | P1        | Tworzenie/edycja/usuwanie etykiet zadan                                                 |
| 20  | Zadania — komentarze              | P1        | Dodawanie/wyswietlanie komentarzy pod zadaniem                                          |
| 21  | Zadania — zaleznosci              | P2        | Dodawanie/usuwanie powiazania miedzy zadaniami                                          |
| 22  | Zadania — bulk update statusu     | P1        | Zaznaczenie wielu zadan → zmiana statusu hurtowo                                        |
| 23  | Zadania — eksport CSV             | P1        | Juz testowane czesciowo w `csv-export.spec.ts`, ale brak dedykowanego testu listy zadan |
| 24  | Zadania — ustawienia modulu       | P2        | `/modules/tasks/settings` — konfiguracja                                                |
| 25  | Zadania — dashboard               | P2        | `/modules/tasks` — dashboard z KPI                                                      |
| 26  | Zadania — reorder (drag)          | P2        | Zmiana kolejnosci zadan w liscie                                                        |
| 27  | Zadania — statystyki (pelne)      | P1        | `/modules/tasks/statistics` — wykresy, status-duration (czesciowo w bug-tasks-kanban)   |

#### Time Tracking (Ewidencja czasu)

| #   | Test                                      | Priorytet | Opis                                                                            |
| --- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------- |
| 28  | Ewidencja — lista wpisow CRUD             | P0        | `/modules/time-tracking/entries` — tworzenie reczne, edycja, usuwanie wpisu     |
| 29  | Ewidencja — timesheet dzienny             | P1        | `/modules/time-tracking/timesheet/daily` — widok dnia                           |
| 30  | Ewidencja — timesheet tygodniowy          | P1        | `/modules/time-tracking/timesheet/weekly` — widok tygodnia                      |
| 31  | Ewidencja — raporty                       | P1        | `/modules/time-tracking/reports` — raporty zbiorcze                             |
| 32  | Ewidencja — raport per klient             | P1        | `/modules/time-tracking/reports/by-client/:id` — raport dla klienta             |
| 33  | Ewidencja — ustawienia                    | P2        | `/modules/time-tracking/settings` — zaokraglanie, wymog akceptacji, overlapping |
| 34  | Ewidencja — blokowanie/odblokowanie wpisu | P1        | Lock/unlock wpisu czasu przez managera                                          |
| 35  | Ewidencja — akceptacja/odrzucenie wpisu   | P1        | Workflow approve/reject dla wpisow                                              |
| 36  | Ewidencja — dashboard                     | P2        | `/modules/time-tracking` — dashboard z podsumowaniem                            |

#### Settlements (Rozliczenia)

| #   | Test                                 | Priorytet | Opis                                                                      |
| --- | ------------------------------------ | --------- | ------------------------------------------------------------------------- |
| 37  | Rozliczenia — lista z filtrami       | P0        | `/modules/settlements/list` — filtrowanie po miesiacu, statusie, kliencie |
| 38  | Rozliczenia — zmiana statusu         | P0        | Workflow statusow: nowe → w trakcie → zakonczone                          |
| 39  | Rozliczenia — przypisanie pracownika | P1        | Assign + bulk assign rozliczen do pracownikow                             |
| 40  | Rozliczenia — komentarze             | P1        | `/modules/settlements/:id/comments` — dodawanie/wyswietlanie              |
| 41  | Rozliczenia — inicjalizacja miesiaca | P1        | Przycisk "Inicjalizuj miesiac" → tworzenie rozliczen                      |
| 42  | Rozliczenia — zespol                 | P2        | `/modules/settlements/team` — widok zespolowy                             |
| 43  | Rozliczenia — statystyki             | P2        | Dashboard z wykresami rozliczen                                           |
| 44  | Rozliczenia — eksport CSV            | P1        | Juz czesciowo w `csv-export.spec.ts`, ale brak pelnego testu              |
| 45  | Rozliczenia — dashboard              | P2        | `/modules/settlements` — dashboard                                        |

#### Offers (Oferty) — uzupelnienia

| #   | Test                      | Priorytet | Opis                                                             |
| --- | ------------------------- | --------- | ---------------------------------------------------------------- |
| 46  | Oferta — wysylanie        | P0        | Przycisk "Wyslij oferte" → dialog potwierdzenia → zmiana statusu |
| 47  | Oferta — duplikowanie     | P1        | Przycisk "Duplikuj" → nowa oferta z skopiowanymi danymi          |
| 48  | Szablon oferty — edytor   | P1        | `/modules/offers/templates/:id/editor` — edycja content blocks   |
| 49  | Lead — strona szczegolowa | P1        | `/modules/offers/leads/:id` — pelny widok leada                  |

#### Documents (Dokumenty) — uzupelnienia

| #   | Test                              | Priorytet | Opis                                                                  |
| --- | --------------------------------- | --------- | --------------------------------------------------------------------- |
| 50  | Szablon — edytor content blocks   | P1        | `/modules/documents/templates/:id/editor` — edycja blokow             |
| 51  | Generowanie dokumentu             | P0        | Wybranie szablonu + klienta → generowanie → podglad                   |
| 52  | Wygenerowany dokument — szczegoly | P1        | `/modules/documents/generated/:id` — podglad wygenerowanego dokumentu |
| 53  | Dokumenty — dashboard             | P2        | `/modules/documents` — dashboard z podsumowaniem                      |

#### Email Client — uzupelnienia

| #   | Test                         | Priorytet | Opis                                                               |
| --- | ---------------------------- | --------- | ------------------------------------------------------------------ |
| 54  | Wyslane                      | P1        | `/modules/email-client/sent` — lista wyslanych wiadomosci          |
| 55  | Kosz                         | P1        | `/modules/email-client/trash` — usuwanie i przywracanie wiadomosci |
| 56  | Foldery niestandardowe       | P2        | `/modules/email-client/folder/:name` — nawigacja po folderach IMAP |
| 57  | Zalaczniki — upload/download | P1        | Dodawanie zalacznika w compose, pobieranie z wiadomosci            |
| 58  | Usuwanie wiadomosci          | P1        | Przeniesienie do kosza z inbox/sent                                |

#### AI Agent — uzupelnienia

| #   | Test                 | Priorytet | Opis                                                                                 |
| --- | -------------------- | --------- | ------------------------------------------------------------------------------------ |
| 59  | Konfiguracja AI      | P1        | `/modules/ai-agent/configuration` — tworzenie/edycja konfiguracji (klucz API, model) |
| 60  | Pliki kontekstowe    | P1        | `/modules/ai-agent/context` — upload/usuwanie plikow RAG                             |
| 61  | Zuzycie tokenow      | P2        | `/modules/ai-agent/token-usage` — tabela zuzycia, filtrowanie                        |
| 62  | Usuwanie konwersacji | P2        | Lista konwersacji → usun → potwierdzenie                                             |

#### Notifications — uzupelnienia

| #   | Test                          | Priorytet | Opis                                                   |
| --- | ----------------------------- | --------- | ------------------------------------------------------ |
| 63  | Archiwum powiadomien          | P1        | `/notifications/archive` — lista zarchiwizowanych      |
| 64  | Ustawienia powiadomien        | P2        | `/notifications/settings` — konfiguracja kanalow/typow |
| 65  | Oznacz wiele jako przeczytane | P1        | Zaznacz kilka → "Oznacz jako przeczytane" hurtowo      |
| 66  | Usuwanie powiadomienia        | P2        | Usun z listy → toast potwierdzenia                     |

#### Settings (Ustawienia)

| #   | Test                         | Priorytet | Opis                                                                |
| --- | ---------------------------- | --------- | ------------------------------------------------------------------- |
| 67  | Ustawienia konta             | P1        | `/settings/account` — zmiana danych uzytkownika                     |
| 68  | Ustawienia wygladu           | P2        | `/settings/appearance` — wybor motywu (czesciowo w `theme.spec.ts`) |
| 69  | Konfiguracja email (user)    | P1        | `/settings/email-config` — SMTP/IMAP uzytkownika                    |
| 70  | Konfiguracja email (company) | P1        | `/company/email-config` — SMTP/IMAP firmy                           |
| 71  | Konfiguracja email (admin)   | P2        | `/admin/email-config` — SMTP/IMAP systemowy                         |

#### Multi-tenant / izolacja per rola

| #   | Test                                      | Priorytet | Opis                                                                  |
| --- | ----------------------------------------- | --------- | --------------------------------------------------------------------- |
| 72  | Pracownik nie widzi danych innej firmy    | P0        | Logowanie jako employee firmy A → brak dostepu do danych firmy B      |
| 73  | Pracownik nie widzi modulow bez uprawnien | P1        | Modul wylaczony → brak w sidebar, redirect na `/module-access-denied` |
| 74  | Wlasciciel nie widzi panelu admina        | P1        | COMPANY_OWNER → `/admin` zwraca 403                                   |

---

### API E2E — brakujace testy

#### Auth

| #   | Test                             | Priorytet | Opis                                             |
| --- | -------------------------------- | --------- | ------------------------------------------------ |
| 1   | POST /auth/register              | P0        | Rejestracja nowego uzytkownika, walidacja danych |
| 2   | POST /auth/login + /auth/refresh | P0        | Logowanie → token → odswiezenie tokena           |
| 3   | PATCH /auth/change-password      | P1        | Zmiana hasla, walidacja starego hasla            |
| 4   | GET /auth/me                     | P1        | Pobranie danych zalogowanego uzytkownika         |

#### Admin — Users

| #   | Test                     | Priorytet | Opis                                            |
| --- | ------------------------ | --------- | ----------------------------------------------- |
| 5   | Users CRUD               | P0        | GET/POST/PATCH/DELETE /admin/users — pelny cykl |
| 6   | Activate/deactivate user | P1        | PATCH /admin/users/:id/activate — toggle        |
| 7   | Available owners         | P2        | GET /admin/available-owners                     |

#### Admin — Companies

| #   | Test              | Priorytet | Opis                                   |
| --- | ----------------- | --------- | -------------------------------------- |
| 8   | Companies CRUD    | P0        | GET/POST/PATCH/DELETE /admin/companies |
| 9   | Company profile   | P1        | GET/PATCH /admin/companies/:id/profile |
| 10  | Company employees | P1        | GET /admin/companies/:id/employees     |

#### Company

| #   | Test                 | Priorytet | Opis                                     |
| --- | -------------------- | --------- | ---------------------------------------- |
| 11  | Company profile CRUD | P0        | GET/PATCH /company/profile               |
| 12  | Employees CRUD       | P0        | GET/POST/PATCH/DELETE /company/employees |

#### Modules / Permissions

| #   | Test                            | Priorytet | Opis                                    |
| --- | ------------------------------- | --------- | --------------------------------------- |
| 13  | Modules CRUD (admin)            | P0        | GET/POST/PATCH/DELETE /modules          |
| 14  | Permissions grant/update/revoke | P1        | POST/PATCH/DELETE /modules/permissions  |
| 15  | Employee modules                | P1        | GET /modules/employee/:id               |
| 16  | Company modules                 | P1        | GET /modules/companies/:companyId       |
| 17  | Module discovery                | P2        | GET /modules/discovery/\* + POST reload |

#### Tasks

| #   | Test                | Priorytet | Opis                                     |
| --- | ------------------- | --------- | ---------------------------------------- |
| 18  | Tasks CRUD          | P0        | GET/POST/PATCH/DELETE /modules/tasks     |
| 19  | Kanban board        | P1        | GET /modules/tasks/kanban                |
| 20  | Task labels CRUD    | P1        | Sub-controller endpointy etykiet         |
| 21  | Task templates CRUD | P1        | Sub-controller endpointy szablonow       |
| 22  | Task comments       | P1        | Sub-controller endpointy komentarzy      |
| 23  | Task dependencies   | P2        | Sub-controller endpointy zaleznosci      |
| 24  | Task statistics     | P1        | GET /modules/tasks/statistics + extended |
| 25  | Bulk status update  | P1        | POST /modules/tasks/bulk/status          |
| 26  | Task reorder        | P2        | PATCH /modules/tasks/reorder             |
| 27  | Task export CSV     | P1        | GET /modules/tasks/export                |

#### Time Tracking

| #   | Test               | Priorytet | Opis                                                 |
| --- | ------------------ | --------- | ---------------------------------------------------- |
| 28  | Time entries CRUD  | P0        | GET/POST/PATCH/DELETE /modules/time-tracking/entries |
| 29  | Timer start/stop   | P0        | POST /modules/time-tracking/timer/start + stop       |
| 30  | Active timer       | P1        | POST /modules/time-tracking/timer/active             |
| 31  | Lock/unlock entry  | P1        | POST entries/:id/lock + unlock                       |
| 32  | Reports            | P1        | GET /modules/time-tracking/reports                   |
| 33  | Report by client   | P1        | GET /modules/time-tracking/reports/by-client/:id     |
| 34  | Time settings CRUD | P2        | GET/PATCH /modules/time-tracking/settings            |

#### Settlements

| #   | Test                 | Priorytet | Opis                                       |
| --- | -------------------- | --------- | ------------------------------------------ |
| 35  | Settlements CRUD     | P0        | GET/POST/PATCH /modules/settlements        |
| 36  | Status update        | P0        | PATCH /modules/settlements/:id/status      |
| 37  | Assign + bulk assign | P1        | POST assign + bulk/assign                  |
| 38  | Comments CRUD        | P1        | GET/POST /modules/settlements/:id/comments |
| 39  | Initialize month     | P1        | POST /modules/settlements/initialize-month |
| 40  | Statistics           | P2        | GET /modules/settlements/statistics        |
| 41  | Settlement settings  | P2        | GET/PATCH /modules/settlements/settings    |
| 42  | Export CSV           | P1        | GET /modules/settlements/export            |

#### Offers

| #   | Test                 | Priorytet | Opis                                        |
| --- | -------------------- | --------- | ------------------------------------------- |
| 43  | Offers CRUD          | P0        | GET/POST/PATCH/DELETE /modules/offers       |
| 44  | Send offer           | P0        | POST /modules/offers/:id/send               |
| 45  | Duplicate offer      | P1        | POST /modules/offers/:id/duplicate          |
| 46  | Status update        | P1        | PATCH /modules/offers/:id/status            |
| 47  | Leads CRUD           | P0        | GET/POST/PATCH/DELETE /modules/offers/leads |
| 48  | Offer templates CRUD | P1        | Endpointy szablonow ofert                   |
| 49  | Export CSV           | P1        | GET /modules/offers/export                  |

#### Documents

| #   | Test                          | Priorytet | Opis                                                      |
| --- | ----------------------------- | --------- | --------------------------------------------------------- |
| 50  | Document templates CRUD       | P0        | GET/POST/PATCH/DELETE /modules/documents/templates        |
| 51  | Content blocks                | P1        | GET/PATCH /modules/documents/templates/:id/content-blocks |
| 52  | Template content (Handlebars) | P1        | GET /modules/documents/templates/:id/content              |
| 53  | Generate document             | P0        | POST /modules/documents/generated                         |
| 54  | Generated documents list      | P1        | GET /modules/documents/generated                          |

#### Email Client

| #   | Test                      | Priorytet | Opis                                               |
| --- | ------------------------- | --------- | -------------------------------------------------- |
| 55  | Messages CRUD             | P0        | GET/POST/DELETE /modules/email-client/messages     |
| 56  | Drafts CRUD               | P1        | GET/POST/PATCH/DELETE /modules/email-client/drafts |
| 57  | Auto-reply templates CRUD | P1        | Endpointy szablonow auto-reply                     |
| 58  | Attachments               | P1        | Upload/download zalacznikow                        |

#### AI Agent

| #   | Test                     | Priorytet | Opis                                                  |
| --- | ------------------------ | --------- | ----------------------------------------------------- |
| 59  | Configuration CRUD       | P1        | GET/POST/PATCH/DELETE /modules/ai-agent/configuration |
| 60  | Conversations CRUD       | P0        | GET/POST/DELETE /modules/ai-agent/conversations       |
| 61  | Messages in conversation | P0        | GET/POST /modules/ai-agent/conversations/:id/messages |
| 62  | Token usage              | P2        | GET /modules/ai-agent/token-usage                     |
| 63  | Context files            | P1        | Upload/list/delete plikow kontekstowych               |

#### Notifications

| #   | Test                  | Priorytet | Opis                                   |
| --- | --------------------- | --------- | -------------------------------------- |
| 64  | Notifications list    | P0        | GET /notifications z filtrami          |
| 65  | Unread count          | P1        | GET /notifications/unread-count        |
| 66  | Mark read/unread      | P1        | PATCH /notifications/:id/read + unread |
| 67  | Mark multiple         | P1        | PATCH /notifications/mark-multiple     |
| 68  | Delete notification   | P2        | DELETE /notifications/:id              |
| 69  | Notification settings | P2        | GET/PATCH /notifications/settings      |

#### Email Config

| #   | Test                      | Priorytet | Opis                                           |
| --- | ------------------------- | --------- | ---------------------------------------------- |
| 70  | User email config CRUD    | P1        | GET/POST/PUT/DELETE /email-config/user         |
| 71  | Company email config CRUD | P1        | GET/POST/PUT/DELETE /email-config/company      |
| 72  | System admin email config | P2        | GET/POST/PUT/DELETE /email-config/system-admin |
| 73  | SMTP/IMAP connection test | P1        | POST /email-config/test/\*                     |

---

### Podsumowanie brakow

| Kategoria      | Web E2E | API E2E |  Razem  |
| -------------- | :-----: | :-----: | :-----: |
| P0 (krytyczne) |    7    |   16    |   23    |
| P1 (wazne)     |   40    |   38    |   78    |
| P2 (dodatkowe) |   27    |   19    |   46    |
| **Razem**      | **74**  | **73**  | **147** |

> Najwieksze luki: Tasks (brak jakiegokolwiek API e2e), Settlements (brak API e2e), Time Tracking (brak API e2e), Clients UI CRUD (brak web e2e poza PKD).

---

## Notyfikacje — inwentarz i pokrycie testowe

## Znane ograniczenia

- Brak backend unit testow dla: Tasks, Documents, Email Client, AI Agent, Leads
- Brak frontend unit testow dla: Settlements, Offers, Documents, Notifications, Admin
- `bun test` ma ~137 pre-existing failures (konflikty Playwright, testy RBAC service)
- Offers module spec ma pre-existing module resolution issue
