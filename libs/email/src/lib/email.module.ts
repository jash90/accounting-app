import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSenderService } from './services/email-sender.service';
import { EmailReaderService } from './services/email-reader.service';
import { EmailConfigurationService } from './services/email-configuration.service';
import { EmailAutodiscoveryService } from './services/email-autodiscovery.service';
import { EmailConfigurationController } from './controllers/email-configuration.controller';
import { EmailConfiguration, CommonModule } from '@accounting/common';
import { AuthModule } from '@accounting/auth';
import { RBACModule } from '@accounting/rbac';

/**
 * Email Module providing SMTP and IMAP functionality
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [EmailModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailConfiguration]),
    CommonModule,
    AuthModule,
    RBACModule,
  ],
  controllers: [EmailConfigurationController],
  providers: [
    EmailSenderService,
    EmailReaderService,
    EmailConfigurationService,
    EmailAutodiscoveryService,
  ],
  exports: [
    EmailSenderService,
    EmailReaderService,
    EmailConfigurationService,
    EmailAutodiscoveryService,
  ],
})
export class EmailModule {}
