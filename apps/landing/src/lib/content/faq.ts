export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: 'Czy mogę wypróbować AppTax za darmo?',
    answer:
      'Tak! Oferujemy 14-dniowy okres próbny ze wszystkimi funkcjami planu Professional. Nie wymagamy karty kredytowej — wystarczy się zarejestrować i od razu możesz korzystać z platformy.',
  },
  {
    question: 'Jak AppTax dba o bezpieczeństwo danych?',
    answer:
      'Wszystkie dane są szyfrowane w transmisji (TLS 1.3) i w spoczynku (AES-256). Regularnie przeprowadzamy audyty bezpieczeństwa, a platforma jest w pełni zgodna z RODO. Dane przechowujemy na serwerach w Unii Europejskiej.',
  },
  {
    question: 'Jakie możliwości ma asystent AI?',
    answer:
      'Asystent AI oparty na Claude i OpenAI pomaga w analizie danych klientów, generowaniu dokumentów, odpowiadaniu na pytania dotyczące przepisów i automatycznym tworzeniu treści. Możesz dostosować kontekst AI do specyfiki swojego biura.',
  },
  {
    question: 'Czy mogę przenieść dane z innego systemu?',
    answer:
      'Tak, oferujemy import danych z plików CSV i Excel. Nasz zespół wsparcia może pomóc w migracji danych z popularnych systemów księgowych używanych w Polsce.',
  },
  {
    question: 'Ile osób może korzystać z jednego konta?',
    answer:
      'Każdy plan pozwala na dodawanie wielu pracowników. System RBAC (Role-Based Access Control) umożliwia precyzyjne zarządzanie uprawnieniami — właściciel firmy, pracownik i administrator mają różne poziomy dostępu.',
  },
  {
    question: 'Jak wygląda wsparcie techniczne?',
    answer:
      'Plan Starter obejmuje wsparcie email. Plan Professional oferuje priorytetowe wsparcie z czasem odpowiedzi do 4 godzin. Klienci Enterprise otrzymują dedykowanego opiekuna i wsparcie telefoniczne.',
  },
];
