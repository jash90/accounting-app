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
}

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
};
