import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './entities/company.entity';
import { EncryptionService } from './services/encryption.service';
import { SystemCompanyService } from './services/system-company.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [EncryptionService, SystemCompanyService],
  exports: [EncryptionService, SystemCompanyService, TypeOrmModule],
})
export class CommonModule {}
