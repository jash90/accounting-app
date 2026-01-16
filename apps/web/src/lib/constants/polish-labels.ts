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
  [AmlGroup.MEDIUM]: 'Średnie ryzyko',
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
  { code: 'GTU_01', label: 'GTU_01 - Dostawa napojów alkoholowych' },
  { code: 'GTU_02', label: 'GTU_02 - Dostawa towarów, o których mowa w art. 103 ust. 5aa' },
  { code: 'GTU_03', label: 'GTU_03 - Dostawa oleju opałowego' },
  { code: 'GTU_04', label: 'GTU_04 - Dostawa wyrobów tytoniowych' },
  { code: 'GTU_05', label: 'GTU_05 - Dostawa odpadów' },
  { code: 'GTU_06', label: 'GTU_06 - Dostawa urządzeń elektronicznych' },
  { code: 'GTU_07', label: 'GTU_07 - Dostawa pojazdów oraz części samochodowych' },
  { code: 'GTU_08', label: 'GTU_08 - Dostawa metali szlachetnych i nieszlachetnych' },
  { code: 'GTU_09', label: 'GTU_09 - Dostawa leków oraz wyrobów medycznych' },
  { code: 'GTU_10', label: 'GTU_10 - Dostawa budynków, budowli i gruntów' },
  { code: 'GTU_11', label: 'GTU_11 - Świadczenie usług w zakresie przenoszenia uprawnień do emisji gazów cieplarnianych' },
  { code: 'GTU_12', label: 'GTU_12 - Świadczenie usług o charakterze niematerialnym' },
  { code: 'GTU_13', label: 'GTU_13 - Świadczenie usług transportowych i gospodarki magazynowej' },
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
