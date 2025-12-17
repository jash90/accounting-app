import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Company,
} from '@accounting/common';
import { AdminController } from './controllers/admin.controller';
import { AdminContextController } from './controllers/admin-context.controller';
import { AdminService } from './services/admin.service';
import { AdminContextService } from './services/admin-context.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company]),
    RBACModule,
  ],
  controllers: [AdminController, AdminContextController],
  providers: [AdminService, AdminContextService],
  exports: [AdminService, AdminContextService],
})
export class AdminModule {}

