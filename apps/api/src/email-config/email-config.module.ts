import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfiguration, Company } from '@accounting/common';
import { EmailConfigController } from './controllers/email-config.controller';
import { EmailConfigService } from './services/email-config.service';
import { EncryptionService } from './services/encryption.service';
import { SmtpImapService } from './services/smtp-imap.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfiguration, Company]), RBACModule],
  controllers: [EmailConfigController],
  providers: [EmailConfigService, EncryptionService, SmtpImapService],
  exports: [EmailConfigService, EncryptionService, SmtpImapService],
})
export class EmailConfigModule {}
