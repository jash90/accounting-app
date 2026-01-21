import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, Company } from '@accounting/common';
import { EmailModule } from '@accounting/email';
import { RBACModule } from '@accounting/rbac';

import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company]), RBACModule, EmailModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
