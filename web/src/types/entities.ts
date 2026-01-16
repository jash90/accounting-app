import {
  UserRole,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  CustomFieldType,
  ChangeAction,
  AmlGroup,
  IconType,
  AutoAssignCondition,
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
  suspensionDate?: Date;
  companySpecificity?: string;
  additionalInfo?: string;
  // Legacy field (kept for backward compatibility)
  gtuCode?: string;
  // New array field for multiple GTU codes
  gtuCodes?: string[];
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

