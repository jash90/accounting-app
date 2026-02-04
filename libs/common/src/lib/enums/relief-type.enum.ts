/**
 * Enum defining types of client reliefs (ulgi).
 */
export enum ReliefType {
  /** Ulga na start - 6 months relief for new businesses */
  ULGA_NA_START = 'ULGA_NA_START',
  /** Mały ZUS - 36 months reduced ZUS contributions */
  MALY_ZUS = 'MALY_ZUS',
}

/**
 * Duration in months for each relief type.
 */
export const ReliefTypeDurationMonths: Record<ReliefType, number> = {
  [ReliefType.ULGA_NA_START]: 6,
  [ReliefType.MALY_ZUS]: 36,
};

/**
 * Human-readable labels for ReliefType enum values (Polish).
 */
export const ReliefTypeLabels: Record<ReliefType, string> = {
  [ReliefType.ULGA_NA_START]: 'Ulga na start',
  [ReliefType.MALY_ZUS]: 'Mały ZUS',
};

/**
 * Human-readable descriptions for ReliefType enum values (Polish).
 */
export const ReliefTypeDescriptions: Record<ReliefType, string> = {
  [ReliefType.ULGA_NA_START]:
    'Ulga na start dla nowych przedsiębiorców - 6 miesięcy zwolnienia ze składek ZUS',
  [ReliefType.MALY_ZUS]:
    'Mały ZUS - 36 miesięcy obniżonych składek ZUS dla przedsiębiorców o niskich przychodach',
};
