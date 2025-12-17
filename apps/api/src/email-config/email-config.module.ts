import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfiguration } from '@accounting/common';
import { EmailConfigController } from './controllers/email-config.controller';
import { EmailConfigService } from './services/email-config.service';
import { EncryptionService } from './services/encryption.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfiguration]), RBACModule],
  controllers: [EmailConfigController],
  providers: [EmailConfigService, EncryptionService],
  exports: [EmailConfigService, EncryptionService],
})
export class EmailConfigModule {}
