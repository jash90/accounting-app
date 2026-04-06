/**
 * Centralized error messages for consistent user-facing communication.
 * Language: Polish (primary language of the application).
 *
 * Usage:
 *   throw new ForbiddenException(ErrorMessages.FORBIDDEN.NO_PERMISSION);
 *   throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Klient', id));
 */
export const ErrorMessages = {
  // === Authentication ===
  AUTH: {
    INVALID_CREDENTIALS: 'Nieprawidłowe dane logowania',
    ACCOUNT_INACTIVE: 'Konto użytkownika jest nieaktywne',
    USER_NOT_FOUND: 'Użytkownik nie został znaleziony',
    EMAIL_EXISTS: 'Użytkownik z tym adresem email już istnieje',
    INVALID_REFRESH_TOKEN: 'Nieprawidłowy lub wygasły token odświeżania',
    COMPANY_ID_REQUIRED: 'ID firmy jest wymagane dla roli COMPANY_OWNER i EMPLOYEE',
    COMPANY_NOT_FOUND: 'Firma nie została znaleziona',
    CURRENT_PASSWORD_INCORRECT: 'Aktualne hasło jest nieprawidłowe',
    PASSWORD_CHANGED: 'Hasło zostało zmienione pomyślnie',
  },

  // === Authorization ===
  FORBIDDEN: {
    NO_PERMISSION: 'Nie masz uprawnień do wykonania tej operacji',
    NOT_AUTHENTICATED: 'Użytkownik nie jest zalogowany',
    MODULE_ACCESS_DENIED: (module: string) => `Brak dostępu do modułu: ${module}`,
    MODULE_NOT_FOUND: (module: string) => `Moduł nie został znaleziony: ${module}`,
    OWNER_OR_ADMIN_ONLY: 'Operacja dostępna tylko dla właściciela firmy lub administratora',
    COMPANY_MISMATCH: 'Zasób należy do innej firmy',
  },

  // === Not Found (generic helper) ===
  NOT_FOUND: {
    entity: (entityName: string, id?: string) =>
      id ? `${entityName} o ID ${id} nie został znaleziony` : `${entityName} nie został znaleziony`,
    CLIENT: 'Klient nie został znaleziony',
    TASK: 'Zadanie nie zostało znalezione',
    TIME_ENTRY: 'Wpis czasu nie został znaleziony',
    OFFER: 'Oferta nie została znaleziona',
    SETTLEMENT: 'Rozliczenie nie zostało znalezione',
    TEMPLATE: 'Szablon nie został znaleziony',
    NOTIFICATION: 'Powiadomienie nie zostało znalezione',
    ICON: 'Ikona nie została znaleziona',
    FIELD_DEFINITION: 'Definicja pola nie została znaleziona',
    LEAD: 'Lead nie został znaleziony',
    CONFIGURATION: 'Konfiguracja nie została znaleziona',
  },

  // === Validation ===
  VALIDATION: {
    FILE_REQUIRED: 'Plik jest wymagany',
    FILE_TOO_LARGE: (maxMb: number) => `Plik jest za duży. Maksymalny rozmiar: ${maxMb}MB`,
    INVALID_FILE_TYPE: (allowed: string) => `Niedozwolony typ pliku. Dozwolone: ${allowed}`,
    INVALID_UUID: 'Nieprawidłowy format identyfikatora',
    FIELD_REQUIRED: (field: string) => `Pole "${field}" jest wymagane`,
    DUPLICATE_NAME: (name: string) => `Nazwa "${name}" już istnieje`,
  },

  // === Time Tracking ===
  TIME_TRACKING: {
    TIMER_ALREADY_RUNNING: 'Timer jest już uruchomiony',
    TIMER_NOT_RUNNING: 'Timer nie jest uruchomiony',
    ENTRY_LOCKED: 'Wpis czasu jest zablokowany i nie może być edytowany',
    ENTRY_OVERLAP: 'Wpis czasu nakłada się z istniejącym wpisem',
    INVALID_STATUS_TRANSITION: 'Nieprawidłowa zmiana statusu wpisu czasu',
    CANNOT_MANAGE_ENTRIES: 'Nie masz uprawnień do zarządzania wpisami czasu',
    TASK_AND_SETTLEMENT_EXCLUSIVE:
      'Wpis czasu nie może być jednocześnie przypisany do zadania i rozliczenia.',
    CLIENT_NOT_IN_COMPANY: 'Klient nie należy do tej firmy lub nie istnieje',
    TASK_NOT_IN_COMPANY: 'Zadanie nie należy do tej firmy lub nie istnieje',
    SETTLEMENT_NOT_IN_COMPANY: 'Rozliczenie nie należy do tej firmy lub nie istnieje',
  },

  // === Tasks ===
  TASKS: {
    INVALID_STATUS_TRANSITION: (from: string, to: string) =>
      `Nie można zmienić statusu z "${from}" na "${to}"`,
    CIRCULAR_DEPENDENCY: 'Wykryto cykliczną zależność między zadaniami',
    USER_NOT_IN_COMPANY: 'Użytkownik nie należy do tej firmy lub nie istnieje',
  },

  // === Clients ===
  CLIENTS: {
    DELETED_SUCCESSFULLY: 'Klient został usunięty pomyślnie',
    RESTORED_SUCCESSFULLY: 'Klient został przywrócony pomyślnie',
    DUPLICATE_NIP: 'Klient z tym NIPem już istnieje',
  },

  // === RBAC ===
  RBAC: {
    GRANTER_NOT_FOUND: 'Użytkownik przyznający uprawnienia nie został znaleziony',
    TARGET_NOT_FOUND: 'Użytkownik docelowy nie został znaleziony',
    MODULE_NOT_FOUND: 'Moduł nie został znaleziony',
    COMPANY_NO_MODULE_ACCESS: 'Firma nie ma dostępu do tego modułu',
    CROSS_COMPANY_GRANT: 'Nie można nadawać uprawnień użytkownikom spoza Twojej firmy',
    CROSS_COMPANY_REVOKE: 'Nie można odbierać uprawnień użytkownikom spoza Twojej firmy',
    INSUFFICIENT_PERMISSIONS: 'Niewystarczające uprawnienia do wykonania tej operacji',
  },

  // === Admin ===
  ADMIN: {
    CANNOT_SELF_DEMOTE: 'Nie można zmienić własnej roli administratora',
    CANNOT_SELF_DEACTIVATE: 'Nie można dezaktywować własnego konta administratora',
    COMPANY_ID_REQUIRED_FOR_EMPLOYEE: 'ID firmy jest wymagane dla roli EMPLOYEE',
    COMPANY_NAME_REQUIRED_FOR_OWNER: 'Nazwa firmy jest wymagana dla roli COMPANY_OWNER',
    OWNER_MUST_BE_COMPANY_OWNER: 'Właściciel musi mieć rolę COMPANY_OWNER',
    OWNER_ALREADY_ASSIGNED: 'Ten właściciel jest już przypisany do innej firmy',
    CANNOT_DELETE_SYSTEM_COMPANY: 'Nie można usunąć firmy System Admin',
  },

  // === Email ===
  EMAIL: {
    SEND_FAILED: 'Nie udało się wysłać emaila',
    USER_MUST_BELONG_TO_COMPANY: 'Użytkownik musi należeć do firmy',
    COMPANY_CONFIG_MISSING: 'Brak konfiguracji email dla firmy. Skonfiguruj email firmy.',
  },

  // === Email Config ===
  EMAIL_CONFIG: {
    NOT_FOUND: 'Konfiguracja email nie została znaleziona',
    COMPANY_NOT_FOUND: 'Konfiguracja email firmy nie została znaleziona',
    SYSTEM_NOT_FOUND: 'Konfiguracja email System Admin nie została znaleziona',
    USER_ALREADY_EXISTS: 'Użytkownik posiada już konfigurację email',
    COMPANY_ALREADY_EXISTS: 'Firma posiada już konfigurację email',
    SYSTEM_ALREADY_EXISTS: 'System Admin posiada już konfigurację email',
  },

  // === Modules ===
  MODULES: {
    NOT_FOUND_BY_SLUG: (slug: string) =>
      `Moduł '${slug}' nie został znaleziony lub jest nieaktywny`,
    SLUG_EXISTS: 'Moduł o tym identyfikatorze już istnieje',
    NO_ACCESS: 'Nie masz dostępu do tego modułu',
    NOT_AVAILABLE: 'Moduł nie jest dostępny dla Twojej firmy',
    ADMIN_ONLY: 'Operacja dostępna tylko dla administratorów',
    OWNER_ONLY: 'Operacja dostępna tylko dla właścicieli firm',
    OWNER_MUST_BELONG_TO_COMPANY: 'Właściciel firmy musi być przypisany do firmy',
    PERMISSIONS_REQUIRED: 'Tablica uprawnień jest wymagana dla dostępu pracownika',
    DISCOVERY_NOT_AVAILABLE: 'Usługa odkrywania modułów jest niedostępna',
  },

  // === Documents & Templates ===
  DOCUMENTS: {
    TEMPLATE_NO_FILE: 'Szablon nie ma przypisanego pliku',
    TEMPLATE_MUST_BE_DOCX: 'Szablon musi być plikiem .docx',
  },

  // === Offers ===
  OFFERS: {
    MUST_HAVE_CLIENT_OR_LEAD: 'Oferta musi mieć przypisanego klienta lub prospekt',
    MUST_HAVE_ITEMS: 'Oferta musi zawierać co najmniej jedną pozycję',
  },

  // === Settlements ===
  SETTLEMENTS: {
    CLIENT_NO_EMAIL: 'Klient nie ma adresu email',
    COMPANY_EMAIL_CONFIG_MISSING: 'Brak konfiguracji email dla firmy',
  },

  // === Success Messages ===
  SUCCESS: {
    LOGOUT: 'Wylogowano pomyślnie',
    DELETED: 'Usunięto pomyślnie',
    RESTORED: 'Przywrócono pomyślnie',
    UPDATED: 'Zaktualizowano pomyślnie',
  },

  // === Generic ===
  GENERIC: {
    INTERNAL_ERROR: 'Wystąpił błąd wewnętrzny. Spróbuj ponownie później.',
    OPERATION_SUCCEEDED: 'Operacja zakończona pomyślnie',
    BULK_OPERATION_PARTIAL: (success: number, failed: number) =>
      `Zakończono: ${success} sukces, ${failed} błędów`,
  },
} as const;
