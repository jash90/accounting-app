/**
 * Types of ZUS (Social Insurance Institution) contributions
 * Typy składek ZUS
 */
export enum ZusContributionType {
  /** Składka emerytalna - 19.52% */
  RETIREMENT = 'RETIREMENT',
  /** Składka rentowa - 8% */
  DISABILITY = 'DISABILITY',
  /** Składka chorobowa - 2.45% (dobrowolna dla przedsiębiorców) */
  SICKNESS = 'SICKNESS',
  /** Składka wypadkowa - 1.67% (dla firm do 9 osób) */
  ACCIDENT = 'ACCIDENT',
  /** Fundusz Pracy - 2.45% */
  LABOR_FUND = 'LABOR_FUND',
  /** Składka zdrowotna - zmienna stawka */
  HEALTH = 'HEALTH',
}

export const ZusContributionTypeLabels: Record<ZusContributionType, string> = {
  [ZusContributionType.RETIREMENT]: 'Emerytalna',
  [ZusContributionType.DISABILITY]: 'Rentowa',
  [ZusContributionType.SICKNESS]: 'Chorobowa',
  [ZusContributionType.ACCIDENT]: 'Wypadkowa',
  [ZusContributionType.LABOR_FUND]: 'Fundusz Pracy',
  [ZusContributionType.HEALTH]: 'Zdrowotna',
};

/**
 * Standard ZUS contribution rates (as decimal)
 * Standardowe stawki składek ZUS
 */
export const ZusContributionRates: Record<ZusContributionType, number> = {
  [ZusContributionType.RETIREMENT]: 0.1952,
  [ZusContributionType.DISABILITY]: 0.08,
  [ZusContributionType.SICKNESS]: 0.0245,
  [ZusContributionType.ACCIDENT]: 0.0167,
  [ZusContributionType.LABOR_FUND]: 0.0245,
  [ZusContributionType.HEALTH]: 0.09, // Default for scale taxation
};
