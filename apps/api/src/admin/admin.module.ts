import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
} from '@accounting/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, ModuleEntity, CompanyModuleAccess]),
    RBACModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

