export const KSEF_MESSAGES = {
  // Config
  CONFIG_CREATED: 'Konfiguracja KSeF została utworzona',
  CONFIG_UPDATED: 'Konfiguracja KSeF została zaktualizowana',
  CONFIG_DELETED: 'Konfiguracja KSeF została usunięta',
  CONFIG_NOT_FOUND: 'Nie znaleziono konfiguracji KSeF dla tej firmy',
  CONFIG_REQUIRED:
    'Konfiguracja KSeF jest wymagana. Skonfiguruj połączenie w ustawieniach.',

  // Connection
  CONNECTION_SUCCESS: 'Połączenie z KSeF zostało nawiązane pomyślnie',
  CONNECTION_FAILED: 'Nie udało się nawiązać połączenia z KSeF',
  CONNECTION_TIMEOUT: 'Przekroczono czas oczekiwania na odpowiedź z KSeF',

  // Auth
  AUTH_SUCCESS: 'Uwierzytelnianie w KSeF zakończone sukcesem',
  AUTH_FAILED: 'Uwierzytelnianie w KSeF nie powiodło się',
  AUTH_TOKEN_EXPIRED: 'Token dostępu KSeF wygasł',
  AUTH_TOKEN_REFRESHED: 'Token dostępu KSeF został odświeżony',

  // Session
  SESSION_OPENED: 'Sesja interaktywna KSeF została otwarta',
  SESSION_CLOSED: 'Sesja KSeF została zamknięta',
  SESSION_EXPIRED: 'Sesja KSeF wygasła',
  SESSION_ERROR: 'Błąd sesji KSeF',
  SESSION_ACTIVE_EXISTS: 'Aktywna sesja KSeF już istnieje',
  SESSION_NOT_FOUND: 'Nie znaleziono sesji KSeF',

  // Invoice
  INVOICE_CREATED: 'Faktura została utworzona',
  INVOICE_UPDATED: 'Faktura została zaktualizowana',
  INVOICE_DELETED: 'Faktura została usunięta',
  INVOICE_SUBMITTED: 'Faktura została wysłana do KSeF',
  INVOICE_ACCEPTED: 'Faktura została zaakceptowana przez KSeF',
  INVOICE_REJECTED: 'Faktura została odrzucona przez KSeF',
  INVOICE_NOT_FOUND: 'Nie znaleziono faktury',
  INVOICE_NOT_DRAFT: 'Tylko faktury w statusie szkicu mogą być edytowane',
  INVOICE_ALREADY_SUBMITTED: 'Faktura została już wysłana',
  INVOICE_XML_GENERATED: 'XML faktury został wygenerowany',

  // Batch
  BATCH_SUBMITTED: 'Faktury zostały wysłane do KSeF',
  BATCH_PARTIAL_FAILURE: 'Część faktur nie została wysłana',

  // Sync
  SYNC_STARTED: 'Synchronizacja faktur z KSeF rozpoczęta',
  SYNC_COMPLETED: 'Synchronizacja faktur z KSeF zakończona',
  SYNC_FAILED: 'Synchronizacja z KSeF nie powiodła się',

  // Errors
  ENCRYPTION_ERROR: 'Błąd szyfrowania danych KSeF',
  XML_GENERATION_ERROR: 'Błąd generowania XML faktury',
  RATE_LIMIT_EXCEEDED:
    'Przekroczono limit zapytań do KSeF. Spróbuj ponownie za chwilę.',
  NIP_REQUIRED: 'NIP firmy jest wymagany do integracji z KSeF',
} as const;
