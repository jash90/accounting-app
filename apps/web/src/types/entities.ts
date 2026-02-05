import {
  type AmlGroup,
  type AutoAssignCondition,
  type ChangeAction,
  type CustomFieldType,
  type EmploymentType,
  type IconType,
  type TaskDependencyType,
  type TaskPriority,
  type TaskStatus,
  type TaxScheme,
  type TimeEntryStatus,
  type TimeRoundingMethod,
  type UserRole,
  type VatStatus,
  type ZusStatus,
} from './enums';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  company?: Company | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  owner?: User;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CompanyModuleAccess {
  id: string;
  companyId: string;
  moduleId: string;
  company?: Company;
  module?: Module;
  isEnabled: boolean;
  createdAt: Date;
}

export interface UserModulePermission {
  id: string;
  userId: string;
  moduleId: string;
  permissions: string[]; // read, write, delete
  grantedById: string;
  user?: User;
  module?: Module;
  createdAt: Date;
}

// Client-related entities
export interface Client {
  id: string;
  companyId: string;
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  companyStartDate?: Date;
  cooperationStartDate?: Date;
  companySpecificity?: string;
  additionalInfo?: string;
  // Legacy field (kept for backward compatibility)
  gtuCode?: string;
  // New array field for multiple GTU codes
  gtuCodes?: string[];
  // PKD code (Polska Klasyfikacja Działalności)
  pkdCode?: string;
  // Legacy field (kept for backward compatibility)
  amlGroup?: string;
  // New enum field for AML group
  amlGroupEnum?: AmlGroup;
  // Flag for receiving email copies
  receiveEmailCopy: boolean;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
  isActive: boolean;
  createdById: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
  iconAssignments?: ClientIconAssignment[];
  customFieldValues?: ClientCustomFieldValue[];
}

export interface ClientFieldDefinition {
  id: string;
  companyId: string;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  enumValues?: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientCustomFieldValue {
  id: string;
  clientId: string;
  fieldDefinitionId: string;
  value?: string;
  fieldDefinition?: ClientFieldDefinition;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientIcon {
  id: string;
  companyId: string;
  name: string;
  color?: string;
  // Icon type (lucide, custom, emoji)
  iconType: IconType;
  // Icon value (Lucide icon name or emoji character)
  iconValue?: string;
  // Tooltip text
  tooltip?: string;
  // Auto-assign condition
  autoAssignCondition?: AutoAssignCondition;
  // File fields for custom icons
  fileName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientIconAssignment {
  id: string;
  clientId: string;
  iconId: string;
  icon?: ClientIcon;
  displayOrder: number;
  isAutoAssigned: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  companyId: string;
  moduleSlug: string;
  receiveOnCreate: boolean;
  receiveOnUpdate: boolean;
  receiveOnDelete: boolean;
  isAdminCopy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChangeLog {
  id: string;
  entityType: string;
  entityId: string;
  action: ChangeAction;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  userId: string;
  companyId: string;
  createdAt: Date;
}

// Task-related entities
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  startDate?: Date;
  estimatedMinutes?: number;
  storyPoints?: number;
  acceptanceCriteria?: AcceptanceCriterion[];
  sortOrder: number;
  companyId: string;
  clientId?: string;
  client?: Client;
  assigneeId?: string;
  assignee?: User;
  createdById: string;
  createdBy?: User;
  parentTaskId?: string;
  parentTask?: Task;
  subtasks?: Task[];
  labels?: TaskLabelAssignment[];
  dependencies?: TaskDependency[];
  comments?: TaskComment[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskLabel {
  id: string;
  companyId: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskLabelAssignment {
  id: string;
  taskId: string;
  labelId: string;
  label?: TaskLabel;
  createdAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  task?: Task;
  dependsOnTaskId: string;
  dependsOnTask?: Task;
  dependencyType: TaskDependencyType;
  createdAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: User;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Time Tracking entities
export interface TimeEntry {
  id: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  isRunning: boolean;
  isBillable: boolean;
  hourlyRate?: number;
  totalAmount?: number;
  currency: string;
  status: TimeEntryStatus;
  rejectionNote?: string;
  tags?: string[];
  companyId: string;
  userId: string;
  user?: User;
  clientId?: string;
  client?: Client;
  taskId?: string;
  task?: Task;
  approvedById?: string;
  approvedBy?: User;
  approvedAt?: Date;
  submittedAt?: Date;
  billedAt?: Date;
  createdById: string;
  createdBy?: User;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSettings {
  id: string;
  companyId: string;
  roundingMethod: TimeRoundingMethod;
  roundingIntervalMinutes: number;
  defaultHourlyRate?: number;
  defaultCurrency: string;
  requireApproval: boolean;
  allowOverlappingEntries: boolean;
  workingHoursPerDay: number;
  workingHoursPerWeek: number;
  weekStartDay: number;
  allowTimerMode: boolean;
  allowManualEntry: boolean;
  autoStopTimerAfterMinutes: number;
  minimumEntryMinutes: number;
  maximumEntryMinutes: number;
  enableDailyReminder: boolean;
  dailyReminderTime?: string;
  lockEntriesAfterDays: number;
  updatedById?: string;
  updatedBy?: User;
  createdAt: Date;
  updatedAt: Date;
}
