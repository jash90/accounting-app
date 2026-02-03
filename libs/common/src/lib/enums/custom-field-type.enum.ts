export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  MULTISELECT = 'MULTISELECT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  /** Date range with optional reminders (7 days and 1 day before end date) */
  DATE_RANGE_WITH_REMINDER = 'DATE_RANGE_WITH_REMINDER',
}

/**
 * Human-readable labels for CustomFieldType enum values.
 * These labels are used for display purposes in the UI.
 * Note: Labels are in Polish as this is a Polish-language application.
 * For internationalization, consider moving to a dedicated i18n system.
 */
export const CustomFieldTypeLabels: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.DATETIME]: 'Data i czas',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
  [CustomFieldType.MULTISELECT]: 'Lista wielokrotnego wyboru',
  [CustomFieldType.EMAIL]: 'Email',
  [CustomFieldType.PHONE]: 'Telefon',
  [CustomFieldType.URL]: 'Adres URL',
  [CustomFieldType.DATE_RANGE_WITH_REMINDER]: 'Zakres dat z przypomnieniem',
};
