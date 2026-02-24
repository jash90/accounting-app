import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailConfiguration } from '@accounting/common';
import { CommonModule, EncryptionService } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { EmailConfigController } from './controllers/email-config.controller';
import { EmailConfigService } from './services/email-config.service';
import { SmtpImapService } from './services/smtp-imap.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfiguration]), CommonModule, RBACModule],
  controllers: [EmailConfigController],
  providers: [EmailConfigService, SmtpImapService],
  exports: [EmailConfigService, EncryptionService, SmtpImapService],
})
export class EmailConfigModule {}
