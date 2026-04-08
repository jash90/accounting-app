export interface Module {
  id: string;
  icon: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string[];
}

export const modules: Module[] = [
  {
    id: 'tasks',
    icon: 'list-checks',
    name: 'Zadania',
    shortDescription: 'Zarządzaj projektami i zadaniami z tablicą Kanban',
    description:
      'Kompleksowy system zarządzania zadaniami z tablicą Kanban, widokiem kalendarza, etykietami, szablonami zadań i automatycznym powtarzaniem.',
    features: [
      'Tablica Kanban z drag & drop',
      'Widok kalendarza i osi czasu',
      'Etykiety i priorytety',
      'Szablony zadań z powtarzaniem',
      'Statystyki i raportowanie',
      'Podzadania i zależności',
    ],
  },
  {
    id: 'time-tracking',
    icon: 'clock',
    name: 'Śledzenie czasu',
    shortDescription: 'Timer, karty czasu pracy i raporty',
    description:
      'Precyzyjne śledzenie czasu pracy z timerem, kartami czasu, raportami i integracją z rozliczeniami klientów.',
    features: [
      'Timer z jednym kliknięciem',
      'Tygodniowe i dzienne karty czasu',
      'Raporty wg klientów i projektów',
      'Zatwierdzanie wpisów czasu',
      'Eksport do CSV',
      'Zaokrąglanie czasu',
    ],
  },
  {
    id: 'clients',
    icon: 'users',
    name: 'Klienci',
    shortDescription: 'CRM dla biur rachunkowych',
    description:
      'Zarządzanie klientami biura rachunkowego z kodami PKD, niestandardowymi polami, historią zmian i powiadomieniami.',
    features: [
      'Profil klienta z kodami PKD',
      'Niestandardowe pola i ikony',
      'Historia zmian (changelog)',
      'Duplikaty i import zbiorczy',
      'Powiadomienia o zmianach',
      'Zawieszenia i ulgi',
    ],
  },
  {
    id: 'settlements',
    icon: 'calculator',
    name: 'Rozliczenia',
    shortDescription: 'Miesięczne rozliczenia klientów',
    description:
      'Zarządzanie miesięcznymi rozliczeniami klientów z przypisywaniem pracowników, komentarzami i statusami.',
    features: [
      'Miesięczny workflow rozliczeń',
      'Przypisywanie pracowników',
      'Komentarze i statusy',
      'Wysyłka email do klientów',
      'Raporty i statystyki',
      'Eksport danych',
    ],
  },
  {
    id: 'offers',
    icon: 'file-text',
    name: 'Oferty',
    shortDescription: 'Tworzenie ofert i zarządzanie prospektami',
    description:
      'System tworzenia ofert handlowych i zarządzania prospektami (leadami) z generowaniem dokumentów DOCX.',
    features: [
      'Kreator ofert',
      'Zarządzanie prospektami (leady)',
      'Szablony ofert',
      'Generowanie DOCX',
      'Pipeline sprzedażowy',
      'Statystyki konwersji',
    ],
  },
  {
    id: 'email-client',
    icon: 'mail',
    name: 'Klient email',
    shortDescription: 'Wbudowany klient email IMAP/SMTP',
    description:
      'Zintegrowany klient poczty z obsługą IMAP/SMTP, szkicami, szablonami automatycznych odpowiedzi i folderami.',
    features: [
      'Skrzynka odbiorcza IMAP',
      'Wysyłka przez SMTP',
      'Szkice i szablony',
      'Automatyczne odpowiedzi',
      'Foldery i organizacja',
      'Załączniki',
    ],
  },
  {
    id: 'documents',
    icon: 'file-code',
    name: 'Dokumenty',
    shortDescription: 'Szablony dokumentów z Handlebars',
    description:
      'Tworzenie szablonów dokumentów z dynamicznymi zmiennymi Handlebars i generowanie gotowych dokumentów.',
    features: [
      'Edytor szablonów',
      'Zmienne Handlebars',
      'Generowanie dokumentów',
      'Podgląd w czasie rzeczywistym',
      'Eksport PDF',
      'Biblioteka szablonów',
    ],
  },
  {
    id: 'ai-agent',
    icon: 'bot',
    name: 'Asystent AI',
    shortDescription: 'Inteligentny asystent wspierany przez AI',
    description:
      'Asystent AI oparty na Claude i OpenAI, który pomaga w analizie danych klientów, generowaniu dokumentów i odpowiedziach na pytania.',
    features: [
      'Chat z AI w czasie rzeczywistym',
      'Kontekst danych firmy',
      'Analiza dokumentów',
      'Generowanie treści',
      'Śledzenie zużycia tokenów',
      'Konfiguracja modeli',
    ],
  },
  {
    id: 'notifications',
    icon: 'bell',
    name: 'Powiadomienia',
    shortDescription: 'Powiadomienia w aplikacji i email',
    description:
      'System powiadomień w aplikacji i przez email z konfigurowalnymi ustawieniami dla każdego typu zdarzenia.',
    features: [
      'Powiadomienia w czasie rzeczywistym',
      'Powiadomienia email',
      'Konfiguracja per moduł',
      'Archiwum powiadomień',
      'Oznaczanie jako przeczytane',
      'Filtrowanie i wyszukiwanie',
    ],
  },
];
