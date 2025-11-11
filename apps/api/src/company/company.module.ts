import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Company, Module as ModuleEntity, UserModulePermission } from '@accounting/common';
import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, ModuleEntity, UserModulePermission]),
    RBACModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

