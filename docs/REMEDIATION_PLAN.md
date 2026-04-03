# 🛠️ Plan Naprawczy — Accounting RBAC SaaS Platform

**Źródło**: [Code Review 2026-04-03](./CODE_REVIEW.md)
**Priorytet**: 🔴 Krytyczny → 🟡 Ważny → 🟢 Usprawnienie
**Szacowany czas**: ~8–12 dni roboczych (1 osoba)

---

## Spis treści

1. [Faza 1 — Krytyczne bezpieczeństwo i higiena repo (Dzień 1–2)](#faza-1)
2. [Faza 2 — Hardening backendu (Dzień 3–5)](#faza-2)
3. [Faza 3 — Dekompozycja oversized plików (Dzień 6–8)](#faza-3)
4. [Faza 4 — Frontend & DX (Dzień 9–10)](#faza-4)
5. [Faza 5 — Optymalizacje i polish (Dzień 11–12)](#faza-5)
6. [Metryki sukcesu](#metryki-sukcesu)

---

## <a id="faza-1"></a>Faza 1 — Krytyczne bezpieczeństwo i higiena repo 🔴

**Czas**: 2 dni | **Ryzyko**: Wysokie | **Review Issues**: #1, #3, #14

### 1.1 Rotacja sekretów i wzmocnienie `.env`

**Problem**: Słaby `JWT_SECRET`, jawne klucze szyfrowania w `.env`

**Akcje**:

- [ ] Wygenerować nowy `JWT_SECRET` (min. 64 znaki, `openssl rand -base64 64`)
- [ ] Wygenerować nowy `JWT_REFRESH_SECRET` (min. 64 znaki)
- [ ] Zrotować `ENCRYPTION_KEY` i `ENCRYPTION_SECRET` (z re-encryptowaniem danych w DB)
- [ ] Zrotować `AI_API_KEY_ENCRYPTION_KEY` (32+ znaków kryptograficznie losowych)
- [ ] Dodać walidację siły sekretów przy starcie aplikacji:

```typescript
// apps/api/src/common/validators/env.validator.ts
function validateSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if (process.env.NODE_ENV === 'production' && jwtSecret === 'jshdlfhalsdhflhjaslkdhfjklasjdlf') {
    throw new Error('Default JWT_SECRET cannot be used in production');
  }
}
```

**Pliki**:

- `.env` — nowe wartości
- `.env.example` — zaktualizować komentarze o minimalnej długości
- `apps/api/src/main.ts` — dodać walidację przy bootstrap

---

### 1.2 Oczyszczenie katalogu root

**Problem**: Pliki testowe, logi i screenshoty w root directory

**Akcje**:

- [ ] Usunąć pliki:
  ```bash
  rm test-jwt-separation.js
  rm test-rate-limiting.js
  rm server.log
  rm email-config-warnings.png
  rm -rf test-screenshots/
  ```
- [ ] Przenieść wartościowe testy do właściwych lokalizacji:
  ```
  test-jwt-separation.js  → test/integration/jwt-separation.test.ts
  test-rate-limiting.js   → test/integration/rate-limiting.test.ts
  ```
- [ ] Zaktualizować `.gitignore`:
  ```gitignore
  # Root-level artifacts (should never exist)
  /server.log
  /test-*.js
  *.png
  !apps/**/*.png
  ```
- [ ] Upewnić się, że `coverage/` i `test-results/` nie są trackowane (są w `.gitignore` ✅)

**Pliki do usunięcia z root**:

- `test-jwt-separation.js` (5.4 KB)
- `test-rate-limiting.js` (6.8 KB)
- `server.log` (146 KB)
- `email-config-warnings.png` (257 KB)
- `test-screenshots/` (3.3 MB screenshots)

---

### 1.3 Zabezpieczenie endpointu `/uploads`

**Problem**: Pliki w `/uploads` serwowane bez autentykacji — potencjalny wyciek danych

**Akcje**:

- [ ] Usunąć `ServeStaticModule` dla uploads z `app.module.ts`
- [ ] Zastąpić dedykowanym kontrolerem z auth guardem:

```typescript
// apps/api/src/uploads/uploads.controller.ts
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Get(':filename')
  async serveFile(
    @Param('filename') filename: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    // Walidacja: sanitize filename, sprawdź dostęp companyId
    const sanitizedName = path.basename(filename); // zapobieganie path traversal
    const filePath = path.join(process.cwd(), 'uploads', sanitizedName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // TODO: Sprawdzić czy plik należy do firmy usera
    res.sendFile(filePath);
  }
}
```

**Pliki**:

- `apps/api/src/app/app.module.ts` — usunąć `ServeStaticModule` dla uploads
- `apps/api/src/uploads/uploads.controller.ts` — NOWY
- `apps/api/src/uploads/uploads.module.ts` — NOWY

---

## <a id="faza-2"></a>Faza 2 — Hardening backendu 🔴🟡

**Czas**: 3 dni | **Review Issues**: #2, #5, #6, #7, #8

### 2.1 Migracja tokenów z localStorage na httpOnly cookies

**Problem**: Tokeny JWT w `localStorage` podatne na XSS

**Akcje**:

#### Backend:

- [ ] Dodać cookie-options utility:

  ```typescript
  // libs/auth/src/lib/utils/cookie-options.ts (rozszerzenie istniejącego)
  export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1h
    path: '/',
  };

  export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    path: '/api/auth/refresh',
  };
  ```

- [ ] Zmodyfikować `AuthController` — ustawiać cookies w `login`, `register`, `refresh`
- [ ] Zmodyfikować `JwtStrategy` — czytać token z cookie oprócz headera (dual mode na okres migracji)
- [ ] Dodać CSRF protection (double-submit cookie pattern)
- [ ] Dodać endpoint `POST /auth/logout` czyszczący cookies

#### Frontend:

- [ ] Zmodyfikować `token-storage.ts` — usunąć localStorage, opierać się na cookies
- [ ] Zmodyfikować `api-client.ts` — dodać `withCredentials: true` do axios
- [ ] Usunąć manualne zarządzanie tokenami z `auth-context.tsx`

**Pliki**:

- `libs/auth/src/lib/utils/cookie-options.ts`
- `libs/auth/src/lib/controllers/auth.controller.ts`
- `libs/auth/src/lib/strategies/jwt.strategy.ts`
- `apps/web/src/lib/auth/token-storage.ts`
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/contexts/auth-context.tsx`

**⚠️ Uwaga**: To jest breaking change — wymaga skoordynowanego deploy backend+frontend. Rozważyć dual mode (header + cookie) na okres przejściowy.

---

### 2.2 Naprawa entity registration drift

**Problem**: `EmailDraft` w `app.module.ts` ale NIE w `typeorm.config.ts` → migracje nie wykryją zmian schematu

**Akcje**:

- [ ] Dodać `EmailDraft` do `apps/api/typeorm.config.ts`
- [ ] Wyekstrahować wspólną tablicę entity do jednego pliku:

```typescript
// libs/common/src/lib/entities/entity-registry.ts
import { AIConfiguration } from './ai-configuration.entity';

// ... all imports
export const ALL_ENTITIES = [
  AIConfiguration,
  AIContext,
  AIConversation,
  AIMessage,
  // ... all entities alphabetically
  EmailDraft,
  // ...
] as const;
```

- [ ] Użyć `ALL_ENTITIES` w obu miejscach:
  - `apps/api/typeorm.config.ts`
  - `apps/api/src/app/app.module.ts`

**Pliki**:

- `libs/common/src/lib/entities/entity-registry.ts` — NOWY
- `libs/common/src/index.ts` — eksport `ALL_ENTITIES`
- `apps/api/typeorm.config.ts` — import z registry
- `apps/api/src/app/app.module.ts` — import z registry

---

### 2.3 Naprawić podwójny `ValidationPipe` i `forbidNonWhitelisted`

**Problem**: Global pipe w `main.ts` nadpisuje ten z `app.module.ts`; `forbidNonWhitelisted: false` globalnie osłabia walidację

**Akcje**:

- [ ] Usunąć `APP_PIPE` provider z `app.module.ts` (zostaje tylko `main.ts`)
- [ ] W `main.ts` przywrócić `forbidNonWhitelisted: true`
- [ ] Na endpointach wymagających dynamicznych query params użyć lokalnego pipe:
  ```typescript
  // W clients.controller.ts findAll()
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // customField_* params
  }))
  ```

**Pliki**:

- `apps/api/src/app/app.module.ts` — usunąć `APP_PIPE` provider
- `apps/api/src/main.ts` — `forbidNonWhitelisted: true`
- `libs/modules/clients/src/lib/controllers/clients.controller.ts` — lokalny pipe na `findAll()`

---

### 2.4 Zabezpieczenie CORS w produkcji

**Problem**: Requesty bez `Origin` headera omijają CORS w produkcji

**Akcje**:

- [ ] Ograniczyć no-origin requests w produkcji:
  ```typescript
  // apps/api/src/main.ts
  origin: (origin, callback) => {
    if (!origin) {
      // W produkcji: pozwalaj tylko jeśli to health check / internal
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin header required'));
      }
      return callback(null, true);
    }
    // ...rest
  };
  ```

**Pliki**:

- `apps/api/src/main.ts`

---

### 2.5 Konsolidacja języka komunikatów błędów

**Problem**: Mieszanka polskiego i angielskiego w exception messages

**Akcje**:

- [ ] Stworzyć centralne stałe komunikatów:
  ```typescript
  // libs/common/src/lib/constants/error-messages.ts
  export const ErrorMessages = {
    FORBIDDEN: {
      NO_PERMISSION: 'Nie masz uprawnień do wykonania tej operacji',
      MODULE_ACCESS_DENIED: 'Brak dostępu do modułu: {{module}}',
      NOT_AUTHENTICATED: 'Użytkownik nie jest zalogowany',
    },
    NOT_FOUND: {
      CLIENT: 'Klient nie został znaleziony',
      USER: 'Użytkownik nie został znaleziony',
      // ...
    },
    VALIDATION: {
      FILE_REQUIRED: 'Plik jest wymagany',
      // ...
    },
  } as const;
  ```
- [ ] Zastąpić wszystkie hardkodowane stringi referencjami do stałych
- [ ] Zdecydować o jednym języku (polski — bo to polski SaaS) i ujednolicić

**Pliki**:

- `libs/common/src/lib/constants/error-messages.ts` — NOWY
- `libs/common/src/lib/constants/index.ts` — eksport
- Wszystkie pliki `*.service.ts` i `*.guard.ts` z exception messages (~30 plików)

---

### 2.6 Warunkowe ładowanie DemoDataSeedersModule

**Problem**: Moduł demo seedera ładowany w produkcji — unnecessary overhead i potencjalne ryzyko

**Akcje**:

- [ ] Warunkowy import w `app.module.ts`:

  ```typescript
  const optionalModules = [];
  if (process.env.ENABLE_DEMO_SEEDER === 'true') {
    optionalModules.push(DemoDataSeedersModule);
  }

  @Module({
    imports: [
      // ...required modules
      ...optionalModules,
    ],
  })
  ```

**Pliki**:

- `apps/api/src/app/app.module.ts`

---

## <a id="faza-3"></a>Faza 3 — Dekompozycja oversized plików 🟡

**Czas**: 3 dni | **Review Issue**: #4
**Reguła architektoniczna**: max 500 linii na plik (AGENTS.md)
**Plików do refactoru**: 51

### 3.1 Backend — Serwisy (Priorytet: Wysoki)

| Plik                             | Linie | Plan dekompozycji                                                                                                                                          |
| -------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time-entries.service.ts`        | 1,084 | Wyekstrahować: `TimeTimerService` (start/stop/update timer), `TimeEntryManagementService` (approve/reject/lock), `TimeEntryQueryService` (findAll/filters) |
| `tasks.service.ts`               | 817   | Wyekstrahować: `TaskStatusService` (state machine, transitions), `TaskQueryService` (findAll/stats)                                                        |
| `email-reader.service.ts`        | 797   | Wyekstrahować: `ImapConnectionService`, `EmailParserService`                                                                                               |
| `client-changelog.service.ts`    | 783   | Wyekstrahować: `ChangelogFormatterService` (formatowanie diff)                                                                                             |
| `clients.service.ts`             | 770   | Wyekstrahować: `ClientBulkOperationsService` (bulk delete/edit/restore)                                                                                    |
| `offers.service.ts`              | 760   | Wyekstrahować: `OfferStatusService`, `OfferQueryService`                                                                                                   |
| `docx-generation.service.ts`     | 613   | OK — specificzny generator, ale można wyekstrahować `DocxStyleService`                                                                                     |
| `openrouter-provider.service.ts` | 598   | Wyekstrahować: `OpenRouterModelMapper` (model config/mapping)                                                                                              |
| `custom-fields.service.ts`       | 595   | Wyekstrahować: `CustomFieldValidationService`                                                                                                              |
| `rbac.service.ts`                | 591   | Wyekstrahować: `PermissionCacheService` (caching logic)                                                                                                    |
| `suspension.service.ts`          | 583   | Wyekstrahować: `SuspensionReminderService` (już istnieje — przenieść logikę)                                                                               |
| `email-configuration.service.ts` | 580   | Wyekstrahować: `EmailProviderDetectorService`                                                                                                              |
| `task-notification.service.ts`   | 567   | Wyekstrahować: `TaskNotificationTemplateService`                                                                                                           |
| `ai-conversation.service.ts`     | 529   | Wyekstrahować: `ConversationContextService` (RAG/context building)                                                                                         |
| `settlements.service.ts`         | 520   | Wyekstrahować: `SettlementCalculationService`                                                                                                              |

### 3.2 Backend — Kontrolery (Priorytet: Średni)

| Plik                         | Linie | Plan dekompozycji                                                                                                                                       |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clients.controller.ts`      | 975   | Wyekstrahować: `ClientBulkController`, `ClientExportController`, `ClientCustomFieldsController` — podkontrolery z tym samym prefixem `/modules/clients` |
| `icons.controller.ts`        | 615   | Wyekstrahować: `IconAssignmentController`                                                                                                               |
| `settlements.controller.ts`  | 542   | OK na razie — blisko granicy                                                                                                                            |
| `email-config.controller.ts` | 503   | OK na razie — blisko granicy                                                                                                                            |

### 3.3 Frontend — Pages (Priorytet: Wysoki)

| Plik                      | Linie | Plan dekompozycji                                                                                                            |
| ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `routes.tsx`              | 1,706 | Podzielić na: `routes/auth-routes.tsx`, `routes/admin-routes.tsx`, `routes/module-routes.tsx`, `routes/index.tsx` (composer) |
| `clients-list.tsx`        | 1,094 | Wyekstrahować: `ClientsTable`, `ClientsToolbar`, `ClientsBulkActions` jako sub-komponenty                                    |
| `admin-configuration.tsx` | 862   | Wyekstrahować: `AIModelConfig`, `AIProviderSettings`, `TokenLimitsPanel`                                                     |
| `compose.tsx`             | 652   | Wyekstrahować: `EmailEditor`, `AttachmentManager`, `RecipientSelector`                                                       |
| `offers-list.tsx`         | 640   | Wyekstrahować: `OffersTable`, `OffersFilters`                                                                                |
| `task-templates-list.tsx` | 631   | Wyekstrahować: `TemplateCard`, `TemplateFilters`                                                                             |
| `client-detail.tsx`       | 622   | Wyekstrahować: `ClientInfoPanel`, `ClientTabsSection`                                                                        |

### 3.4 Frontend — Components & Hooks (Priorytet: Średni)

| Plik                     | Linie | Plan dekompozycji                                                                                                                            |
| ------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `client-form-dialog.tsx` | 1,118 | Podzielić na: `ClientBasicInfoForm`, `ClientTaxForm`, `ClientContactForm`, `ClientFormDialog` (orchestrator)                                 |
| `use-email-client.ts`    | 885   | Podzielić na: `use-email-folders.ts`, `use-email-messages.ts`, `use-email-compose.ts`                                                        |
| `dtos.ts`                | 1,367 | Podzielić per moduł: `types/clients.ts`, `types/tasks.ts`, `types/offers.ts`, `types/settlements.ts`, `types/ai-agent.ts`, `types/common.ts` |
| `schemas.ts`             | 773   | Podzielić per moduł: `validation/client-schemas.ts`, `validation/task-schemas.ts`, ...                                                       |
| `condition-builder.tsx`  | 718   | Wyekstrahować: `ConditionRow`, `ConditionGroupBuilder`, `OperatorSelector`                                                                   |
| `offer-form-dialog.tsx`  | 679   | Wyekstrahować: `OfferBasicInfo`, `OfferContentEditor`, `OfferPreview`                                                                        |
| `client-filters.tsx`     | 662   | Wyekstrahować: `FilterGroup`, `ActiveFilterTags`                                                                                             |
| `timer-widget.tsx`       | 632   | Wyekstrahować: `TimerDisplay`, `TimerControls`, `TimerEntryForm`                                                                             |

### 3.5 Dane statyczne (Priorytet: Niski)

| Plik                          | Linie | Akcja                                                                         |
| ----------------------------- | ----- | ----------------------------------------------------------------------------- |
| `pkd-classes.ts`              | 2,761 | OK — dane referencyjne, nie logika. Opcjonalnie przenieść do JSON             |
| `demo-data-seeder.service.ts` | 1,946 | Podzielić na: `ClientSeeder`, `TaskSeeder`, `OfferSeeder`, `SettlementSeeder` |
| `prebuilt-themes.ts`          | 633   | OK — dane konfiguracyjne                                                      |

---

## <a id="faza-4"></a>Faza 4 — Frontend & DX 🟢

**Czas**: 2 dni | **Review Issues**: #11, #12

### 4.1 Per-request timeout w API Client

**Problem**: 180s timeout dla WSZYSTKICH requestów (zamiast tylko AI)

**Akcje**:

- [ ] Domyślny timeout: 30s
- [ ] AI endpoints: 180s per-request override

```typescript
// apps/web/src/lib/api/client.ts
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30s default
});

// apps/web/src/lib/api/endpoints/ai-agent.ts
export const aiAgentApi = {
  sendMessage: (data: SendMessageDto) =>
    apiClient.post('/api/modules/ai-agent/chat', data, {
      timeout: 180000, // 3 minutes for AI
    }),
};
```

**Pliki**:

- `apps/web/src/lib/api/client.ts`
- `apps/web/src/lib/api/endpoints/ai-agent.ts`

---

### 4.2 Generowanie typów DTO z OpenAPI (opcjonalne)

**Problem**: `apps/web/src/types/dtos.ts` (1,367 linii) ręcznie duplikuje backend DTOs

**Akcje**:

- [ ] Dodać `swagger-typescript-api` lub `openapi-typescript` do devDependencies
- [ ] Dodać skrypt generujący typy:
  ```json
  {
    "scripts": {
      "generate:types": "openapi-typescript http://localhost:3000/api/docs-json -o apps/web/src/types/generated-api.ts"
    }
  }
  ```
- [ ] Stopniowo migrować ręczne typy na generowane

**Pliki**:

- `package.json` — nowy skrypt
- `apps/web/src/types/generated-api.ts` — NOWY (generowany)

---

## <a id="faza-5"></a>Faza 5 — Optymalizacje performance 🟢

**Czas**: 2 dni | **Review Issues**: #9, #10

### 5.1 Dodać indeks na `TimeEntry` dla overlap queries

**Problem**: Zapytania overlap na `startTime`/`endTime` bez odpowiedniego indeksu

**Akcje**:

- [ ] Stworzyć migrację:

  ```typescript
  // AddTimeEntryOverlapIndex migration
  await queryRunner.query(`
    CREATE INDEX idx_time_entry_overlap
    ON time_entries ("companyId", "userId", "startTime", "endTime")
    WHERE "endTime" IS NOT NULL
  `);

  CREATE INDEX idx_time_entry_running
  ON time_entries ("companyId", "userId")
  WHERE "endTime" IS NULL
  ```

**Pliki**:

- `apps/api/src/migrations/XXXXXXXXX-AddTimeEntryOverlapIndex.ts` — NOWY

---

### 5.2 Dodać `select` do queries w `suspension.service.ts`

**Problem**: Pełne encje ładowane tam, gdzie potrzeba tylko kilku pól

**Akcje**:

- [ ] Audyt wszystkich `find()`/`findOne()` w serwisach
- [ ] Dodać `select` lub `QueryBuilder` z `.select()` tam, gdzie nie potrzeba pełnej encji
- [ ] Priorytet: `suspension.service.ts` (11 queries z `relations` bez `select`)

```typescript
// Przed
return this.suspensionRepository.find({
  where: { companyId },
  relations: ['client'],
});

// Po
return this.suspensionRepository.find({
  where: { companyId },
  relations: ['client'],
  select: {
    id: true,
    startDate: true,
    endDate: true,
    reason: true,
    client: { id: true, name: true },
  },
});
```

**Pliki**:

- `libs/modules/clients/src/lib/services/suspension.service.ts`
- Inne serwisy z nadmiarowym ładowaniem relacji

---

## <a id="metryki-sukcesu"></a>📊 Metryki sukcesu

### Po Fazie 1 (Dzień 2):

- [ ] Zero plików testowych/logów w root
- [ ] Endpoint `/uploads` wymaga autentykacji
- [ ] Nowe, silne sekrety w `.env` (min. 64 znaki)

### Po Fazie 2 (Dzień 5):

- [ ] Tokeny w httpOnly cookies (lub dual mode aktywny)
- [ ] `EmailDraft` zarejestrowany w `typeorm.config.ts`
- [ ] Jedno źródło prawdy dla entity (`entity-registry.ts`)
- [ ] `forbidNonWhitelisted: true` globalnie, `false` tylko lokalnie
- [ ] CORS blokuje no-origin w produkcji
- [ ] 100% komunikatów błędów w jednym języku (PL)

### Po Fazie 3 (Dzień 8):

- [ ] Zero plików >500 linii (poza `pkd-classes.ts` i `prebuilt-themes.ts`)
- [ ] Frontend `dtos.ts` podzielony per moduł
- [ ] `routes.tsx` podzielony na sub-pliki

### Po Fazie 4–5 (Dzień 12):

- [ ] Default API timeout 30s (180s tylko dla AI)
- [ ] Indeks `idx_time_entry_overlap` aktywny
- [ ] Skrypt `generate:types` generuje typy z OpenAPI

---

## 📋 Podsumowanie priorytetów

| #   | Zadanie                  | Priorytet       | Effort | Faza |
| --- | ------------------------ | --------------- | ------ | ---- |
| 1.1 | Rotacja sekretów         | 🔴 Krytyczny    | 2h     | 1    |
| 1.2 | Cleanup root directory   | 🔴 Krytyczny    | 30min  | 1    |
| 1.3 | Auth na `/uploads`       | 🔴 Krytyczny    | 4h     | 1    |
| 2.1 | httpOnly cookies         | 🔴 Krytyczny    | 2d     | 2    |
| 2.2 | Entity registry          | 🟡 Ważny        | 2h     | 2    |
| 2.3 | Fix ValidationPipe       | 🟡 Ważny        | 1h     | 2    |
| 2.4 | CORS hardening           | 🟡 Ważny        | 30min  | 2    |
| 2.5 | Konsolidacja i18n        | 🟡 Ważny        | 4h     | 2    |
| 2.6 | Warunkowy DemoSeeder     | 🟡 Ważny        | 30min  | 2    |
| 3.x | Dekompozycja plików (51) | 🟡 Ważny        | 3d     | 3    |
| 4.1 | Per-request timeout      | 🟢 Usprawnienie | 1h     | 4    |
| 4.2 | OpenAPI type generation  | 🟢 Usprawnienie | 4h     | 4    |
| 5.1 | Indeks TimeEntry         | 🟢 Usprawnienie | 1h     | 5    |
| 5.2 | Optymalizacja select     | 🟢 Usprawnienie | 3h     | 5    |
