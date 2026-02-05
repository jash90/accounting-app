import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './entities/company.entity';
import { EncryptionService } from './services/encryption.service';
import { SystemCompanyService } from './services/system-company.service';
import { TenantService } from './services/tenant.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [EncryptionService, TenantService, SystemCompanyService],
  exports: [EncryptionService, TenantService, SystemCompanyService, TypeOrmModule],
})
export class CommonModule {}
