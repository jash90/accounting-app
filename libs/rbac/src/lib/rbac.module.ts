import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Company,
  CompanyModuleAccess,
  Module as ModuleEntity,
  User,
  UserModulePermission,
} from '@accounting/common';

import { ModuleAccessGuard } from './guards/module-access.guard';
import { OwnerOrAdminGuard } from './guards/owner-or-admin.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RequireCompanyGuard } from './guards/require-company.guard';
import { ModuleDiscoveryService } from './services/module-discovery.service';
import { RBACService } from './services/rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      ModuleEntity,
      CompanyModuleAccess,
      UserModulePermission,
    ]),
  ],
  providers: [
    ModuleDiscoveryService,
    RBACService,
    ModuleAccessGuard,
    PermissionGuard,
    OwnerOrAdminGuard,
    RequireCompanyGuard,
  ],
  exports: [
    ModuleDiscoveryService,
    RBACService,
    ModuleAccessGuard,
    PermissionGuard,
    OwnerOrAdminGuard,
    RequireCompanyGuard,
  ],
})
export class RBACModule {}
