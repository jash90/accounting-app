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
  },

  // === Tasks ===
  TASKS: {
    INVALID_STATUS_TRANSITION: (from: string, to: string) =>
      `Nie można zmienić statusu z "${from}" na "${to}"`,
    CIRCULAR_DEPENDENCY: 'Wykryto cykliczną zależność między zadaniami',
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

  // === Generic ===
  GENERIC: {
    INTERNAL_ERROR: 'Wystąpił błąd wewnętrzny. Spróbuj ponownie później.',
    OPERATION_SUCCEEDED: 'Operacja zakończona pomyślnie',
    BULK_OPERATION_PARTIAL: (success: number, failed: number) =>
      `Zakończono: ${success} sukces, ${failed} błędów`,
  },
} as const;
