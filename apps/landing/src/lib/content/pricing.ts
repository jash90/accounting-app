export interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    description: 'Dla małych biur rachunkowych',
    price: '99',
    period: '/miesiąc',
    features: [
      'Do 50 klientów',
      'Zadania i śledzenie czasu',
      'Rozliczenia miesięczne',
      'Klient email',
      'Podstawowe raporty',
      'Wsparcie email',
    ],
    cta: 'Rozpocznij',
  },
  {
    name: 'Professional',
    description: 'Dla rozwijających się biur',
    price: '249',
    period: '/miesiąc',
    features: [
      'Do 200 klientów',
      'Wszystkie moduły',
      'Asystent AI (5000 tokenów/mies.)',
      'Szablony dokumentów',
      'Oferty i leady',
      'Priorytetowe wsparcie',
      'Eksport danych CSV',
    ],
    cta: 'Wybierz Professional',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'Dla dużych biur i korporacji',
    price: 'Indywidualny',
    period: '',
    features: [
      'Nielimitowani klienci',
      'Wszystkie moduły bez ograniczeń',
      'Asystent AI bez limitu',
      'Dedykowany opiekun',
      'SLA 99.9%',
      'Integracje API',
      'Szkolenie zespołu',
    ],
    cta: 'Skontaktuj się',
  },
];
