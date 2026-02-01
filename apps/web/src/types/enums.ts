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
  STANDARD = 'STANDARD',
  ELEVATED = 'ELEVATED',
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
export function isConditionGroup(condition: AutoAssignCondition): condition is ConditionGroup {
  return 'logicalOperator' in condition && 'conditions' in condition;
}

// Task-related enums
export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.TODO]: 'Do zrobienia',
  [TaskStatus.IN_PROGRESS]: 'W trakcie',
  [TaskStatus.IN_REVIEW]: 'W przeglądzie',
  [TaskStatus.DONE]: 'Ukończone',
  [TaskStatus.CANCELLED]: 'Anulowane',
};

export const TaskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'bg-slate-100 text-slate-700',
  [TaskStatus.TODO]: 'bg-blue-100 text-blue-700',
  [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
  [TaskStatus.IN_REVIEW]: 'bg-purple-100 text-purple-700',
  [TaskStatus.DONE]: 'bg-green-100 text-green-700',
  [TaskStatus.CANCELLED]: 'bg-red-100 text-red-700',
};

export enum TaskPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'Pilne',
  [TaskPriority.HIGH]: 'Wysoki',
  [TaskPriority.MEDIUM]: 'Średni',
  [TaskPriority.LOW]: 'Niski',
  [TaskPriority.NONE]: 'Brak',
};

export const TaskPriorityColors: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-100 text-red-700',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-700',
  [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-700',
  [TaskPriority.LOW]: 'bg-blue-100 text-blue-700',
  [TaskPriority.NONE]: 'bg-slate-100 text-slate-700',
};

export enum TaskDependencyType {
  BLOCKS = 'blocks',
  BLOCKED_BY = 'blocked_by',
  RELATES_TO = 'relates_to',
}

export const TaskDependencyTypeLabels: Record<TaskDependencyType, string> = {
  [TaskDependencyType.BLOCKS]: 'Blokuje',
  [TaskDependencyType.BLOCKED_BY]: 'Zablokowane przez',
  [TaskDependencyType.RELATES_TO]: 'Powiązane z',
};

// Time Tracking enums
export enum TimeEntryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BILLED = 'billed',
}

export const TimeEntryStatusLabels: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: 'Wersja robocza',
  [TimeEntryStatus.SUBMITTED]: 'Wysłane',
  [TimeEntryStatus.APPROVED]: 'Zatwierdzone',
  [TimeEntryStatus.REJECTED]: 'Odrzucone',
  [TimeEntryStatus.BILLED]: 'Rozliczone',
};

export const TimeEntryStatusColors: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: 'bg-slate-100 text-slate-700',
  [TimeEntryStatus.SUBMITTED]: 'bg-blue-100 text-blue-700',
  [TimeEntryStatus.APPROVED]: 'bg-green-100 text-green-700',
  [TimeEntryStatus.REJECTED]: 'bg-red-100 text-red-700',
  [TimeEntryStatus.BILLED]: 'bg-purple-100 text-purple-700',
};

export enum TimeRoundingMethod {
  NONE = 'none',
  UP = 'up',
  DOWN = 'down',
  NEAREST = 'nearest',
}

export const TimeRoundingMethodLabels: Record<TimeRoundingMethod, string> = {
  [TimeRoundingMethod.NONE]: 'Brak zaokrąglenia',
  [TimeRoundingMethod.UP]: 'W górę',
  [TimeRoundingMethod.DOWN]: 'W dół',
  [TimeRoundingMethod.NEAREST]: 'Do najbliższego',
};

// ============================================
// ZUS Module Enums
// ============================================

export enum ZusContributionType {
  RETIREMENT = 'RETIREMENT',
  DISABILITY = 'DISABILITY',
  SICKNESS = 'SICKNESS',
  ACCIDENT = 'ACCIDENT',
  LABOR_FUND = 'LABOR_FUND',
  HEALTH = 'HEALTH',
}

export const ZusContributionTypeLabels: Record<ZusContributionType, string> = {
  [ZusContributionType.RETIREMENT]: 'Emerytalna',
  [ZusContributionType.DISABILITY]: 'Rentowa',
  [ZusContributionType.SICKNESS]: 'Chorobowa',
  [ZusContributionType.ACCIDENT]: 'Wypadkowa',
  [ZusContributionType.LABOR_FUND]: 'Fundusz Pracy',
  [ZusContributionType.HEALTH]: 'Zdrowotna',
};

export enum ZusDiscountType {
  NONE = 'NONE',
  STARTUP_RELIEF = 'STARTUP_RELIEF',
  SMALL_ZUS = 'SMALL_ZUS',
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

export enum ZusContributionStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export const ZusContributionStatusLabels: Record<ZusContributionStatus, string> = {
  [ZusContributionStatus.DRAFT]: 'Wersja robocza',
  [ZusContributionStatus.CALCULATED]: 'Obliczono',
  [ZusContributionStatus.PAID]: 'Opłacone',
  [ZusContributionStatus.OVERDUE]: 'Przeterminowane',
};

export const ZusContributionStatusColors: Record<ZusContributionStatus, string> = {
  [ZusContributionStatus.DRAFT]: 'bg-slate-100 text-slate-700',
  [ZusContributionStatus.CALCULATED]: 'bg-blue-100 text-blue-700',
  [ZusContributionStatus.PAID]: 'bg-green-100 text-green-700',
  [ZusContributionStatus.OVERDUE]: 'bg-red-100 text-red-700',
};

export enum HealthContributionType {
  SCALE = 'SCALE',
  LINEAR = 'LINEAR',
  LUMP_SUM = 'LUMP_SUM',
  TAX_CARD = 'TAX_CARD',
}

export const HealthContributionTypeLabels: Record<HealthContributionType, string> = {
  [HealthContributionType.SCALE]: 'Skala podatkowa (9%)',
  [HealthContributionType.LINEAR]: 'Podatek liniowy (4.9%)',
  [HealthContributionType.LUMP_SUM]: 'Ryczałt',
  [HealthContributionType.TAX_CARD]: 'Karta podatkowa',
};

// ============================================
// Client Employee Enums
// ============================================

export enum EmployeeContractType {
  UMOWA_O_PRACE = 'UMOWA_O_PRACE',
  UMOWA_ZLECENIE = 'UMOWA_ZLECENIE',
  UMOWA_O_DZIELO = 'UMOWA_O_DZIELO',
}

export const EmployeeContractTypeLabels: Record<EmployeeContractType, string> = {
  [EmployeeContractType.UMOWA_O_PRACE]: 'Umowa o pracę',
  [EmployeeContractType.UMOWA_ZLECENIE]: 'Umowa zlecenie',
  [EmployeeContractType.UMOWA_O_DZIELO]: 'Umowa o dzieło',
};

export const EmployeeContractTypeColors: Record<EmployeeContractType, string> = {
  [EmployeeContractType.UMOWA_O_PRACE]: 'bg-green-100 text-green-700',
  [EmployeeContractType.UMOWA_ZLECENIE]: 'bg-blue-100 text-blue-700',
  [EmployeeContractType.UMOWA_O_DZIELO]: 'bg-purple-100 text-purple-700',
};

export enum WorkplaceType {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

export const WorkplaceTypeLabels: Record<WorkplaceType, string> = {
  [WorkplaceType.OFFICE]: 'Biuro',
  [WorkplaceType.REMOTE]: 'Zdalnie',
  [WorkplaceType.HYBRID]: 'Hybrydowo',
};
