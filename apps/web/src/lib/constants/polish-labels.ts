import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
  IconType,
  ConditionOperator,
  CustomFieldType,
} from '@/types/enums';

// Employment Type Labels
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'Działalność gospodarcza',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG + 1/2 etatu (poniżej min.)',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG + 1/2 etatu (powyżej min.)',
};

// VAT Status Labels
export const VatStatusLabels: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT miesięczny',
  [VatStatus.VAT_QUARTERLY]: 'VAT kwartalny',
  [VatStatus.NO]: 'Brak VAT',
  [VatStatus.NO_WATCH_LIMIT]: 'Brak VAT (pilnowanie limitu)',
};

// Tax Scheme Labels
export const TaxSchemeLabels: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Zasady ogólne',
};

// ZUS Status Labels
export const ZusStatusLabels: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny ZUS',
  [ZusStatus.PREFERENTIAL]: 'ZUS preferencyjny',
  [ZusStatus.NONE]: 'Brak ZUS',
};

// AML Group Labels
export const AmlGroupLabels: Record<AmlGroup, string> = {
  [AmlGroup.LOW]: 'Niskie ryzyko',
  [AmlGroup.STANDARD]: 'Standardowe ryzyko',
  [AmlGroup.ELEVATED]: 'Podwyższone ryzyko',
  [AmlGroup.HIGH]: 'Wysokie ryzyko',
};

// Icon Type Labels
export const IconTypeLabels: Record<IconType, string> = {
  [IconType.LUCIDE]: 'Ikona Lucide',
  [IconType.CUSTOM]: 'Własna grafika',
  [IconType.EMOJI]: 'Emoji',
};

// Custom Field Type Labels
export const CustomFieldTypeLabels: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};

// Condition Operator Labels
export const ConditionOperatorLabels: Record<ConditionOperator, string> = {
  equals: 'równe',
  notEquals: 'różne od',
  contains: 'zawiera',
  notContains: 'nie zawiera',
  greaterThan: 'większe niż',
  lessThan: 'mniejsze niż',
  greaterThanOrEqual: 'większe lub równe',
  lessThanOrEqual: 'mniejsze lub równe',
  isEmpty: 'jest puste',
  isNotEmpty: 'nie jest puste',
  in: 'znajduje się w',
  notIn: 'nie znajduje się w',
  between: 'pomiędzy',
};

// GTU Codes with Polish Labels
export const GTU_CODES = [
  { code: 'GTU_01', label: 'GTU_01 - Napoje alkoholowe' },
  { code: 'GTU_02', label: 'GTU_02 - Paliwa i oleje napędowe' },
  { code: 'GTU_03', label: 'GTU_03 - Oleje opałowe i smary' },
  { code: 'GTU_04', label: 'GTU_04 - Wyroby tytoniowe, susz, płyny do e-papierosów' },
  { code: 'GTU_05', label: 'GTU_05 - Odpady (złom, surowce wtórne)' },
  { code: 'GTU_06', label: 'GTU_06 - Urządzenia elektroniczne (telefony, laptopy, konsole)' },
  { code: 'GTU_07', label: 'GTU_07 - Pojazdy i części samochodowe' },
  { code: 'GTU_08', label: 'GTU_08 - Metale szlachetne i jubilerstwo' },
  { code: 'GTU_09', label: 'GTU_09 - Leki i wyroby medyczne' },
  { code: 'GTU_10', label: 'GTU_10 - Budynki, budowle i grunty' },
  { code: 'GTU_11', label: 'GTU_11 - Przenoszenie uprawnień do emisji gazów cieplarnianych' },
  { code: 'GTU_12', label: 'GTU_12 - Usługi niematerialne (doradcze, księgowe, prawne, marketingowe)' },
  { code: 'GTU_13', label: 'GTU_13 - Usługi transportowe i magazynowe' },
] as const;

export type GtuCode = typeof GTU_CODES[number]['code'];

// Client field labels for condition builder
export const ClientFieldLabels: Record<string, string> = {
  name: 'Nazwa klienta',
  nip: 'NIP',
  email: 'Email',
  phone: 'Telefon',
  companyStartDate: 'Data założenia firmy',
  cooperationStartDate: 'Data rozpoczęcia współpracy',
  suspensionDate: 'Data zawieszenia',
  companySpecificity: 'Specyfika firmy',
  additionalInfo: 'Dodatkowe informacje',
  gtuCodes: 'Kody GTU',
  amlGroupEnum: 'Grupa AML',
  receiveEmailCopy: 'Otrzymuje kopię email',
  employmentType: 'Forma zatrudnienia',
  vatStatus: 'Status VAT',
  taxScheme: 'Forma opodatkowania',
  zusStatus: 'Status ZUS',
  isActive: 'Aktywny',
};

// Available fields for auto-assign conditions
export const CONDITION_FIELDS = [
  { field: 'name', label: 'Nazwa klienta', type: 'string' },
  { field: 'nip', label: 'NIP', type: 'string' },
  { field: 'email', label: 'Email', type: 'string' },
  { field: 'phone', label: 'Telefon', type: 'string' },
  { field: 'employmentType', label: 'Forma zatrudnienia', type: 'enum', enumValues: Object.values(EmploymentType) },
  { field: 'vatStatus', label: 'Status VAT', type: 'enum', enumValues: Object.values(VatStatus) },
  { field: 'taxScheme', label: 'Forma opodatkowania', type: 'enum', enumValues: Object.values(TaxScheme) },
  { field: 'zusStatus', label: 'Status ZUS', type: 'enum', enumValues: Object.values(ZusStatus) },
  { field: 'amlGroupEnum', label: 'Grupa AML', type: 'enum', enumValues: Object.values(AmlGroup) },
  { field: 'gtuCodes', label: 'Kody GTU', type: 'array' },
  { field: 'receiveEmailCopy', label: 'Otrzymuje kopię email', type: 'boolean' },
  { field: 'isActive', label: 'Aktywny', type: 'boolean' },
  { field: 'companyStartDate', label: 'Data założenia firmy', type: 'date' },
  { field: 'cooperationStartDate', label: 'Data rozpoczęcia współpracy', type: 'date' },
  { field: 'suspensionDate', label: 'Data zawieszenia', type: 'date' },
] as const;

// Operators available for each field type
export const OPERATORS_BY_TYPE: Record<string, ConditionOperator[]> = {
  string: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between', 'isEmpty', 'isNotEmpty'],
  boolean: ['equals'],
  date: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between', 'isEmpty', 'isNotEmpty'],
  enum: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  array: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
};

// Logical operator labels
export const LogicalOperatorLabels = {
  and: 'ORAZ',
  or: 'LUB',
} as const;
