import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
} from '@accounting/common';
import { RBACModule } from '@accounting/rbac';

import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { CompanyModuleAccessService } from './services/company-module-access.service';
import { EmployeeModulePermissionsService } from './services/employee-module-permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleEntity,
      CompanyModuleAccess,
      UserModulePermission,
      User,
      Company,
    ]),
    RBACModule,
  ],
  controllers: [ModulesController],
  providers: [ModulesService, CompanyModuleAccessService, EmployeeModulePermissionsService],
  exports: [ModulesService, CompanyModuleAccessService, EmployeeModulePermissionsService],
})
export class ModulesModule {}
