# 🔍 Code Review — RBAC Multi-tenant SaaS Platform (Accounting)

**Data**: 2026-04-03
**Reviewer**: Claude Code (automated deep analysis)

## Przegląd projektu

| Metryka          | Wartość                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Typ**          | NestJS 11 + React 19 Monorepo (Nx 22)                                                                    |
| **Rozmiar kodu** | ~140k linii TS/TSX (bez testów)                                                                          |
| **Moduły**       | 9 (AI Agent, Clients, Tasks, Time Tracking, Settlements, Documents, Offers, Email Client, Notifications) |
| **Testy**        | 217 plików spec/test (~62k linii)                                                                        |
| **Entities**     | ~45 TypeORM entities                                                                                     |

---

## ✅ MOCNE STRONY

### 1. Architektura i organizacja

- **Doskonała modularność** — clean separation na `libs/modules/*`, `libs/auth`, `libs/rbac`, `libs/common`, `libs/infrastructure/*`. Każdy moduł ma jasną odpowiedzialność.
- **Entity registry** (`entity-registry.ts`) — Single Source of Truth dla encji TypeORM, współdzielony między `typeorm.config.ts` a `app.module.ts`.
- **SystemCompanyService** z cachowaniem — eliminuje N+1 lookupów system company, lazy init z fallbackiem.
- **Dobrze przemyślany RBAC** — Guard chain (`JwtAuthGuard → ModuleAccessGuard → PermissionGuard`) z cachowanym wynikiem `_rbacResult` unikającym duplikacji queries.

### 2. Bezpieczeństwo (bardzo solidne)

- **httpOnly cookies** dla JWT — tokeny nigdy nie trafiają do `localStorage`. Doskonała implementacja `token-storage.ts` z migracją legacy tokens.
- **Token versioning** — `tokenVersion` w User entity do invalidacji po logout/password change.
- **Timing-attack mitigation** — `bcrypt.compare` zawsze wykonywany, nawet gdy user nie istnieje (dummy hash).
- **AES-256-GCM** encryption z random salt — mocne szyfrowanie wrażliwych danych.
- **Environment validation** — startup validation z strict mode w produkcji (`env.validator.ts`).
- **Helmet + CORS + Rate Limiting** — ThrottlerModule z per-endpoint overrides na auth endpoints.
- **Sensitive data redaction** w error filter — `SENSITIVE_KEYS` set zapobiega wyciekom.
- **CSRF protection** przez Bearer token pattern + `sameSite: strict` w produkcji.

### 3. Frontend

- **Dualny AuthContext** — oddzielny `AuthLoadingContext` zapobiega re-renderom komponentów zależnych tylko od user data. Mądra optymalizacja.
- **TokenRefreshManager** — singleton promise pattern zapobiega race conditions przy równoczesnych 401.
- **Lazy loading routes** z `React.lazy()` i `Suspense` — dobry code-splitting.

### 4. Error Handling

- **AllExceptionsFilter** — trzy warstwy (AppException, HttpException, Unexpected) z `requestId` correlation. Sanityzacja kontekstu do max depth 2.
- **Generic error messages** w odpowiedziach dla unexpected errors — nie ujawniają internali.

### 5. Database

- **`synchronize: false`** WSZĘDZIE (produkcja i dev) — prawidłowe użycie migrations.
- **Przemyślane indeksy** — composite indexes na entities (np. `['companyId', 'isActive']`, `['companyId', 'nip']` unique where null).
- **Pessimistic locking** w `createCompany` — race condition prevention przy przypisywaniu ownera.

---

## ⚠️ PROBLEMY DO POPRAWY

### 🔴 KRYTYCZNE (Security / Data Integrity)

#### 1. `.env` z sekretami — weryfikacja historii git

```
# .env JEST w .gitignore, ALE:
ENCRYPTION_KEY=ec99b04bdbe713db04751cb50272a3d6a8d26314afb6c4c747f5e75c1bb27fbc
ENCRYPTION_SECRET=b71fe976782b57b39b4969f1bad352291e601f60b33ac7b7e82a21f5a3d2d11d
SEED_ADMIN_PASSWORD=Admin123456!
```

**Problem**: `.env` jest w `.gitignore`, ale plik `.encryption-key.dev` jest poza nim — sprawdź czy nie wyciekł w historii gita. Seed passwordy w `.env` to lokalne dev, ale `ENCRYPTION_KEY` i `ENCRYPTION_SECRET` to realne klucze kryptograficzne — jeśli kiedykolwiek były commitnięte, wymagają rotacji.

**Dotyczy plików**:

- `.env`
- `.encryption-key.dev`
- `.env.example` (sprawdzić czy nie zawiera prawdziwych kluczy)

#### 2. `Object.assign(entity, dto)` — mass assignment vulnerability

```typescript
// admin.service.ts:142
Object.assign(user, updateUserDto);
return this.userRepository.save(user);

// company.service.ts:194
Object.assign(employee, updateEmployeeDto);
```

**Problem**: Mimo że `ValidationPipe` z `whitelist: true` ogranicza DTO, `Object.assign` nie rozróżnia między polami które mogą być aktualizowane a polami chronionymi. Jeśli DTO kiedykolwiek rozszerzy się o pole z tym samym kluczem co chronione pole entity (np. `role`, `companyId`), dojdzie do eskalacji uprawnień.

**Rekomendacja**: Używaj explicit field mapping zamiast `Object.assign`:

```typescript
user.firstName = dto.firstName ?? user.firstName;
user.lastName = dto.lastName ?? user.lastName;
```

**Dotyczy plików (25+ wystąpień)**:

- `apps/api/src/admin/services/admin.service.ts` (×3)
- `apps/api/src/company/services/company.service.ts` (×2)
- `apps/api/src/email-config/services/email-config.service.ts` (×3)
- `apps/api/src/modules/modules.service.ts`
- `libs/modules/clients/src/lib/services/clients.service.ts` (×2)
- `libs/modules/clients/src/lib/services/client-icons.service.ts`
- `libs/modules/clients/src/lib/services/custom-fields.service.ts`
- `libs/modules/clients/src/lib/services/export.service.ts`
- `libs/modules/clients/src/lib/services/notification-settings.service.ts`
- `libs/modules/tasks/src/lib/services/tasks.service.ts`
- `libs/modules/tasks/src/lib/services/task-labels.service.ts`
- `libs/modules/documents/src/lib/services/document-templates.service.ts`
- `libs/modules/time-tracking/src/lib/services/time-entries.service.ts` (×2)
- `libs/modules/email-client/src/lib/services/email-auto-reply-template.service.ts`
- `libs/modules/email-client/src/lib/services/email-draft.service.ts`
- `libs/modules/email-client/src/lib/services/email-draft-sync.service.ts`
- `libs/modules/notifications/src/lib/services/notification-settings.service.ts`
- `libs/modules/offers/src/lib/services/docx-generation.service.ts`

#### 3. Admin `updateUser` — brak ochrony przed self-demotion

```typescript
// admin.service.ts
async updateUser(id: string, updateUserDto: UpdateUserDto) {
  const user = await this.findUserById(id);
  // ... no check if admin is modifying themselves
  Object.assign(user, updateUserDto);
  return this.userRepository.save(user);
}
```

**Problem**: Admin może zdegradować sam siebie lub zmienić swoją `companyId`, co może zablokować dostęp do systemu.

**Dotyczy pliku**: `apps/api/src/admin/services/admin.service.ts`

---

### 🟡 WAŻNE (Code Quality / Maintainability)

#### 4. Masywna duplikacja route definitions (~700 linii × 3)

```typescript
// routes.tsx — 850+ linii
function adminRouteGroup() { ... }          // ~250 linii routów
function companyOwnerRouteGroup() { ... }   // ~250 linii (prawie identyczne!)
function moduleRouteGroup() { ... }         // ~200 linii (subset powyższych)
```

**Problem**: Routes dla admin, company owner i employee są niemal identyczne. Zmiana w jednym module wymaga edycji w 3 miejscach. Każde z nich to ~250 linii JSX.

**Rekomendacja**: Wyciągnij definicję routów modułowych do wspólnej konfiguracji:

```typescript
const MODULE_ROUTES = [
  { path: 'tasks', dashboard: TasksDashboardPage, list: TasksListPage, ... },
  { path: 'clients', ... },
];
// Generuj route groups dynamicznie per rola
```

**Dotyczy pliku**: `apps/web/src/app/routes.tsx`

#### 5. Brak DTOs na return types w wielu service methods

```typescript
// admin.service.ts
findAllUsers() { return this.userRepository.find({ ... }); } // Returns User[] z hashem hasła!
findAllCompanies() { return this.companyRepository.find({ ... }); }
```

**Problem**: Metody serwisowe zwracają surowe entities bezpośrednio. Choć `ClassSerializerInterceptor` + `@Exclude()` na `password` chroni przed wyciekiem hasła, brakuje dedykowanych response DTOs. To polega na dekoratorze `@Exclude()` jako jedynej warstwie ochrony — kruchej i łatwej do pominięcia przy nowych polach.

**Dotyczy plików**:

- `apps/api/src/admin/services/admin.service.ts`
- `apps/api/src/company/services/company.service.ts`

#### 6. Inconsistent error messages (PL/EN mix)

```typescript
// admin.service.ts (PL)
throw new BadRequestException('companyId jest wymagane dla roli EMPLOYEE');
throw new BadRequestException('Nie można usunąć firmy System Admin');

// clients.controller.ts (EN)
return { message: 'Client deleted successfully' };

// auth.controller.ts (PL)
return { message: 'Wylogowano pomyślnie' };
```

**Rekomendacja**: Scentralizuj wszystkie komunikaty w `ErrorMessages` const (który już istnieje w `libs/common/src/lib/constants/error-messages.ts`, ale nie jest używany konsekwentnie).

**Dotyczy plików**: rozproszony problem w wielu serwisach i kontrolerach

#### 7. RBACService — duplikacja DB queries bez bulk optimization

```typescript
// rbac.service.ts — canAccessModule() robi 3 osobne queries:
const user = await this.userRepository.findOne(...);
const module = await this.moduleRepository.findOne(...);
const companyAccess = await this.companyModuleAccessRepository.findOne(...);
```

**Problem**: Moduł cache ma TTL 5min, ale user i company access nie są cachowane. Dla każdego requestu z guardem RBAC robi 2-3 DB queries.

**Rekomendacja**: Użyj single JOIN query lub rozszerz caching.

**Dotyczy pliku**: `libs/rbac/src/lib/services/rbac.service.ts`

#### 8. Company entity — zbyt wiele odpowiedzialności

```typescript
export class Company {
  // Core fields (OK)
  name, ownerId, isSystemCompany, isActive

  // Address fields (should be value object)
  street, city, postalCode, country, buildingNumber, apartmentNumber

  // Owner details (duplicated from User?)
  ownerName, ownerFirstName, ownerLastName, ownerEmail, ownerPhone

  // AI relations (10 relations!)
  aiConfigurations, aiConversations, aiContexts, tokenUsages, tokenLimits

  // Email & Documents
  defaultEmailSignature, defaultDocumentFooter
  emailConfig
}
```

**Problem**: Company entity ma ~30+ kolumn i 10+ relacji. Dane adresowe i owner details powinny być value objects lub osobnymi tabelami.

**Dotyczy pliku**: `libs/common/src/lib/entities/company.entity.ts`

---

### 🔵 DROBNE (Best Practices)

#### 9. Dynamic `require()` w TypeScript module

```typescript
// app.module.ts
const { DemoDataSeedersModule } = require('../seeders/demo-data-seeders.module');
```

**Problem**: Dynamic `require` w TypeScript module — działa, ale przerywa tree-shaking i type checking.

**Dotyczy pliku**: `apps/api/src/app/app.module.ts`

#### 10. Frontend API client — hardkodowany timeout

```typescript
const apiClient = axios.create({
  timeout: 30000, // comment says AI endpoints override
});
```

**Rekomendacja**: Wyciągnij do konfiguracji lub per-module client.

**Dotyczy pliku**: `apps/web/src/lib/api/client.ts`

#### 11. Missing pagination max limit guard

```typescript
// clients.service.ts
const { page, limit, skip } = calculatePagination(filters);
```

**Rekomendacja**: Sprawdź czy `calculatePagination` ma max limit (np. 1000) żeby zapobiec `?limit=999999`.

**Dotyczy pliku**: `libs/modules/clients/src/lib/services/clients.service.ts` (i inne serwisy z paginacją)

#### 12. Test coverage — brak mierzenia

- 217 plików testowych vs ~140k linii kodu = solidna baza, ale brak widocznego `coverage` reportu w CI.
- Warto dodać coverage threshold w konfiguracji testów.

---

## 📊 PODSUMOWANIE OCEN

| Obszar             | Ocena      | Komentarz                                                         |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| **Architektura**   | ⭐⭐⭐⭐⭐ | Doskonała modularność Nx, clean boundaries, RBAC                  |
| **Bezpieczeństwo** | ⭐⭐⭐⭐   | Solidne fundamenty, ale `Object.assign` mass assignment to ryzyko |
| **Code Quality**   | ⭐⭐⭐⭐   | Czytelny, dobrze udokumentowany, ale route duplikacja i PL/EN mix |
| **Database**       | ⭐⭐⭐⭐⭐ | Migrations, indexy, pessimistic locking, no synchronize           |
| **Frontend**       | ⭐⭐⭐⭐   | Dobrze zoptymalizowany auth, ale massive route file               |
| **Testing**        | ⭐⭐⭐     | 217 plików to OK, ale warto zmierzyć faktyczny coverage           |
| **DevOps**         | ⭐⭐⭐⭐   | Railway deploy, Dockerfile, env validation, Sentry                |

**Ogólna ocena: 4/5** — Bardzo solidny, produkcyjnie gotowy projekt z kilkoma istotnymi punktami do poprawy (głównie `Object.assign` mass assignment i route duplikacja).

---

## 🎯 PRIORYTET NAPRAW

1. 🔴 **Object.assign → explicit mapping** (25+ miejsc) — najwyższy priorytet security
2. 🔴 **Audyt historii git** pod kątem wycieków sekretów
3. 🔴 **Self-demotion guard** w admin updateUser
4. 🟡 **Route refactor** — DRY principle, ~700 linii do usunięcia
5. 🟡 **Centralizacja error messages** — spójność PL/EN
6. 🟡 **Response DTOs** dla admin/company service methods
7. 🔵 **RBAC query optimization** — single JOIN lub extended cache
8. 🔵 **Coverage reporting** — dodać do CI
