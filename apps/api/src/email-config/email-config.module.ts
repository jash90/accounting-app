import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company, EmailConfiguration } from '@accounting/common';
import { RBACModule } from '@accounting/rbac';

import { EmailConfigController } from './controllers/email-config.controller';
import { EmailConfigService } from './services/email-config.service';
import { EncryptionService } from './services/encryption.service';
import { SmtpImapService } from './services/smtp-imap.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfiguration, Company]), RBACModule],
  controllers: [EmailConfigController],
  providers: [EmailConfigService, EncryptionService, SmtpImapService],
  exports: [EmailConfigService, EncryptionService, SmtpImapService],
})
export class EmailConfigModule {}
