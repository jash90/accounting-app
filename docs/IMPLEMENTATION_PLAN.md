# 📋 Plan implementacji napraw — Code Review

**Data:** 2026-04-03
**Bazuje na:** [docs/CODE_REVIEW.md](./CODE_REVIEW.md)
**Uwaga:** Dwa problemy z code review okazały się już rozwiązane po głębszej analizie:

- ~~Issue #12 (Health check z DB ping)~~ → `HealthController` już zawiera `TypeOrmHealthIndicator.pingCheck()`
- ~~Issue #14 (Pagination limits)~~ → `PaginationQueryDto` już ma `@Max(100)` na `limit`

---

## Spis treści

- [Faza 1 — KRYTYCZNE (Security Hotfixes)](#faza-1--krytyczne-security-hotfixes)
  - [1.1 Zablokowanie rejestracji ADMIN](#11-zablokowanie-rejestracji-admin)
  - [1.2 Password complexity w RegisterDto](#12-password-complexity-w-registerdto)
  - [1.3 Token revocation via tokenVersion](#13-token-revocation-via-tokenversion)
- [Faza 2 — WAŻNE (Performance & Consistency)](#faza-2--ważne-performance--consistency)
  - [2.1 Optymalizacja RBAC queries (N+1)](#21-optymalizacja-rbac-queries-n1)
  - [2.2 Migracja TenantService → SystemCompanyService](#22-migracja-tenantservice--systemcompanyservice)
  - [2.3 Usunięcie console.log z produkcyjnego kodu](#23-usunięcie-consolelog-z-produkcyjnego-kodu)
  - [2.4 Usunięcie redundantnego ClassSerializerInterceptor](#24-usunięcie-redundantnego-classserializerinterceptor)
- [Faza 3 — DROBNE (Cleanup & Polish)](#faza-3--drobne-cleanup--polish)
  - [3.1 Case-insensitive email index](#31-case-insensitive-email-index)
  - [3.2 Ujednolicenie języka error messages](#32-ujednolicenie-języka-error-messages)
  - [3.3 Plan usunięcia legacy fields z Client entity](#33-plan-usunięcia-legacy-fields-z-client-entity)
- [Faza 4 — REFACTORING (Duże pliki)](#faza-4--refactoring-duże-pliki)
  - [4.1 Rozbicie clients.controller.ts](#41-rozbicie-clientscontrollerts)
  - [4.2 Rozbicie dużych serwisów](#42-rozbicie-dużych-serwisów)
- [Harmonogram](#harmonogram)

---

## Faza 1 — KRYTYCZNE (Security Hotfixes)

**Priorytet:** 🔴 Natychmiast (1-2 dni)
**Branch:** `fix/security-hardening`

---

### 1.1 Zablokowanie rejestracji ADMIN

**Problem:** Publiczny endpoint `POST /auth/register` pozwala każdemu zarejestrować się z rolą `ADMIN`.
**Ryzyko:** Krytyczne — eskalacja uprawnień bez autoryzacji.
**Estymacja:** 30 min

#### Pliki do zmiany

| Plik                                              | Zmiana                        |
| ------------------------------------------------- | ----------------------------- |
| `libs/auth/src/lib/services/auth.service.ts`      | Walidacja roli w `register()` |
| `libs/auth/src/lib/services/auth.service.spec.ts` | Nowy test case                |

#### Implementacja

**`libs/auth/src/lib/services/auth.service.ts`** — dodać na początku metody `register()`:

```typescript
async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
  // ⬇️ DODAĆ: Blokada samodzielnej rejestracji jako ADMIN
  if (registerDto.role === UserRole.ADMIN) {
    throw new BadRequestException(
      'Rejestracja z rolą ADMIN nie jest dozwolona. Konta ADMIN tworzone są wyłącznie przez administratorów systemu.'
    );
  }

  const existingUser = await this.userRepository
  // ... reszta bez zmian
```

#### Testy do dodania

**`libs/auth/src/lib/services/auth.service.spec.ts`**:

```typescript
describe('register', () => {
  it('should reject registration with ADMIN role', async () => {
    const dto = {
      email: 'hacker@evil.com',
      password: 'SecurePass123!',
      firstName: 'Evil',
      lastName: 'Hacker',
      role: UserRole.ADMIN,
    };

    await expect(service.register(dto)).rejects.toThrow(BadRequestException);
  });

  it('should allow registration with COMPANY_OWNER role', async () => {
    // ... setup mocks, verify it works
  });

  it('should allow registration with EMPLOYEE role', async () => {
    // ... setup mocks, verify it works
  });
});
```

#### Weryfikacja

```bash
bun test libs/auth/src/lib/services/auth.service.spec.ts
# Manualny test: POST /auth/register z role: "ADMIN" → 400 Bad Request
```

---

### 1.2 Password complexity w RegisterDto

**Problem:** `RegisterDto` wymaga tylko `@MinLength(8)`, podczas gdy `ChangePasswordDto` już wymaga 12 znaków + złożoność.
**Ryzyko:** Wysokie — słabe hasła przy rejestracji.
**Estymacja:** 30 min

#### Pliki do zmiany

| Plik                                              | Zmiana                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| `libs/auth/src/lib/dto/register.dto.ts`           | Dodanie `@Matches()` + zwiększenie `@MinLength`    |
| `libs/auth/src/lib/services/auth.service.spec.ts` | Test walidacji hasła                               |
| `apps/web/src/lib/validation/schemas.ts`          | Aktualizacja schematu Zod (jeśli jest rejestracja) |

#### Implementacja

**`libs/auth/src/lib/dto/register.dto.ts`** — zmienić walidację `password`:

```typescript
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

// ... reszta importów bez zmian

export class RegisterDto {
  // ... email, firstName, lastName bez zmian

  @ApiProperty({
    example: 'SecurePassword123!',
    minLength: 12,
    description: 'Min 12 chars, must contain uppercase, lowercase, digit, and special character',
  })
  @IsString()
  @MinLength(12, { message: 'Hasło musi mieć minimum 12 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę, jedną cyfrę i jeden znak specjalny (@$!%*?&)',
  })
  password!: string;

  // ... role, companyId bez zmian
}
```

> **Uwaga:** Walidacja jest identyczna jak w istniejącym `ChangePasswordDto` — zachowuje spójność.

#### Wpływ na dane testowe

Hasła testowe z AGENTS.md (`Admin123456!`, `Owner123456!`, `Employee123456!`) mają 12+ znaków i spełniają regex — **nie wymagają zmiany**.

#### Weryfikacja

```bash
bun test libs/auth
# Manualny test: POST /auth/register z password "weak" → 400 Bad Request
```

---

### 1.3 Token revocation via tokenVersion

**Problem:** Po logout tokeny JWT (access 15min, refresh 7d) pozostają ważne.
**Ryzyko:** Średnio-wysokie — przechwycony token = dostęp do konta.
**Estymacja:** 3-4h

#### Strategia

Zamiast Redis (dodatkowa infrastruktura), użyć **token version** w tabeli `users`. Każdy logout inkrementuje version, tokeny z starą wersją są odrzucane.

#### Pliki do zmiany

| Plik                                                   | Zmiana                                            |
| ------------------------------------------------------ | ------------------------------------------------- |
| `libs/common/src/lib/entities/user.entity.ts`          | Nowa kolumna `tokenVersion`                       |
| `libs/auth/src/lib/services/auth.service.ts`           | Dodanie `tokenVersion` do payload + bump w logout |
| `libs/auth/src/lib/strategies/jwt.strategy.ts`         | Weryfikacja `tokenVersion` w `validate()`         |
| `libs/auth/src/lib/controllers/auth.controller.ts`     | Wywołanie `invalidateTokens()` w logout           |
| `apps/api/src/migrations/XXXXXXXXX-AddTokenVersion.ts` | Nowa migracja                                     |
| `libs/auth/src/lib/services/auth.service.spec.ts`      | Nowe testy                                        |

#### Implementacja

**Krok 1: Entity — `libs/common/src/lib/entities/user.entity.ts`**

Dodać kolumnę:

```typescript
@Column({ type: 'int', default: 0 })
tokenVersion!: number;
```

**Krok 2: Auth Service — `libs/auth/src/lib/services/auth.service.ts`**

Dodać `tokenVersion` do payload tokenów:

```typescript
private generateTokens(user: User): AuthResponseDto {
  const payload: Record<string, string | number | null> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    tokenVersion: user.tokenVersion, // ⬅️ DODAĆ
  };
  // ... reszta bez zmian
}
```

Dodać nową metodę:

```typescript
async invalidateTokens(userId: string): Promise<void> {
  await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
}
```

**Krok 3: JWT Strategy — `libs/auth/src/lib/strategies/jwt.strategy.ts`**

Weryfikacja wersji w `validate()`:

```typescript
async validate(payload: JwtPayload): Promise<User> {
  const user = await this.userRepository.findOne({
    where: { id: payload.sub },
  });

  if (!user) {
    throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
  }

  if (!user.isActive) {
    throw new UnauthorizedException(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
  }

  // ⬇️ DODAĆ: Weryfikacja tokenVersion
  if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
    throw new UnauthorizedException('Token został unieważniony. Zaloguj się ponownie.');
  }

  return user;
}
```

> **Uwaga:** `payload.tokenVersion !== undefined` zapewnia backward compatibility — stare tokeny (bez version) będą akceptowane do momentu ich wygaśnięcia.

**Krok 4: Auth Controller — `libs/auth/src/lib/controllers/auth.controller.ts`**

Zmienić logout:

```typescript
async logout(
  @CurrentUser() user: User,
  @Res({ passthrough: true }) res: Response
): Promise<{ message: string }> {
  // ⬇️ DODAĆ: Unieważnienie tokenów
  await this.authService.invalidateTokens(user.id);

  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions(isProduction));
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions(isProduction));
  return { message: 'Wylogowano pomyślnie' };
}
```

**Krok 5: Migracja**

```bash
bun run migration:generate apps/api/src/migrations/AddTokenVersion
bun run migration:run
```

**Krok 6: Aktualizacja JwtPayload interface**

**`libs/auth/src/lib/strategies/jwt.strategy.ts`**:

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
  tokenVersion?: number; // ⬅️ DODAĆ (optional dla backward compat)
}
```

#### Testy

```typescript
describe('Token revocation', () => {
  it('should invalidate tokens on logout', async () => {
    await service.invalidateTokens('user-id');
    expect(mockUserRepository.increment).toHaveBeenCalledWith({ id: 'user-id' }, 'tokenVersion', 1);
  });

  it('should reject tokens with old tokenVersion', async () => {
    // JWT validate z tokenVersion: 0, user ma tokenVersion: 1
    // → UnauthorizedException
  });

  it('should accept tokens without tokenVersion (backward compat)', async () => {
    // JWT validate bez tokenVersion field → akceptowany
  });
});
```

#### Weryfikacja

```bash
bun run migration:run
bun test libs/auth
# Manualny test: login → logout → użyj starego access tokena → 401
```

---

## Faza 2 — WAŻNE (Performance & Consistency)

**Priorytet:** 🟡 Bieżący sprint (3-5 dni)
**Branch:** `improve/rbac-performance` + `refactor/tenant-service-migration`

---

### 2.1 Optymalizacja RBAC queries (N+1)

**Problem:** Guard chain `ModuleAccessGuard` + `PermissionGuard` generuje 6+ queries per request (user ładowany 2x, module 2x).
**Estymacja:** 3-4h

#### Strategia

1. Guardy mają dostęp do `request.user` (ustawiony przez `JwtAuthGuard`) — nie trzeba ponownie ładować usera
2. `canAccessModule` i `hasPermission` mogą używać cached module lookup (`getModuleBySlug`)
3. Nowa metoda `checkModulePermission()` łączy oba sprawdzenia w jednym wywołaniu

#### Pliki do zmiany

| Plik                                              | Zmiana                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `libs/rbac/src/lib/services/rbac.service.ts`      | Nowa metoda `checkModulePermission()`, refactor `canAccessModule` / `hasPermission` |
| `libs/rbac/src/lib/guards/module-access.guard.ts` | Przekazywanie `user` zamiast `user.id`                                              |
| `libs/rbac/src/lib/guards/permission.guard.ts`    | Użycie `checkModulePermission()`                                                    |
| `libs/rbac/src/lib/services/rbac.service.spec.ts` | Nowe testy                                                                          |

#### Implementacja

**Nowa metoda w `RBACService`:**

```typescript
/**
 * Combined module access + permission check (single pass).
 * Eliminates duplicate user/module lookups from guard chain.
 * User object is passed directly from request (no DB roundtrip).
 */
async checkModulePermission(
  user: User,
  moduleSlug: string,
  permission?: string
): Promise<{ hasAccess: boolean; hasPermission: boolean }> {
  // ADMIN — full access
  if (user.role === UserRole.ADMIN) {
    return { hasAccess: true, hasPermission: true };
  }

  // Get module with cache
  const module = await this.getModuleBySlug(moduleSlug);
  if (!module || !module.isActive) {
    return { hasAccess: false, hasPermission: false };
  }

  if (!user.companyId) {
    return { hasAccess: false, hasPermission: false };
  }

  // Check company access (single query)
  const companyAccess = await this.companyModuleAccessRepository.findOne({
    where: {
      companyId: user.companyId,
      moduleId: module.id,
      isEnabled: true,
    },
  });

  if (!companyAccess) {
    return { hasAccess: false, hasPermission: false };
  }

  // COMPANY_OWNER — full permissions on enabled modules
  if (user.role === UserRole.COMPANY_OWNER) {
    return { hasAccess: true, hasPermission: true };
  }

  // EMPLOYEE — needs explicit permission
  if (user.role === UserRole.EMPLOYEE) {
    const userPermission = await this.userModulePermissionRepository.findOne({
      where: { userId: user.id, moduleId: module.id },
    });

    if (!userPermission) {
      return { hasAccess: false, hasPermission: false };
    }

    const hasPerm = permission
      ? userPermission.permissions.includes(permission)
      : true;

    return { hasAccess: true, hasPermission: hasPerm };
  }

  return { hasAccess: false, hasPermission: false };
}
```

**Zmiana w `ModuleAccessGuard`:**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
    context.getHandler(), context.getClass(),
  ]);
  if (!requiredModule) return true;

  const request = context.switchToHttp().getRequest();
  const user = request.user;
  if (!user) throw new ForbiddenException('Użytkownik nie jest zalogowany');

  // Użyj zoptymalizowanej metody i zapisz wynik na request
  const result = await this.rbacService.checkModulePermission(user, requiredModule);
  request._rbacResult = result; // ⬅️ Cache dla PermissionGuard

  if (!result.hasAccess) {
    throw new ForbiddenException(`Brak dostępu do modułu: ${requiredModule}`);
  }
  return true;
}
```

**Zmiana w `PermissionGuard`:**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const permissionData = this.reflector.getAllAndOverride<{
    module: string; permission: string;
  }>(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
  if (!permissionData) return true;

  const request = context.switchToHttp().getRequest();
  const user = request.user;
  if (!user) throw new ForbiddenException('Użytkownik nie jest zalogowany');

  // Sprawdź cache z ModuleAccessGuard
  let hasPermission: boolean;
  if (request._rbacResult) {
    // ModuleAccessGuard już sprawdził — ADMIN/OWNER mają hasPermission: true
    // Dla EMPLOYEE: jeśli potrzeba granularnego check, wywołaj ponownie z permission
    if (request._rbacResult.hasPermission) {
      hasPermission = true;
    } else {
      // EMPLOYEE case — trzeba sprawdzić konkretny permission
      const result = await this.rbacService.checkModulePermission(
        user, permissionData.module, permissionData.permission
      );
      hasPermission = result.hasPermission;
    }
  } else {
    // Fallback — brak cache z ModuleAccessGuard
    hasPermission = await this.rbacService.hasPermission(
      user.id, permissionData.module, permissionData.permission
    );
  }

  if (!hasPermission) {
    this.logger.warn(
      `Permission denied for user ${user.id}: ${permissionData.permission} on module ${permissionData.module}`
    );
    throw new ForbiddenException('Nie masz uprawnień do wykonania tej operacji');
  }
  return true;
}
```

#### Wynik optymalizacji

| Scenariusz            | Przed (queries) | Po (queries)                                            |
| --------------------- | --------------- | ------------------------------------------------------- |
| ADMIN request         | 6+              | **0** (short-circuit)                                   |
| COMPANY_OWNER request | 6+              | **2** (module cache + company access)                   |
| EMPLOYEE request      | 6+              | **3** (module cache + company access + user permission) |

> **Uwaga:** Istniejące metody `canAccessModule()` / `hasPermission()` pozostają niezmienione dla backward compatibility (używane poza guardami).

#### Weryfikacja

```bash
bun test libs/rbac
# Sprawdzić w DB logach ilość queries per request (development logging: true)
```

---

### 2.2 Migracja TenantService → SystemCompanyService

**Problem:** `TenantService` jest deprecated, ale używany w 30+ serwisach. Nowe moduły (offers, ai-agent, notifications) prawidłowo używają `SystemCompanyService`.
**Estymacja:** 2-3h (mechaniczny refactor)

#### Pliki do zmiany (30 serwisów)

**Moduł Clients (8 plików):**

| Plik                                                                   |
| ---------------------------------------------------------------------- |
| `libs/modules/clients/src/lib/services/clients.service.ts`             |
| `libs/modules/clients/src/lib/services/client-icons.service.ts`        |
| `libs/modules/clients/src/lib/services/custom-fields.service.ts`       |
| `libs/modules/clients/src/lib/services/delete-request.service.ts`      |
| `libs/modules/clients/src/lib/services/duplicate-detection.service.ts` |
| `libs/modules/clients/src/lib/services/export.service.ts`              |
| `libs/modules/clients/src/lib/services/relief-period.service.ts`       |
| `libs/modules/clients/src/lib/services/statistics.service.ts`          |
| `libs/modules/clients/src/lib/services/suspension.service.ts`          |

**Moduł Tasks (7 plików):**

| Plik                                                                 |
| -------------------------------------------------------------------- |
| `libs/modules/tasks/src/lib/services/tasks.service.ts`               |
| `libs/modules/tasks/src/lib/services/task-comments.service.ts`       |
| `libs/modules/tasks/src/lib/services/task-dependencies.service.ts`   |
| `libs/modules/tasks/src/lib/services/task-export.service.ts`         |
| `libs/modules/tasks/src/lib/services/task-labels.service.ts`         |
| `libs/modules/tasks/src/lib/services/task-template.service.ts`       |
| `libs/modules/tasks/src/lib/services/task-extended-stats.service.ts` |
| `libs/modules/tasks/src/lib/services/tasks-lookup.service.ts`        |

**Moduł Settlements (5 plików):**

| Plik                                                                             |
| -------------------------------------------------------------------------------- |
| `libs/modules/settlements/src/lib/services/settlements.service.ts`               |
| `libs/modules/settlements/src/lib/services/settlement-comments.service.ts`       |
| `libs/modules/settlements/src/lib/services/settlement-export.service.ts`         |
| `libs/modules/settlements/src/lib/services/settlement-settings.service.ts`       |
| `libs/modules/settlements/src/lib/services/settlement-stats.service.ts`          |
| `libs/modules/settlements/src/lib/services/settlement-extended-stats.service.ts` |

**Moduł Time-Tracking (4 pliki):**

| Plik                                                                                  |
| ------------------------------------------------------------------------------------- |
| `libs/modules/time-tracking/src/lib/services/time-entries.service.ts`                 |
| `libs/modules/time-tracking/src/lib/services/time-settings.service.ts`                |
| `libs/modules/time-tracking/src/lib/services/timesheet.service.ts`                    |
| `libs/modules/time-tracking/src/lib/services/time-tracking-extended-stats.service.ts` |

**Moduł Documents (2 pliki):**

| Plik                                                                     |
| ------------------------------------------------------------------------ |
| `libs/modules/documents/src/lib/services/document-templates.service.ts`  |
| `libs/modules/documents/src/lib/services/generated-documents.service.ts` |

**Moduł Offers (1 plik — reszta już używa SystemCompanyService):**

| Plik                                                           |
| -------------------------------------------------------------- |
| `libs/modules/offers/src/lib/services/offer-export.service.ts` |

**Moduł Email-Client (1 plik):**

| Plik                                                                              |
| --------------------------------------------------------------------------------- |
| `libs/modules/email-client/src/lib/services/email-auto-reply-template.service.ts` |

#### Wzorzec zmiany (identyczny w każdym pliku)

```typescript
// PRZED:
import { TenantService } from '@accounting/common/backend';
// ...
constructor(
  private readonly tenantService: TenantService
) {}
// ...
const companyId = await this.tenantService.getEffectiveCompanyId(user);

// PO:
import { SystemCompanyService } from '@accounting/common/backend';
// ...
constructor(
  private readonly systemCompanyService: SystemCompanyService
) {}
// ...
const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
```

#### Po migracji: Usunięcie TenantService

Po potwierdzeniu, że żaden plik nie importuje `TenantService`:

```bash
grep -rn "TenantService" --include="*.ts" libs/ apps/ | grep -v node_modules | grep -v dist
```

Jeśli 0 wyników → usunąć:

- `libs/common/src/lib/services/tenant.service.ts`
- Eksporty z `libs/common/src/backend.ts` i `libs/common/src/index.ts`
- Provider z `libs/common/src/lib/common.module.ts`

#### Aktualizacja testów

Każdy plik `.spec.ts` powiązany z powyższymi serwisami wymaga aktualizacji mock:

```typescript
// PRZED:
{ provide: TenantService, useValue: { getEffectiveCompanyId: jest.fn() } }

// PO:
{ provide: SystemCompanyService, useValue: { getCompanyIdForUser: jest.fn() } }
```

#### Weryfikacja

```bash
bun test
grep -rn "TenantService" --include="*.ts" libs/ apps/ | grep -v node_modules | grep -v dist
# Powinno zwrócić 0 wyników
```

---

### 2.3 Usunięcie console.log z produkcyjnego kodu

**Problem:** 5 wystąpień `console.log/warn` w kodzie produkcyjnym.
**Estymacja:** 20 min

#### Pliki i zmiany

**`libs/infrastructure/storage/src/lib/storage.module.ts`** (linia 24):

```typescript
// PRZED:
console.warn(...)
// PO:
Logger.warn(..., 'StorageModule')
```

**`libs/modules/clients/src/lib/services/client-icons.service.ts`** (linia 284):

```typescript
// PRZED:
console.warn(`Failed to delete icon file ${filePath}: ${(error as Error).message}`);
// PO:
this.logger.warn(`Failed to delete icon file ${filePath}: ${(error as Error).message}`);
```

> Service prawdopodobnie już ma `private readonly logger = new Logger(...)` — zweryfikować.

**`libs/modules/notifications/src/lib/gateways/notification.gateway.ts`** (linia 50):

```typescript
// PRZED:
console.warn(...)
// PO:
this.logger.warn(...)
```

**`apps/web/src/lib/utils/performance.ts`** (linie 16, 26):

```typescript
// PO: Użyć dedykowanego logger z apps/web/src/lib/logging/logger.ts
import { logger } from '@/lib/logging/logger';

// PRZED:
console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
console.warn(`Performance measurement failed for ${name}:`, error);

logger.debug(`${name}: ${measure.duration.toFixed(2)}ms`);
logger.warn(`Performance measurement failed for ${name}:`, error);
```

#### Weryfikacja

```bash
grep -rn "console\.\(log\|error\|warn\)" --include="*.ts" libs/ apps/api/ apps/web/src/ \
  | grep -v node_modules | grep -v dist | grep -v ".spec.ts" | grep -v "test/"
# Powinno zwrócić 0 wyników (poza logger.ts i celowymi use-case)
```

---

### 2.4 Usunięcie redundantnego ClassSerializerInterceptor

**Problem:** `AdminController` ma `@UseInterceptors(ClassSerializerInterceptor)`, ale jest już ustawiony globalnie w `main.ts`.
**Estymacja:** 5 min

#### Plik do zmiany

**`apps/api/src/admin/controllers/admin.controller.ts`**:

```typescript
// USUNĄĆ:
import { ClassSerializerInterceptor, ... } from '@nestjs/common';
// ...
@UseInterceptors(ClassSerializerInterceptor) // ← usunąć tę linię

// Zostawić tylko:
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
```

#### Weryfikacja

```bash
bun run serve
# GET /api/admin/users → sprawdzić, że password field jest nadal ukryty (@Exclude)
```

---

## Faza 3 — DROBNE (Cleanup & Polish)

**Priorytet:** 🟢 Backlog (1-2 tygodnie)
**Branch:** `improve/cleanup`

---

### 3.1 Case-insensitive email index

**Problem:** Kolumna `email` ma `unique: true` (case-sensitive), ale `AuthService` szuka `LOWER(user.email)`. Brak functional index = full table scan na LOWER().
**Estymacja:** 30 min

#### Implementacja

**Nowa migracja:**

```typescript
export class AddCaseInsensitiveEmailIndex implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usuń istniejący case-sensitive unique constraint
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_users_email";
    `);
    // Usuń unique index (TypeORM generuje jeden z tych dwóch)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
    `);

    // Dodaj case-insensitive unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_lower"
      ON users (LOWER(email));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_lower";`);
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT "UQ_users_email" UNIQUE (email);
    `);
  }
}
```

**Opcjonalnie** — aktualizacja entity (komentarz informacyjny):

```typescript
// user.entity.ts
@Column({ type: 'varchar' }) // unique via functional index IDX_users_email_lower
email!: string;
```

> **Uwaga:** Przed migracją sprawdzić, czy nie ma duplikatów case-insensitive:
>
> ```sql
> SELECT LOWER(email), COUNT(*) FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;
> ```

#### Weryfikacja

```bash
bun run migration:generate apps/api/src/migrations/AddCaseInsensitiveEmailIndex
bun run migration:run
# Test: INSERT user z 'Admin@System.com' gdy istnieje 'admin@system.com' → unique violation
```

---

### 3.2 Ujednolicenie języka error messages

**Problem:** Mieszanka PL i EN w error messages. `ErrorMessages` const jest w PL (dobrze), ale kilka miejsc w `RBACService` używa EN bezpośrednio.
**Estymacja:** 1h

#### Pliki do zmiany

| Plik                                              | Zmiana                                           |
| ------------------------------------------------- | ------------------------------------------------ |
| `libs/rbac/src/lib/services/rbac.service.ts`      | Zamienić hardcoded EN stringi na `ErrorMessages` |
| `libs/common/src/lib/constants/error-messages.ts` | Dodać brakujące klucze                           |

#### Nowe klucze w `ErrorMessages`

```typescript
// error-messages.ts — dodać do sekcji FORBIDDEN lub nowej RBAC:
RBAC: {
  GRANTER_NOT_FOUND: 'Użytkownik przyznający uprawnienia nie został znaleziony',
  TARGET_NOT_FOUND: 'Użytkownik docelowy nie został znaleziony',
  MODULE_NOT_FOUND: 'Moduł nie został znaleziony',
  COMPANY_NO_MODULE_ACCESS: 'Firma nie ma dostępu do tego modułu',
  CROSS_COMPANY_GRANT: 'Nie można nadawać uprawnień użytkownikom spoza Twojej firmy',
  CROSS_COMPANY_REVOKE: 'Nie można odbierać uprawnień użytkownikom spoza Twojej firmy',
  INSUFFICIENT_PERMISSIONS: 'Niewystarczające uprawnienia do nadawania dostępu',
},
```

#### Zastąpienia w `rbac.service.ts`

```typescript
// PRZED:
throw new NotFoundException('Granter user not found');
throw new NotFoundException('Target user not found');
throw new NotFoundException('Module not found');
throw new ForbiddenException('Cannot grant access to users outside your company');
throw new ForbiddenException('Company does not have access to this module');
throw new ForbiddenException('Cannot revoke access from users outside your company');
throw new ForbiddenException('Insufficient permissions to grant access');

// PO:
throw new NotFoundException(ErrorMessages.RBAC.GRANTER_NOT_FOUND);
throw new NotFoundException(ErrorMessages.RBAC.TARGET_NOT_FOUND);
throw new NotFoundException(ErrorMessages.RBAC.MODULE_NOT_FOUND);
throw new ForbiddenException(ErrorMessages.RBAC.CROSS_COMPANY_GRANT);
throw new ForbiddenException(ErrorMessages.RBAC.COMPANY_NO_MODULE_ACCESS);
throw new ForbiddenException(ErrorMessages.RBAC.CROSS_COMPANY_REVOKE);
throw new ForbiddenException(ErrorMessages.RBAC.INSUFFICIENT_PERMISSIONS);
```

#### Weryfikacja

```bash
grep -rn "\"[A-Z][a-z].*not found\|Cannot\|Insufficient" --include="*.ts" libs/rbac/ apps/api/
# Powinno zwrócić 0 wyników (wszystkie EN stringi zamienione na ErrorMessages)
```

---

### 3.3 Plan usunięcia legacy fields z Client entity

**Problem:** `gtuCode` (string) i `amlGroup` (string) są legacy — zastąpione przez `gtuCodes` (array) i `amlGroupEnum` (enum).
**Estymacja:** 2h (migracja danych + usunięcie kolumn)

#### Strategia (3 kroki)

**Krok 1: Migracja danych** (nowa migracja SQL):

```sql
-- Przenieś gtuCode → gtuCodes (jeśli gtuCodes jest puste)
UPDATE clients
SET "gtuCodes" = ARRAY["gtuCode"]
WHERE "gtuCode" IS NOT NULL
  AND ("gtuCodes" IS NULL OR array_length("gtuCodes", 1) IS NULL);

-- Przenieś amlGroup → amlGroupEnum (mapowanie string → enum)
UPDATE clients
SET "amlGroupEnum" = "amlGroup"::aml_group_enum
WHERE "amlGroup" IS NOT NULL
  AND "amlGroupEnum" IS NULL;
```

> **Uwaga:** Wymaga weryfikacji, czy wartości w `amlGroup` matchują enum values.

**Krok 2: Weryfikacja** — sprawdzić w prod, że dane są poprawnie zmigrowane.

**Krok 3: Usunięcie kolumn** (osobna migracja, po potwierdzeniu):

```typescript
// W entity — usunąć:
@Column({ type: 'varchar', nullable: true })
gtuCode?: string;

@Column({ type: 'varchar', nullable: true })
amlGroup?: string;
```

```bash
bun run migration:generate apps/api/src/migrations/RemoveLegacyClientFields
bun run migration:run
```

---

## Faza 4 — REFACTORING (Duże pliki)

**Priorytet:** 🟢 Backlog (iteracyjnie, 1-2 tygodnie)
**Branch:** `refactor/split-large-files`

---

### 4.1 Rozbicie clients.controller.ts

**Problem:** 975 linii — jeden controller z endpoints dla: CRUD, bulk operations, export/import, custom fields, statistics, changelog, delete requests.
**Estymacja:** 2-3h

#### Plan podziału

| Nowy controller                        | Endpoints                                                     | ~Linie |
| -------------------------------------- | ------------------------------------------------------------- | ------ |
| `clients.controller.ts`                | CRUD (GET all, GET :id, POST, PATCH :id, DELETE :id, restore) | ~300   |
| `client-bulk.controller.ts`            | Bulk delete/restore/edit                                      | ~120   |
| `client-export.controller.ts`          | Export CSV, Import CSV, Import template                       | ~150   |
| `client-custom-fields.controller.ts`   | GET/PUT :id/custom-fields                                     | ~100   |
| `client-statistics.controller.ts`      | Statistics, task-time stats                                   | ~80    |
| `client-changelog.controller.ts`       | History, :id/changelog                                        | ~80    |
| `client-delete-requests.controller.ts` | POST :id/delete-request                                       | ~60    |

> Wszystkie sub-controllers zachowują te same guardy i dekoratory (`@UseGuards`, `@RequireModule('clients')`).

#### Rejestracja w module

```typescript
// clients.module.ts
@Module({
  controllers: [
    ClientsController,
    ClientBulkController,
    ClientExportController,
    ClientCustomFieldsController,
    ClientStatisticsController,
    ClientChangelogController,
    ClientDeleteRequestsController,
  ],
  // ...
})
```

---

### 4.2 Rozbicie dużych serwisów

Pliki do rozbicia (>700 linii):

| Plik                          | Linie | Propozycja podziału                                                                                  |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `time-entries.service.ts`     | 1084  | → `time-entries-crud.service.ts` + `time-entries-timer.service.ts` + `time-entries-query.service.ts` |
| `tasks.service.ts`            | 817   | → `tasks-crud.service.ts` + `tasks-kanban.service.ts` + `tasks-stats.service.ts`                     |
| `clients.service.ts`          | 770   | → `clients-crud.service.ts` + `clients-bulk.service.ts` + `clients-search.service.ts`                |
| `client-changelog.service.ts` | 783   | → `client-changelog-query.service.ts` + `client-changelog-email.service.ts`                          |
| `offers.service.ts`           | 760   | → `offers-crud.service.ts` + `offers-actions.service.ts` (status changes, duplicate, send)           |
| `email-reader.service.ts`     | 797   | → `email-reader.service.ts` + `email-parser.service.ts`                                              |

> **Uwaga:** Refactoring serwisów wymaga aktualizacji DI (constructors) i testów. Robić iteracyjnie, jeden serwis per PR.

---

## Harmonogram

```
Tydzień 1 (KRYTYCZNE — Faza 1):
├── Dzień 1: Issue 1.1 (ADMIN register) + 1.2 (password complexity)
│   └── Deploy hotfix do produkcji
├── Dzień 2-3: Issue 1.3 (token revocation)
│   ├── Migracja DB
│   ├── Implementacja + testy
│   └── Deploy
└── Code review + merge

Tydzień 2 (WAŻNE — Faza 2):
├── Dzień 1-2: Issue 2.1 (RBAC optimization)
│   └── checkModulePermission() + guard refactor
├── Dzień 3-4: Issue 2.2 (TenantService migration)
│   └── 30+ plików — mechaniczny refactor
├── Dzień 5: Issue 2.3 + 2.4 (console.log + serializer)
└── Code review + merge

Tydzień 3-4 (DROBNE + REFACTORING — Faza 3 & 4):
├── Issue 3.1 (email index)
├── Issue 3.2 (error messages language)
├── Issue 3.3 (legacy fields)
├── Issue 4.1 (split clients.controller.ts)
└── Issue 4.2 (split large services — iteracyjnie)
```

---

## Metryki sukcesu

| Metryka                            | Przed                        | Po                         |
| ---------------------------------- | ---------------------------- | -------------------------- |
| Bezpieczeństwo rejestracji         | ❌ Można zarejestrować ADMIN | ✅ Zablokowane             |
| Password complexity (register)     | ❌ Tylko min 8 chars         | ✅ 12+ chars + complexity  |
| Token revocation                   | ❌ Brak                      | ✅ tokenVersion            |
| RBAC queries per request           | 6+                           | **0-3** (zależnie od roli) |
| TenantService usage                | 30+ plików                   | **0** (usunięty)           |
| Console.log w prod                 | 5 wystąpień                  | **0**                      |
| Ocena bezpieczeństwa (Code Review) | 7/10                         | **9/10**                   |
| Ocena performance (Code Review)    | 7/10                         | **9/10**                   |
