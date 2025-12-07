export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
}

export const CustomFieldTypeLabels: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};
