/**
 * Status of ZUS contribution payment
 * Status płatności składki ZUS
 */
export enum ZusContributionStatus {
  /** Wersja robocza - nie obliczono jeszcze składek */
  DRAFT = 'DRAFT',
  /** Obliczono - składki zostały obliczone */
  CALCULATED = 'CALCULATED',
  /** Opłacone - składki zostały opłacone */
  PAID = 'PAID',
  /** Przeterminowane - termin płatności minął */
  OVERDUE = 'OVERDUE',
}

export const ZusContributionStatusLabels: Record<ZusContributionStatus, string> = {
  [ZusContributionStatus.DRAFT]: 'Wersja robocza',
  [ZusContributionStatus.CALCULATED]: 'Obliczono',
  [ZusContributionStatus.PAID]: 'Opłacone',
  [ZusContributionStatus.OVERDUE]: 'Przeterminowane',
};

export const ZusContributionStatusColors: Record<ZusContributionStatus, string> = {
  [ZusContributionStatus.DRAFT]: 'slate',
  [ZusContributionStatus.CALCULATED]: 'blue',
  [ZusContributionStatus.PAID]: 'green',
  [ZusContributionStatus.OVERDUE]: 'red',
};
