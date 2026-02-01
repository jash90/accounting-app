import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  ClientFieldDefinition,
  Company,
  CompanyModuleAccess,
  Module as ModuleEntity,
  User,
  UserModulePermission,
  ZusClientSettings,
} from '@accounting/common';
import { EmailModule } from '@accounting/email';
import { RBACModule } from '@accounting/rbac';

import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      ModuleEntity,
      CompanyModuleAccess,
      UserModulePermission,
      Client,
      ClientFieldDefinition,
      ZusClientSettings,
    ]),
    EmailModule,
    RBACModule,
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeedersModule {}
