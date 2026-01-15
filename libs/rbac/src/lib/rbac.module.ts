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
import { ModuleAccessGuard } from './guards/module-access.guard';
import { PermissionGuard } from './guards/permission.guard';
import { OwnerOrAdminGuard } from './guards/owner-or-admin.guard';

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
  providers: [RBACService, ModuleAccessGuard, PermissionGuard, OwnerOrAdminGuard],
  exports: [RBACService, ModuleAccessGuard, PermissionGuard, OwnerOrAdminGuard],
})
export class RBACModule {}
