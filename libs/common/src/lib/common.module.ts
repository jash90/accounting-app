import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';
import { TenantService } from './services/tenant.service';
import { Company } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [EncryptionService, TenantService],
  exports: [EncryptionService, TenantService],
})
export class CommonModule {}
