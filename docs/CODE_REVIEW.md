# 🔍 Code Review — Accounting SaaS Platform

**Data:** 2026-04-03
**Reviewer:** Claude Code (automated)

## Przegląd projektu

| Metryka              | Wartość                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **Backend**          | NestJS 11 + TypeORM + PostgreSQL                                                                         |
| **Frontend**         | React 19 + Vite + TanStack Query + shadcn/ui                                                             |
| **Monorepo**         | Nx 22                                                                                                    |
| **Moduły biznesowe** | 9 (clients, tasks, time-tracking, settlements, offers, documents, email-client, ai-agent, notifications) |
| **Linie kodu (TS)**  | ~101K (bez testów)                                                                                       |
| **Pliki testowe**    | 173                                                                                                      |
| **Migracje**         | 60+                                                                                                      |

---

## 🚨 KRYTYCZNE (wymagają natychmiastowej naprawy)

### 1. WYCIEK SEKRETÓW W `.env` — Severity: CRITICAL 🔴

Plik `.env` zawiera **prawdziwe hasła email, klucze szyfrowania i credentiale**:

```
SMTP_PASS=jN%450ve*E0^aU7!Pk%9          # Prawdziwe hasło Onet
SMTP_PASS=ZnJaTbDJbJA2hFQyHPG!          # Prawdziwe hasło Interia
ENCRYPTION_KEY=ec99b04bdbe713db...        # Klucz szyfrowania
ENCRYPTION_SECRET=b71fe976782b57b3...     # Secret szyfrowania
SENTRY_DSN=https://208be0e4f03b...       # DSN Sentry
```

Plik `.env` jest w `.gitignore`, ale jest wersjonowany na dysku z prawdziwymi danymi. **Jeśli kiedykolwiek został commitowany — wymaga natychmiastowej rotacji wszystkich sekretów.**

**Rekomendacja:**

- Rotuj WSZYSTKIE sekrety (SMTP, encryption keys, JWT secrets)
- Użyj `git log --all -- .env` do sprawdzenia historii
- Rozważ użycie secret manager (Vault, AWS Secrets Manager)

### 2. Słaby JWT_SECRET — Severity: CRITICAL 🔴

```
JWT_SECRET=jshdlfhalsdhflhjaslkdhfjklasjdlf
```

Walidator w `env.validator.ts` wykrywa ten secret jako słaby, ale **tylko loguje warning w dev** zamiast blokować start. W połączeniu z `JWT_EXPIRES_IN=1h` (za długo), stwarza poważne ryzyko.

**Rekomendacja:** Zmień na kryptograficznie bezpieczny secret: `openssl rand -base64 64`

### 3. Otwarty endpoint rejestracji z przypisywaniem ról — Severity: HIGH 🔴

```typescript
// libs/auth/src/lib/dto/register.dto.ts
@IsEnum(UserRole)
role!: UserRole;
```

Publiczny endpoint `/auth/register` pozwala wybrać rolę `COMPANY_OWNER` lub `EMPLOYEE`. Jedyny blok to `ADMIN`. **Atakujący może zarejestrować się jako `COMPANY_OWNER`**, potencjalnie uzyskując dostęp do modułów.

**Rekomendacja:**

- Ogranicz self-registration do jednej domyślnej roli
- `COMPANY_OWNER` powinien być tworzony wyłącznie przez ADMIN

---

## ⚠️ WYSOKIE (powinny być naprawione wkrótce)

### 4. Brak walidacji UUID w parametrach URL

Kontrolery przyjmują `@Param('id') id: string` bez walidacji UUID:

```typescript
// apps/api/src/admin/controllers/admin.controller.ts
@Get('users/:id')
findUserById(@Param('id') id: string) { ... }
```

Brak `@IsUUID()` lub `ParseUUIDPipe` pozwala na injection niestandardowych stringów do zapytań DB.

**Rekomendacja:** Dodaj globalnie `ParseUUIDPipe` lub `@Param('id', ParseUUIDPipe)`

### 5. Refresh token nie waliduje `tokenVersion`

```typescript
// libs/auth/src/lib/services/auth.service.ts
async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
  const payload = this.refreshJwtService.verify(refreshToken);
  const user = await this.userRepository.findOne({ where: { id: payload.sub } });
  // ❌ Brak sprawdzenia payload.tokenVersion vs user.tokenVersion!
  return this.generateTokens(user);
}
```

Po `logout` (który inkrementuje `tokenVersion`), stary refresh token **nadal działa**, bo nie sprawdza wersji.

**Rekomendacja:** Dodaj walidację:

```typescript
if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
  throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
}
```

### 6. N+1 problem w `isDescendant`

```typescript
// libs/modules/tasks/src/lib/services/tasks.service.ts
private async isDescendant(potentialDescendantId, ancestorId, depth = 20) {
  const subtasks = await this.taskRepository.find({ where: { parentTaskId: ancestorId } });
  for (const subtask of subtasks) {
    if (await this.isDescendant(potentialDescendantId, subtask.id, depth - 1)) { ... }
  }
}
```

Rekurencyjne zapytania DB — przy 20 poziomach zagnieżdżenia może to wygenerować setki zapytań.

**Rekomendacja:** Użyj CTE (`WITH RECURSIVE`) w jednym zapytaniu SQL.

### 7. Brak limitu na `reorderTasks` — sequential UPDATE

```typescript
// libs/modules/tasks/src/lib/services/tasks.service.ts
for (let i = 0; i < dto.taskIds.length; i++) {
  await this.taskRepository.update({ id: dto.taskIds[i], companyId }, { sortOrder: i });
}
```

Bez limitu i bez transakcji — 100+ zadań = 100+ UPDATE queries. Podatne na race conditions.

**Rekomendacja:**

- Dodaj limit na `dto.taskIds.length` (np. max 200)
- Owiń w transakcję
- Rozważ batch UPDATE za pomocą `CASE WHEN`

---

## ⚡ ŚREDNIE (quality & maintainability)

### 8. Ogromna duplikacja routingu — ~1540 linii

**Plik:** `apps/web/src/app/routes.tsx`

Duplikuje **te same route'y 3 razy** (admin, company, employee) z drobnymi zmianami layoutu. To **ponad 1500 linii** prawie identycznego JSX.

**Rekomendacja:** Wydziel konfigurację route'ów do tablicy i generuj dynamicznie:

```typescript
const moduleRoutes = [
  { path: 'clients', component: ClientsDashboardPage },
  { path: 'clients/list', component: ClientsListPage },
  // ...
];

function renderModuleRoutes(routes: typeof moduleRoutes) {
  return routes.map(({ path, component: Component }) => (
    <Route key={path} path={path} element={<LazyRoute><Component /></LazyRoute>} />
  ));
}
```

### 9. Duże pliki komponentów (>500 linii)

| Plik                                                                  | Linie |
| --------------------------------------------------------------------- | ----- |
| `apps/web/src/app/routes.tsx`                                         | 1540  |
| `apps/web/src/components/forms/client-form-dialog.tsx`                | 1118  |
| `apps/web/src/pages/modules/clients/clients-list.tsx`                 | 1094  |
| `apps/web/src/pages/modules/ai-agent/admin-configuration.tsx`         | 862   |
| `libs/modules/time-tracking/src/lib/services/time-entries.service.ts` | 1084  |
| `libs/modules/tasks/src/lib/services/tasks.service.ts`                | 817   |
| `libs/modules/clients/src/lib/services/clients.service.ts`            | 770   |

Narusza zasadę z `AGENTS.md` — "Modular Design: Files under 500 lines".

**Rekomendacja:** Rozbij duże serwisy na mniejsze (np. `TaskQueryService`, `TaskMutationService`, `TaskValidationService`).

### 10. Brakujący case-insensitive email w admin service

```typescript
// apps/api/src/admin/services/admin.service.ts
const existingUser = await this.userRepository.findOne({
  where: { email: createUserDto.email }, // ❌ case-sensitive!
});
```

Podczas gdy `auth.service.ts` poprawnie używa `LOWER(user.email) = LOWER(:email)`, admin service nie — można stworzyć duplikaty `User@Test.com` vs `user@test.com`.

**Rekomendacja:** Użyj `createQueryBuilder` z `LOWER()` lub znormalizuj email w DTO (`@Transform`).

### 11. `Object.assign` na entity bez filtrowania pól

```typescript
// apps/api/src/admin/services/admin.service.ts
Object.assign(user, updateUserDto);
return this.userRepository.save(user);
```

```typescript
// apps/api/src/admin/services/admin.service.ts
Object.assign(company, updateCompanyDto);
return this.companyRepository.save(company);
```

Jeśli DTO zawiera niespodziewane pola (np. `id`, `createdAt`), mogą nadpisać wartości entity. `ValidationPipe` z `whitelist: true` pomaga, ale to nie pełna ochrona.

**Rekomendacja:** Mapuj ręcznie tylko dozwolone pola lub użyj `pick`/`omit` utility.

### 12. Inconsistent error messages (PL/EN mix)

Projekt miesza komunikaty po polsku i angielsku:

```typescript
// EN
throw new BadRequestException('companyId is required for EMPLOYEE role');
throw new NotFoundException('Owner user not found');

// PL
throw new BadRequestException('Rejestracja z rolą ADMIN nie jest dozwolona');
throw new ForbiddenException('Nie masz uprawnień do wykonania tej operacji');
throw new BadRequestException('Powód blokady jest wymagany przy zmianie statusu na Zablokowane');
```

**Rekomendacja:** Zdecyduj się na jeden język i zrefaktoruj do stałych w `ErrorMessages`.

### 13. Brak indeksu na case-insensitive email

Migracja `AddCaseInsensitiveEmailIndex` istnieje, ale `User` entity ma:

```typescript
@Column({ type: 'varchar', unique: true })
email!: string;
```

Standard unique constraint — nie `LOWER()` unique. Zapytania z `LOWER()` nie będą korzystać z tego indeksu optymalnie.

**Rekomendacja:** Dodaj unique index na `LOWER(email)` i usuń standard unique constraint z kolumny.

---

## ✅ CO JEST DOBRZE ZROBIONE

### Architektura

- ✅ **Czysta separacja modułów** — `libs/modules/*` z barrel exports
- ✅ **Multi-tenant isolation** — konsekwentny `companyId` filter przez `SystemCompanyService`
- ✅ **Entity registry** — single source of truth (`COMMON_ENTITIES`)
- ✅ **RBAC z cache** — `RBACService` z 5-minutowym in-memory cache na moduły
- ✅ **Guard chain** — `JwtAuthGuard → ModuleAccessGuard → PermissionGuard` z `_rbacResult` cache
- ✅ **Audit trail** — `ChangeLogService` z sanitizacją danych
- ✅ **Transakcje w operacjach bulk** — atomiczność w `bulkDelete`, `bulkRestore`, `bulkEdit`
- ✅ **Pessimistic locking** — przy tworzeniu company (zapobiega race conditions)
- ✅ **Status transition validation** — `VALID_STATUS_TRANSITIONS` w tasks
- ✅ **SystemCompanyService z cache** — eliminuje powtarzające się zapytania DB

### Bezpieczeństwo

- ✅ **Timing attack prevention** — bcrypt z dummy hash w `validateUser()`
- ✅ **AES-256-GCM** encryption z random salt/IV per operacja
- ✅ **httpOnly cookies** dla tokenów + dual-mode (header + cookie)
- ✅ **Token revocation** via `tokenVersion` (w JwtStrategy)
- ✅ **Helmet** + **CORS** z whitelist + **throttling** per endpoint
- ✅ **ValidationPipe** z `whitelist: true` + `forbidNonWhitelisted: true`
- ✅ **Sensitive data redaction** w `AllExceptionsFilter` (SENSITIVE_KEYS set)
- ✅ **SQL injection prevention** — parameterized queries + `escapeLikePattern()`
- ✅ **Password policy** — min 12 znaków, uppercase, lowercase, digit, special char
- ✅ **Swagger UI disabled in production**
- ✅ **Environment validator** na starcie aplikacji

### Frontend

- ✅ **Split auth context** (AuthContext + AuthLoadingContext) — minimalizacja re-renderów
- ✅ **Token refresh manager** — deduplication concurrent 401s via shared promise
- ✅ **Lazy loading** — wszystkie pages jako lazy imports
- ✅ **React 19** z `use()` hook
- ✅ **Zod validation** na froncie (773 linii schematów)
- ✅ **React Compiler** (babel plugin enabled)
- ✅ **Event-based token monitoring** zamiast polling

### DevOps & DX

- ✅ **Migracje** zamiast `synchronize: true`
- ✅ **Sentry integration** (backend + frontend)
- ✅ **lint-staged + husky** pre-commit hooks
- ✅ **ESLint** z NestJS-typed, security, React Query plugins
- ✅ **Prettier** z import sorting
- ✅ **Railway deployment** ready (Dockerfile, vercel.json, runtime config)

---

## 📊 Podsumowanie priorytetów

| Priorytet       | Ilość | Issues                                                                                                   |
| --------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| 🔴 **CRITICAL** | 3     | #1 Wyciek sekretów, #2 Słaby JWT, #3 Otwarta rejestracja z rolami                                        |
| 🟠 **HIGH**     | 4     | #4 UUID validation, #5 Refresh token bypass, #6 N+1 queries, #7 Reorder bez limitu                       |
| 🟡 **MEDIUM**   | 6     | #8 Duplikacja routingu, #9 Duże pliki, #10 Email case, #11 Object.assign, #12 PL/EN mix, #13 Email index |
| 🟢 **GOOD**     | 15+   | Architektura, RBAC, encryption, guards, lazy loading, audit trail                                        |

---

## 🎯 Rekomendowane action items

### Natychmiast (tydzień 1)

1. Rotacja wszystkich sekretów z `.env`
2. Wygeneruj kryptograficznie bezpieczny `JWT_SECRET`
3. Ogranicz self-registration (usuń wybór roli lub ogranicz do `EMPLOYEE`)
4. Dodaj `tokenVersion` check w `refreshToken()`

### Krótkoterminowo (tydzień 2-3)

5. Dodaj `ParseUUIDPipe` globalnie lub per-controller
6. Zamień `isDescendant` na `WITH RECURSIVE` CTE
7. Dodaj transakcję i limit w `reorderTasks`
8. Ujednolić case-insensitive email w admin service

### Średnioterminowo (miesiąc 1-2)

9. Refaktor `routes.tsx` — dynamiczne generowanie z konfiguracji
10. Rozbij pliki >500 linii na mniejsze moduły
11. Ujednolić język komunikatów błędów
12. Dodaj `LOWER()` unique index na email

---

## Ogólna ocena

**7/10** — Solidna architektura i dobre wzorce bezpieczeństwa (timing-safe bcrypt, AES-256-GCM, RBAC z cache, token revocation). Krytyczne luki w zarządzaniu sekretami i kilka istotnych bugów w auth flow wymagają natychmiastowej uwagi.
