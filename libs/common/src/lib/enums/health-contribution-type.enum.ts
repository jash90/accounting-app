/**
 * Types of health insurance contribution calculation methods
 * Based on taxation form (forma opodatkowania)
 * Metody obliczania składki zdrowotnej w zależności od formy opodatkowania
 */
export enum HealthContributionType {
  /** Skala podatkowa - 9% od dochodu, min. 314.96 PLN */
  SCALE = 'SCALE',
  /** Podatek liniowy - 4.9% od dochodu, min. 314.96 PLN */
  LINEAR = 'LINEAR',
  /** Ryczałt - stałe kwoty zależne od progu przychodów */
  LUMP_SUM = 'LUMP_SUM',
  /** Karta podatkowa - stała kwota 314.96 PLN */
  TAX_CARD = 'TAX_CARD',
}

export const HealthContributionTypeLabels: Record<HealthContributionType, string> = {
  [HealthContributionType.SCALE]: 'Skala podatkowa (9%)',
  [HealthContributionType.LINEAR]: 'Podatek liniowy (4.9%)',
  [HealthContributionType.LUMP_SUM]: 'Ryczałt',
  [HealthContributionType.TAX_CARD]: 'Karta podatkowa',
};

/**
 * Health contribution rates (as decimal, null = fixed amount)
 * Stawki składki zdrowotnej
 */
export const HealthContributionRates: Record<HealthContributionType, number | null> = {
  [HealthContributionType.SCALE]: 0.09,
  [HealthContributionType.LINEAR]: 0.049,
  [HealthContributionType.LUMP_SUM]: null, // Fixed amounts based on revenue thresholds
  [HealthContributionType.TAX_CARD]: null, // Fixed amount
};

/**
 * Lump sum (ryczałt) health contribution thresholds and amounts (2025)
 * Progi przychodów i kwoty składki zdrowotnej dla ryczałtu
 */
export const LumpSumHealthThresholds = {
  /** Do 60 000 PLN przychodu rocznie */
  TIER_1: {
    maxRevenue: 6000000, // in grosze (60 000 PLN)
    amount: 46166, // in grosze (461.66 PLN)
  },
  /** Od 60 001 do 300 000 PLN przychodu rocznie */
  TIER_2: {
    maxRevenue: 30000000, // in grosze (300 000 PLN)
    amount: 76943, // in grosze (769.43 PLN)
  },
  /** Powyżej 300 000 PLN przychodu rocznie */
  TIER_3: {
    maxRevenue: null, // unlimited
    amount: 138497, // in grosze (1384.97 PLN)
  },
};

/**
 * Minimum health contribution (2025) - applies to scale and linear taxation
 * Minimalna składka zdrowotna
 */
export const MINIMUM_HEALTH_CONTRIBUTION = 31496; // in grosze (314.96 PLN)
