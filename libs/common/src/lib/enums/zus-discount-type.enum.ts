/**
 * Types of ZUS discounts/reliefs for entrepreneurs
 * Typy ulg ZUS dla przedsiębiorców
 */
export enum ZusDiscountType {
  /** Pełny ZUS - 60% prognozowanego przeciętnego wynagrodzenia */
  NONE = 'NONE',
  /** Ulga na start - 6 miesięcy bez składek społecznych, tylko zdrowotna */
  STARTUP_RELIEF = 'STARTUP_RELIEF',
  /** Mały ZUS - 24 miesiące, 30% minimalnego wynagrodzenia */
  SMALL_ZUS = 'SMALL_ZUS',
  /** Mały ZUS Plus - 36 miesięcy w 60-miesięcznym oknie, podstawa od dochodu */
  SMALL_ZUS_PLUS = 'SMALL_ZUS_PLUS',
}

export const ZusDiscountTypeLabels: Record<ZusDiscountType, string> = {
  [ZusDiscountType.NONE]: 'Pełny ZUS',
  [ZusDiscountType.STARTUP_RELIEF]: 'Ulga na start',
  [ZusDiscountType.SMALL_ZUS]: 'Mały ZUS',
  [ZusDiscountType.SMALL_ZUS_PLUS]: 'Mały ZUS Plus',
};

export const ZusDiscountTypeDescriptions: Record<ZusDiscountType, string> = {
  [ZusDiscountType.NONE]:
    'Pełne składki społeczne od 60% prognozowanego przeciętnego wynagrodzenia',
  [ZusDiscountType.STARTUP_RELIEF]: '6 miesięcy bez składek społecznych, tylko składka zdrowotna',
  [ZusDiscountType.SMALL_ZUS]:
    '24 miesiące preferencyjnych składek od 30% minimalnego wynagrodzenia',
  [ZusDiscountType.SMALL_ZUS_PLUS]:
    '36 miesięcy w 60-miesięcznym oknie, podstawa zależna od dochodu',
};

/**
 * Duration of each discount type in months (null = unlimited)
 * Czas trwania ulgi w miesiącach
 */
export const ZusDiscountTypeDurations: Record<ZusDiscountType, number | null> = {
  [ZusDiscountType.NONE]: null,
  [ZusDiscountType.STARTUP_RELIEF]: 6,
  [ZusDiscountType.SMALL_ZUS]: 24,
  [ZusDiscountType.SMALL_ZUS_PLUS]: 36,
};
