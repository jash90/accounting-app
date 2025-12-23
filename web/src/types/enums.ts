export enum UserRole {
  ADMIN = 'ADMIN',
  COMPANY_OWNER = 'COMPANY_OWNER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum ModulePermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

export enum EmploymentType {
  DG = 'DG',
  DG_ETAT = 'DG_ETAT',
  DG_AKCJONARIUSZ = 'DG_AKCJONARIUSZ',
  DG_HALF_TIME_BELOW_MIN = 'DG_HALF_TIME_BELOW_MIN',
  DG_HALF_TIME_ABOVE_MIN = 'DG_HALF_TIME_ABOVE_MIN',
}

export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'DG',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 etatu poniżej min.',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 etatu powyżej min.',
};

export enum VatStatus {
  VAT_MONTHLY = 'VAT_MONTHLY',
  VAT_QUARTERLY = 'VAT_QUARTERLY',
  NO = 'NO',
  NO_WATCH_LIMIT = 'NO_WATCH_LIMIT',
}

export const VatStatusLabels: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT miesięczny',
  [VatStatus.VAT_QUARTERLY]: 'VAT kwartalny',
  [VatStatus.NO]: 'Nie',
  [VatStatus.NO_WATCH_LIMIT]: 'Nie (obserwuj limit)',
};

export enum TaxScheme {
  PIT_17 = 'PIT_17',
  PIT_19 = 'PIT_19',
  LUMP_SUM = 'LUMP_SUM',
  GENERAL = 'GENERAL',
}

export const TaxSchemeLabels: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Zasady ogólne',
};

export enum ZusStatus {
  FULL = 'FULL',
  PREFERENTIAL = 'PREFERENTIAL',
  NONE = 'NONE',
}

export const ZusStatusLabels: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny',
  [ZusStatus.PREFERENTIAL]: 'Preferencyjny',
  [ZusStatus.NONE]: 'Brak',
};

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
}

export enum ChangeAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum AmlGroup {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum IconType {
  LUCIDE = 'lucide',
  CUSTOM = 'custom',
  EMOJI = 'emoji',
}

// Condition operators for auto-assign feature
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'
  | 'notIn'
  | 'between';

export type LogicalOperator = 'and' | 'or';

export interface SingleCondition {
  id?: string; // Stable key for React rendering
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
  secondValue?: string | number;
}

export interface ConditionGroup {
  id?: string; // Stable key for React rendering
  logicalOperator: LogicalOperator;
  conditions: (SingleCondition | ConditionGroup)[];
}

export type AutoAssignCondition = SingleCondition | ConditionGroup;

// Type guard to check if condition is a group
export function isConditionGroup(
  condition: AutoAssignCondition
): condition is ConditionGroup {
  return 'logicalOperator' in condition && 'conditions' in condition;
}
