import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
} from '@accounting/common';
import { RBACService } from './services/rbac.service';
import { ModuleDiscoveryService } from './services/module-discovery.service';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { PermissionGuard } from './guards/permission.guard';
import { OwnerOrAdminGuard } from './guards/owner-or-admin.guard';
import { RequireCompanyGuard } from './guards/require-company.guard';

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
