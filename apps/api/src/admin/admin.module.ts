import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@accounting/auth';
import { Company, User } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company]), CommonModule, RBACModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
