import { UserRole } from './enums';

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

export interface SimpleText {
  id: string;
  companyId: string;
  content: string;
  createdById: string;
  createdBy?: User;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

