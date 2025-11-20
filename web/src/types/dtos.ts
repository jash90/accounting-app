export { UserRole } from './enums';
import { User, Company, Module, SimpleText } from './entities';

// Auth DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: string;
}

export interface AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: UserDto;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

// User DTOs
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  companyId?: string;
  isActive?: boolean;
}

// Company DTOs
export interface CompanyDto {
  id: string;
  name: string;
  ownerId: string;
  owner?: UserDto;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyDto {
  name: string;
  ownerId: string;
}

export interface UpdateCompanyDto {
  name?: string;
  isActive?: boolean;
}

// Module DTOs
export interface ModuleDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateModuleDto {
  name: string;
  slug: string;
  description: string;
}

export interface UpdateModuleDto {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

// Employee DTOs
export interface CreateEmployeeDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateEmployeeDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

// Permission DTOs
export interface GrantModuleAccessDto {
  moduleSlug: string;
  permissions: string[];
}

export interface UpdateModulePermissionDto {
  permissions: string[];
}

export enum PermissionTargetType {
  COMPANY = 'company',
  EMPLOYEE = 'employee',
}

export interface ManageModulePermissionDto {
  targetType: PermissionTargetType;
  targetId: string;
  moduleSlug: string;
  permissions?: string[];
}

// SimpleText DTOs
export interface CreateSimpleTextDto {
  content: string;
}

export interface UpdateSimpleTextDto {
  content?: string;
}

export interface SimpleTextResponseDto {
  id: string;
  content: string;
  companyId: string;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

