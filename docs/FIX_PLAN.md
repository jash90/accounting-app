# 🛠️ Plan Naprawy — Accounting SaaS Platform

**Źródło:** [CODE_REVIEW.md](./CODE_REVIEW.md)
**Data utworzenia:** 2026-04-03
**Status:** Do realizacji

---

## Spis treści

- [Sprint 1 — CRITICAL (tydzień 1)](#sprint-1--critical-tydzień-1)
- [Sprint 2 — HIGH (tydzień 2-3)](#sprint-2--high-tydzień-2-3)
- [Sprint 3 — MEDIUM (tydzień 4-6)](#sprint-3--medium-tydzień-4-6)
- [Checklist końcowy](#-checklist-końcowy)

---

## Sprint 1 — CRITICAL (tydzień 1)

### FIX-01: Rotacja sekretów i zabezpieczenie `.env`

**Issue:** #1 z Code Review — prawdziwe hasła email, klucze szyfrowania w `.env`
**Priorytet:** 🔴 CRITICAL
**Estymacja:** 2h

#### Kroki

1. **Sprawdź historię git:**

   ```bash
   git log --all --diff-filter=A -- .env
   git log --all -- .env
   ```

2. **Wygeneruj nowe sekrety:**

   ```bash
   # JWT secrets
   openssl rand -base64 64   # → JWT_SECRET
   openssl rand -base64 64   # → JWT_REFRESH_SECRET

   # Encryption keys
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # → ENCRYPTION_KEY
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # → ENCRYPTION_SECRET
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  # → AI_API_KEY_ENCRYPTION_KEY (min 32 chars)
   ```

3. **Zmień hasła email:**
   - Zmień hasło konta Onet (onet.pl → ustawienia → hasło)
   - Zmień hasło konta Interia (interia.pl → ustawienia → hasło)
   - Wygeneruj nowe hasła aplikacji jeśli to konta z app passwords

4. **Wyczyść `.env` z prawdziwych danych:**

   ```env
   # .env — NIGDY nie wpisuj prawdziwych haseł!
   # Skopiuj z .env.example i uzupełnij wartości lokalnie

   JWT_SECRET=<wygeneruj: openssl rand -base64 64>
   JWT_REFRESH_SECRET=<wygeneruj: openssl rand -base64 64>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   ENCRYPTION_KEY=<wygeneruj: node -e "...">
   ENCRYPTION_SECRET=<wygeneruj: node -e "...">

   # SMTP — użyj app passwords, nie haseł kont
   # SMTP_PASS=<app-password-z-panelu-dostawcy>
   ```

5. **Dodaj zabezpieczenie w `.gitignore` (już jest, ale potwierdź):**

   ```gitignore
   .env
   .env.local
   .env*.local
   .encryption-key.dev
   ```

6. **Railway — zaktualizuj sekrety w panelu:**
   - Railway Dashboard → Variables → zaktualizuj wszystkie powyższe

7. **Rozważ Sentry DSN:**
   - DSN sam w sobie nie jest secret-level, ale zmiana jest wskazana jeśli był wycieku historii

#### Testy weryfikujące

- [ ] Aplikacja startuje z nowymi sekretami
- [ ] Login/register działają z nowym JWT_SECRET
- [ ] Istniejące zaszyfrowane dane w DB (email config) — **UWAGA**: po zmianie ENCRYPTION_KEY/SECRET istniejące zaszyfrowane hasła SMTP w DB nie będą do odszyfrowania. Potrzebna re-enrypcja lub reset konfiguracji email.

---

### FIX-02: Skrócenie JWT_EXPIRES_IN + wzmocnienie env.validator

**Issue:** #2 z Code Review — słaby JWT, za długi expiration
**Priorytet:** 🔴 CRITICAL
**Estymacja:** 30min

#### Zmiana 1 — `.env`

```env
# PRZED
JWT_EXPIRES_IN=1h

# PO
JWT_EXPIRES_IN=15m
```

#### Zmiana 2 — `apps/api/src/common/validators/env.validator.ts`

Zablokuj start nawet w dev jeśli secret jest skrajnie słaby:

```typescript
// DODAJ na końcu sekcji JWT_SECRET validation:
if (jwtSecret && jwtSecret.length < 16) {
  throw new Error(
    'JWT_SECRET is dangerously short (< 16 chars). Application refused to start. ' +
      'Generate with: openssl rand -base64 64'
  );
}
```

#### Testy weryfikujące

- [ ] Token wygasa po 15 minutach
- [ ] Refresh token przedłuża sesję
- [ ] Aplikacja nie startuje z JWT_SECRET krótszym niż 16 znaków

---

### FIX-03: Ograniczenie self-registration ról

**Issue:** #3 z Code Review — publiczny endpoint pozwala wybrać dowolną rolę (poza ADMIN)
**Priorytet:** 🔴 CRITICAL
**Estymacja:** 1h

#### Opcja A: Usunięcie wyboru roli (rekomendowana)

**Plik:** `libs/auth/src/lib/dto/register.dto.ts`

```typescript
// PRZED
@ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
@IsEnum(UserRole)
role!: UserRole;

// PO — usuń pole role z DTO
// Role jest teraz hardcoded jako COMPANY_OWNER w service
```

**Plik:** `libs/auth/src/lib/services/auth.service.ts`

```typescript
// PRZED (w register())
const user = this.userRepository.create({
  ...
  role: registerDto.role,
  companyId: registerDto.companyId || null,
  ...
});

// PO — self-registration tworzy TYLKO COMPANY_OWNER
// EMPLOYEE jest tworzony przez COMPANY_OWNER via /company/employees
async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
  // Self-registration always creates COMPANY_OWNER
  // EMPLOYEE accounts are created by company owners via CompanyService
  // ADMIN accounts are created by system administrators via AdminService

  const existingUser = await this.userRepository
    .createQueryBuilder('user')
    .where('LOWER(user.email) = LOWER(:email)', { email: registerDto.email })
    .getOne();

  if (existingUser) {
    throw new ConflictException(ErrorMessages.AUTH.EMAIL_EXISTS);
  }

  const hashedPassword = await bcrypt.hash(registerDto.password, 10);

  const user = this.userRepository.create({
    email: registerDto.email,
    password: hashedPassword,
    firstName: registerDto.firstName,
    lastName: registerDto.lastName,
    role: UserRole.COMPANY_OWNER,  // ← HARDCODED
    companyId: null,                // ← Company tworzona w osobnym kroku
    isActive: true,
  });

  const savedUser = await this.userRepository.save(user);
  return this.generateTokens(savedUser);
}
```

**Plik:** `libs/auth/src/lib/dto/register.dto.ts` — zaktualizowany DTO:

```typescript
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString({ message: 'Hasło musi być tekstem' })
  @MinLength(12, { message: 'Hasło musi mieć minimum 12 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Hasło musi zawierać wielką, małą literę, cyfrę i znak specjalny',
  })
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;

  // USUNIĘTE: role, companyId — self-registration jest tylko dla COMPANY_OWNER
}
```

#### Zmiany na froncie

**Plik:** `apps/web/src/lib/validation/schemas.ts` — usuń `role` i `companyId` ze schematu rejestracji.

**Plik:** `apps/web/src/types/dtos.ts` — zaktualizuj typ `RegisterDto`.

#### Testy weryfikujące

- [ ] `POST /auth/register` ignoruje/odrzuca pole `role` w body
- [ ] Zarejestrowany użytkownik ma zawsze rolę `COMPANY_OWNER`
- [ ] `EMPLOYEE` może być utworzony tylko przez `/company/employees` (wymaga JWT)
- [ ] Frontend rejestracja działa bez pola role

---

### FIX-04: Token version check w refresh token

**Issue:** #5 z Code Review — po logout stary refresh token nadal działa
**Priorytet:** 🔴 CRITICAL
**Estymacja:** 30min

**Plik:** `libs/auth/src/lib/services/auth.service.ts`

```typescript
// PRZED
async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
  try {
    const payload = this.refreshJwtService.verify(refreshToken);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    return this.generateTokens(user);
  } catch {
    throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
  }
}

// PO — dodaj walidację tokenVersion
async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
  try {
    const payload = this.refreshJwtService.verify(refreshToken);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Reject tokens issued before logout/password change
    if (
      payload.tokenVersion !== undefined &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    return this.generateTokens(user);
  } catch (error) {
    // Re-throw UnauthorizedException as-is, wrap others
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
  }
}
```

#### Testy weryfikujące

- [ ] Po `POST /auth/logout` stary refresh token zwraca 401
- [ ] Po `PATCH /auth/change-password` stary refresh token zwraca 401
- [ ] Nowy refresh token (po ponownym logowaniu) działa poprawnie

---

## Sprint 2 — HIGH (tydzień 2-3)

### FIX-05: Globalna walidacja UUID w parametrach

**Issue:** #4 z Code Review — 20 endpointów bez ParseUUIDPipe
**Priorytet:** 🟠 HIGH
**Estymacja:** 1.5h

#### Dotknięte pliki (endpointy bez ParseUUIDPipe)

| Plik                                                                       | Ilość `@Param('id')` bez pipe |
| -------------------------------------------------------------------------- | ----------------------------- |
| `apps/api/src/admin/controllers/admin.controller.ts`                       | 10                            |
| `apps/api/src/modules/modules.controller.ts`                               | 2                             |
| `apps/api/src/company/controllers/company.controller.ts`                   | 3                             |
| `libs/modules/email-client/src/lib/controllers/email-drafts.controller.ts` | 5                             |

#### Podejście: Globalny pipe w `main.ts` (nie wymaga zmian w kontrolerach)

**UWAGA:** Niektóre endpointy używają UUID w `@Param`, a inne nie (np. `:uid` w email, `:folderName`). Dlatego **nie** można dodać globalnego ParseUUIDPipe. Zamiast tego — per-controller.

**Plik:** `apps/api/src/admin/controllers/admin.controller.ts`

Zmień każdy `@Param('id') id: string` na `@Param('id', ParseUUIDPipe) id: string`:

```typescript
import { ParseUUIDPipe } from '@nestjs/common';

// Przykład jednej z 10 metod:
@Get('users/:id')
findUserById(@Param('id', ParseUUIDPipe) id: string) {
  return this.adminService.findUserById(id);
}
```

Powtórz dla:

- `apps/api/src/admin/controllers/admin.controller.ts` — 10 zmian
- `apps/api/src/modules/modules.controller.ts` — 2 zmiany
- `apps/api/src/company/controllers/company.controller.ts` — 3 zmiany
- `libs/modules/email-client/src/lib/controllers/email-drafts.controller.ts` — 5 zmian

#### Testy weryfikujące

- [ ] `GET /api/admin/users/not-a-uuid` → 400 Bad Request
- [ ] `GET /api/admin/users/123e4567-e89b-12d3-a456-426614174000` → 200/404 (normalna odpowiedź)
- [ ] Endpointy z `:uid` (email) i `:folderName` nadal działają

---

### FIX-06: Zamiana rekurencyjnego `isDescendant` na CTE

**Issue:** #6 z Code Review — N+1 problem, potencjalnie setki zapytań DB
**Priorytet:** 🟠 HIGH
**Estymacja:** 1.5h

**Plik:** `libs/modules/tasks/src/lib/services/tasks.service.ts`

```typescript
// PRZED — rekurencyjne zapytania (N+1)
private async isDescendant(
  potentialDescendantId: string,
  ancestorId: string,
  depth = 20
): Promise<boolean> {
  if (depth <= 0) return false;
  const subtasks = await this.taskRepository.find({
    where: { parentTaskId: ancestorId },
    select: ['id'],
  });
  for (const subtask of subtasks) {
    if (subtask.id === potentialDescendantId) return true;
    if (await this.isDescendant(potentialDescendantId, subtask.id, depth - 1)) return true;
  }
  return false;
}

// PO — jedno zapytanie z WITH RECURSIVE
private async isDescendant(
  potentialDescendantId: string,
  ancestorId: string,
): Promise<boolean> {
  const result = await this.taskRepository.query(
    `
    WITH RECURSIVE descendants AS (
      SELECT id FROM task WHERE "parentTaskId" = $1
      UNION ALL
      SELECT t.id FROM task t
        INNER JOIN descendants d ON t."parentTaskId" = d.id
    )
    SELECT EXISTS(
      SELECT 1 FROM descendants WHERE id = $2
    ) AS "isDescendant"
    `,
    [ancestorId, potentialDescendantId]
  );

  return result[0]?.isDescendant === true;
}
```

#### Testy weryfikujące

- [ ] Przeniesienie zadania do dziecka własnego potomka → błąd
- [ ] Przeniesienie zadania do legalnego parenta → sukces
- [ ] Performance: jedno zapytanie zamiast wielu (sprawdź w logach SQL)

---

### FIX-07: Transakcja i limit w `reorderTasks`

**Issue:** #7 z Code Review — brak limitu, brak transakcji, sequential UPDATEs
**Priorytet:** 🟠 HIGH
**Estymacja:** 1h

**Plik:** `libs/modules/tasks/src/lib/dto/task.dto.ts`

```typescript
// DODAJ walidację max length:
export class ReorderTasksDto {
  @ApiProperty({ description: 'Array of task IDs in new order (max 200)', type: [String] })
  @IsArray()
  @ArrayMaxSize(200, { message: 'Maksymalnie 200 zadań w jednym reorderze' })
  @IsUUID('4', { each: true })
  taskIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TaskStatus)
  newStatus?: TaskStatus;
}
```

**Plik:** `libs/modules/tasks/src/lib/services/tasks.service.ts`

```typescript
// PRZED — sequential updates bez transakcji
async reorderTasks(dto: ReorderTasksDto, user: User): Promise<void> {
  const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
  const tasks = await this.taskRepository.find({ ... });
  // ...
  for (let i = 0; i < dto.taskIds.length; i++) {
    await this.taskRepository.update(
      { id: dto.taskIds[i], companyId },
      { sortOrder: i, ...(dto.newStatus ? { status: dto.newStatus } : {}) }
    );
  }
}

// PO — batch update w transakcji
async reorderTasks(dto: ReorderTasksDto, user: User): Promise<void> {
  const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

  await this.dataSource.transaction(async (manager) => {
    const taskRepo = manager.getRepository(Task);

    // Walidacja: sprawdź czy wszystkie taski należą do firmy
    const tasks = await taskRepo.find({
      where: { id: In(dto.taskIds), companyId },
    });

    if (tasks.length !== dto.taskIds.length) {
      this.logger.warn('Some tasks not found during reorder', {
        requested: dto.taskIds.length,
        found: tasks.length,
      });
    }

    // Walidacja status transitions
    if (dto.newStatus) {
      for (const task of tasks) {
        if (task.status !== dto.newStatus) {
          this.validateStatusTransition(task.status, dto.newStatus);
        }
      }
    }

    // Batch UPDATE za pomocą CASE WHEN (1 zapytanie zamiast N)
    if (dto.taskIds.length > 0) {
      const caseClauses = dto.taskIds
        .map((id, i) => `WHEN id = '${id}' THEN ${i}`)
        .join(' ');

      let query = `
        UPDATE task
        SET "sortOrder" = CASE ${caseClauses} END
      `;

      if (dto.newStatus) {
        query += `, status = '${dto.newStatus}'`;
      }

      query += `
        WHERE id IN (${dto.taskIds.map(id => `'${id}'`).join(',')})
          AND "companyId" = $1
      `;

      await manager.query(query, [companyId]);
    }
  });
}
```

**UWAGA:** Powyższy raw SQL z interpolacją jest bezpieczny bo `taskIds` przeszły przez `@IsUUID('4', { each: true })` walidację, a `newStatus` przez `@IsEnum(TaskStatus)`. Jednak dla dodatkowego bezpieczeństwa można użyć parameterized CASE.

#### Testy weryfikujące

- [ ] Reorder 200 zadań — sukces, 1-2 zapytania DB
- [ ] Reorder 201 zadań — 400 Bad Request
- [ ] Reorder z nieistniejącym ID — ostrzeżenie w logach, reszta zaktualizowana
- [ ] Reorder ze zmianą statusu — walidacja przejść

---

### FIX-08: Case-insensitive email w admin i company service

**Issue:** #10 z Code Review — duplikaty email możliwe przez case sensitivity
**Priorytet:** 🟠 HIGH
**Estymacja:** 1h

#### Dotknięte pliki i lokalizacje

| Plik                                               | Linia              | Problem                         |
| -------------------------------------------------- | ------------------ | ------------------------------- |
| `apps/api/src/admin/services/admin.service.ts`     | `createUser()`     | `findOne({ where: { email } })` |
| `apps/api/src/admin/services/admin.service.ts`     | `updateUser()`     | `findOne({ where: { email } })` |
| `apps/api/src/company/services/company.service.ts` | `createEmployee()` | `findOne({ where: { email } })` |
| `apps/api/src/company/services/company.service.ts` | `updateEmployee()` | `findOne({ where: { email } })` |

#### Rozwiązanie: Helper method + normalizacja w DTO

**Plik:** `libs/common/src/lib/utils/query.utils.ts` — dodaj helper:

```typescript
/**
 * Find user by email (case-insensitive).
 * Matches the pattern used in AuthService for consistency.
 */
export async function findUserByEmailCI(
  userRepository: Repository<User>,
  email: string
): Promise<User | null> {
  return userRepository
    .createQueryBuilder('user')
    .where('LOWER(user.email) = LOWER(:email)', { email })
    .getOne();
}
```

**Plik:** `apps/api/src/admin/services/admin.service.ts`

```typescript
// PRZED
const existingUser = await this.userRepository.findOne({
  where: { email: createUserDto.email },
});

// PO
const existingUser = await this.userRepository
  .createQueryBuilder('user')
  .where('LOWER(user.email) = LOWER(:email)', { email: createUserDto.email })
  .getOne();
```

Zastosuj ten sam wzorzec we wszystkich 4 lokalizacjach.

**Plik:** `apps/api/src/admin/dto/create-user.dto.ts` — dodaj normalizację:

```typescript
@IsEmail()
@Transform(({ value }) => value?.toLowerCase().trim())
email!: string;
```

Zastosuj `@Transform` we wszystkich DTO z polem email:

- `apps/api/src/admin/dto/create-user.dto.ts`
- `apps/api/src/admin/dto/update-user.dto.ts`
- `apps/api/src/company/dto/create-employee.dto.ts`
- `apps/api/src/company/dto/update-employee.dto.ts`

#### Testy weryfikujące

- [ ] Rejestracja `User@Test.com` → login `user@test.com` działa
- [ ] Tworzenie dwóch userów z emailami różniącymi się tylko case → ConflictException

---

## Sprint 3 — MEDIUM (tydzień 4-6)

### FIX-09: Bezpieczny Object.assign — allowlist pól

**Issue:** #11 z Code Review — 26 wystąpień `Object.assign` na entity
**Priorytet:** 🟡 MEDIUM
**Estymacja:** 3h

#### Podejście: Utility function `applyUpdate`

**Plik:** `libs/common/src/lib/utils/entity.utils.ts` (nowy plik)

```typescript
/**
 * Safely applies DTO fields to an entity, ignoring protected fields.
 * Prevents accidental overwrite of id, timestamps, and computed fields.
 */
const PROTECTED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'companyId', // Tenant isolation — never change via DTO
  'createdById',
]);

export function applyUpdate<T extends object>(
  entity: T,
  dto: Partial<T>,
  additionalProtected: string[] = []
): T {
  const allProtected = new Set([...PROTECTED_FIELDS, ...additionalProtected]);

  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined && !allProtected.has(key)) {
      (entity as Record<string, unknown>)[key] = value;
    }
  }

  return entity;
}
```

#### Zastosowanie (przykład najważniejszych lokalizacji)

```typescript
// PRZED
Object.assign(user, updateUserDto);

// PO
applyUpdate(user, updateUserDto, ['password', 'role']); // password hashowany osobno
```

#### Priorytetowe pliki do zmiany

1. `apps/api/src/admin/services/admin.service.ts` — 3 wystąpienia
2. `apps/api/src/company/services/company.service.ts` — 2 wystąpienia
3. `apps/api/src/modules/modules.service.ts` — 1 wystąpienie
4. `apps/api/src/email-config/services/email-config.service.ts` — 3 wystąpienia

Reszta (w modules) jest niższego ryzyka bo chroniona przez guards + ValidationPipe.

#### Testy weryfikujące

- [ ] Update user z `{ id: "hacked", createdAt: "2000-01-01" }` → pola zignorowane
- [ ] Update user z `{ firstName: "New" }` → pole zaktualizowane

---

### FIX-10: Refaktor routes.tsx — eliminacja duplikacji

**Issue:** #8 z Code Review — 1540 linii z 3x duplikacją
**Priorytet:** 🟡 MEDIUM
**Estymacja:** 4h

#### Podejście: Route config + dynamic renderer

**Plik:** `apps/web/src/app/routes/module-routes.config.ts` (nowy)

```typescript
import { type ComponentType, type LazyExoticComponent } from 'react';

import {
  ClientCreatePage,
  ClientDetailPage,
  ClientsDashboardPage,
  ClientsListPage,
  ClientsSettingsPage,
  TasksDashboardPage,
  TasksKanbanPage,
  TasksListPage,
  // ... reszta importów
} from './lazy-imports';

export interface ModuleRouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType>;
  /** Roles that can see this route. Empty = all roles with layout access */
  restrictTo?: ('admin' | 'owner')[];
}

export const sharedModuleRoutes: ModuleRouteConfig[] = [
  // Clients
  { path: 'modules/clients', component: ClientsDashboardPage },
  { path: 'modules/clients/list', component: ClientsListPage },
  {
    path: 'modules/clients/settings',
    component: ClientsSettingsPage,
    restrictTo: ['admin', 'owner'],
  },
  { path: 'modules/clients/create', component: ClientCreatePage },
  { path: 'modules/clients/:id', component: ClientDetailPage },

  // Tasks
  { path: 'modules/tasks', component: TasksDashboardPage },
  { path: 'modules/tasks/list', component: TasksListPage },
  { path: 'modules/tasks/kanban', component: TasksKanbanPage },
  // ... pozostałe module routes
];
```

**Plik:** `apps/web/src/app/routes/render-module-routes.tsx` (nowy)

```tsx
import { Route } from 'react-router-dom';

import { type ModuleRouteConfig } from './module-routes.config';
import { LazyRoute } from './route-utils';

export function renderModuleRoutes(
  routes: ModuleRouteConfig[],
  layoutRole: 'admin' | 'owner' | 'employee'
) {
  return routes
    .filter((route) => {
      if (!route.restrictTo) return true;
      return route.restrictTo.includes(layoutRole);
    })
    .map(({ path, component: Component }) => (
      <Route
        key={path}
        path={path}
        element={
          <LazyRoute>
            <Component />
          </LazyRoute>
        }
      />
    ));
}
```

**Plik:** `apps/web/src/app/routes.tsx` — zrefaktorowany

```tsx
function adminRouteGroup() {
  return (
    <Route
      path="/admin/*"
      element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route
        index
        element={
          <LazyRoute>
            <AdminDashboard />
          </LazyRoute>
        }
      />
      {/* Admin-only routes */}
      <Route
        path="users"
        element={
          <LazyRoute>
            <UsersListPage />
          </LazyRoute>
        }
      />
      <Route
        path="companies"
        element={
          <LazyRoute>
            <CompaniesListPage />
          </LazyRoute>
        }
      />
      {/* Shared module routes */}
      {renderModuleRoutes(sharedModuleRoutes, 'admin')}
    </Route>
  );
}
```

**Oczekiwana redukcja:** ~1540 linii → ~400 linii (~74% mniej)

#### Testy weryfikujące

- [ ] Wszystkie istniejące route'y nadal dostępne
- [ ] Role-restricted routes nie renderują się dla nieuprawnionych
- [ ] E2E testy przechodzą bez zmian

---

### FIX-11: Ujednolicenie języka komunikatów błędów

**Issue:** #12 z Code Review — PL/EN mix w error messages
**Priorytet:** 🟡 MEDIUM
**Estymacja:** 2h

#### Decyzja: POLSKI jako język docelowy

Plik `libs/common/src/lib/constants/error-messages.ts` jest już po polsku — to źródło prawdy.

#### Dotknięte pliki z angielskimi komunikatami

```typescript
// apps/api/src/admin/services/admin.service.ts — 10 komunikatów EN
'User with ID ${id} not found'          → ErrorMessages.NOT_FOUND.entity('Użytkownik', id)
'User with this email already exists'   → ErrorMessages.AUTH.EMAIL_EXISTS
'companyId is required for EMPLOYEE'    → 'companyId jest wymagane dla roli EMPLOYEE'
'companyName is required for ...'       → 'companyName jest wymagane dla roli COMPANY_OWNER'
'Company not found'                     → ErrorMessages.NOT_FOUND.entity('Firma')
'Owner user not found'                  → ErrorMessages.NOT_FOUND.entity('Właściciel')
'Owner must have COMPANY_OWNER role'    → 'Właściciel musi mieć rolę COMPANY_OWNER'
'This owner is already assigned...'     → 'Ten właściciel jest już przypisany do innej firmy'
'Cannot delete System Admin company'    → 'Nie można usunąć firmy System Admin'

// apps/api/src/company/services/company.service.ts — 3 komunikaty EN
'Employee not found'                    → ErrorMessages.NOT_FOUND.entity('Pracownik')
'User with this email already exists'   → ErrorMessages.AUTH.EMAIL_EXISTS
'Company not found'                     → ErrorMessages.NOT_FOUND.entity('Firma')

// apps/api/src/email-config/services/*.ts — komunikaty EN
'Email configuration not found'         → ErrorMessages.NOT_FOUND.CONFIGURATION
```

#### Dodaj brakujące stałe do `ErrorMessages`

```typescript
// Dodaj do sekcji ADMIN w error-messages.ts:
ADMIN: {
  COMPANY_ID_REQUIRED_EMPLOYEE: 'companyId jest wymagane dla roli EMPLOYEE',
  COMPANY_NAME_REQUIRED_OWNER: 'companyName jest wymagane dla roli COMPANY_OWNER',
  OWNER_ROLE_REQUIRED: 'Właściciel musi mieć rolę COMPANY_OWNER',
  OWNER_ALREADY_ASSIGNED: 'Ten właściciel jest już przypisany do innej firmy',
  CANNOT_DELETE_SYSTEM_COMPANY: 'Nie można usunąć firmy System Admin',
},
```

#### Testy weryfikujące

- [ ] Grep po repo: `grep -rn "throw new.*Exception.*'" | grep -v ErrorMessages` — zero wyników z angielskimi stringami

---

### FIX-12: Unique index na LOWER(email)

**Issue:** #13 z Code Review — standard unique constraint nie obsługuje case-insensitive
**Priorytet:** 🟡 MEDIUM
**Estymacja:** 1h

#### Migracja

```bash
bun run migration:generate -- apps/api/src/migrations/AddLowerEmailUniqueIndex
```

Zawartość migracji:

```typescript
export class AddLowerEmailUniqueIndex implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing case-sensitive unique constraint
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email"
    `);
    // Also drop the auto-generated TypeORM unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email"
    `);

    // Create case-insensitive unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_lower"
      ON "users" (LOWER(email))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_lower"`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE (email)
    `);
  }
}
```

**Plik:** `libs/common/src/lib/entities/user.entity.ts`

```typescript
// PRZED
@Column({ type: 'varchar', unique: true })
email!: string;

// PO — unique constraint zarządzany przez migrację (LOWER index)
@Column({ type: 'varchar' })
email!: string;
```

#### Testy weryfikujące

- [ ] `INSERT INTO users ... ('User@Test.com')` + `INSERT INTO users ... ('user@test.com')` → unique violation
- [ ] Zapytania z `LOWER()` korzystają z indeksu (`EXPLAIN ANALYZE`)

---

### FIX-13: Rozbijanie plików >500 linii (wybrane)

**Issue:** #9 z Code Review
**Priorytet:** 🟡 MEDIUM
**Estymacja:** 6h (rozłożone w czasie)

#### Plan rozbicia najważniejszych plików

| Plik                      | Linie | Plan rozbicia                                                                                                                                                                                                                        |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tasks.service.ts`        | 817   | → `TaskQueryService` (findAll, findOne, getKanban, getCalendar, getStats) + `TaskMutationService` (create, update, delete, reorder, bulkUpdate) + `TaskValidationService` (validateStatusTransition, validateAssignee, isDescendant) |
| `time-entries.service.ts` | 1084  | → `TimeEntryQueryService` + `TimeEntryMutationService` + `TimerService` (start, stop, update timer)                                                                                                                                  |
| `clients.service.ts`      | 770   | → `ClientQueryService` (findAll, findOne, searchPkd) + `ClientMutationService` (create, update, delete, restore) + `ClientBulkService` (bulkDelete, bulkRestore, bulkEdit)                                                           |
| `client-form-dialog.tsx`  | 1118  | → Wydziel sekcje formularza do sub-komponentów: `ClientBasicInfoSection`, `ClientTaxSection`, `ClientContactSection`                                                                                                                 |

#### Wzorzec rozbicia backend service

```typescript
// tasks.module.ts — zaktualizowany
@Module({
  providers: [
    TasksService,           // Fasada — deleguje do sub-services
    TaskQueryService,       // Zapytania read-only
    TaskMutationService,    // Operacje zapisu
    TaskValidationService,  // Walidacja biznesowa
  ],
  exports: [TasksService],
})
```

```typescript
// tasks.service.ts — fasada (thin wrapper)
@Injectable()
export class TasksService {
  constructor(
    private readonly queryService: TaskQueryService,
    private readonly mutationService: TaskMutationService
  ) {}

  findAll(user: User, filters?: TaskFiltersDto) {
    return this.queryService.findAll(user, filters);
  }

  create(dto: CreateTaskDto, user: User) {
    return this.mutationService.create(dto, user);
  }
  // ... delegacje
}
```

#### Testy weryfikujące

- [ ] Istniejące testy przechodzą bez zmian (fasada zachowuje interfejs)
- [ ] Żaden plik nie przekracza 500 linii po refaktorze

---

## ✅ Checklist końcowy

### Sprint 1 — CRITICAL

- [ ] FIX-01: Sekrety zrotowane, `.env` wyczyszczony
- [ ] FIX-02: JWT_EXPIRES_IN=15m, env.validator wzmocniony
- [ ] FIX-03: Self-registration ograniczone do COMPANY_OWNER
- [ ] FIX-04: tokenVersion sprawdzany w refreshToken()

### Sprint 2 — HIGH

- [ ] FIX-05: ParseUUIDPipe na 20 endpointach
- [ ] FIX-06: isDescendant → WITH RECURSIVE CTE
- [ ] FIX-07: reorderTasks w transakcji z limitem i batch UPDATE
- [ ] FIX-08: Case-insensitive email w admin/company service

### Sprint 3 — MEDIUM

- [ ] FIX-09: applyUpdate() zamiast Object.assign na entity
- [ ] FIX-10: routes.tsx zrefaktorowany (~74% mniej kodu)
- [ ] FIX-11: Wszystkie komunikaty błędów po polsku via ErrorMessages
- [ ] FIX-12: LOWER(email) unique index + migracja
- [ ] FIX-13: Pliki >500 linii rozbite na sub-modules

### Post-fix

- [ ] Pełny przebieg testów: `bun test`
- [ ] Lint bez błędów: `bun run lint:all`
- [ ] E2E testy: `bun run test:e2e`
- [ ] Security audit: `npm audit`
- [ ] Deploy na staging i smoke test

---

## Estymacja całościowa

| Sprint              | Estymacja | Issues          |
| ------------------- | --------- | --------------- |
| Sprint 1 (CRITICAL) | ~4h       | FIX-01 → FIX-04 |
| Sprint 2 (HIGH)     | ~5h       | FIX-05 → FIX-08 |
| Sprint 3 (MEDIUM)   | ~16h      | FIX-09 → FIX-13 |
| **RAZEM**           | **~25h**  | **13 fixów**    |
