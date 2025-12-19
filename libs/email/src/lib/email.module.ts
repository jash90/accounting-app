import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSenderService } from './services/email-sender.service';
import { EmailReaderService } from './services/email-reader.service';
import { EmailConfigurationService } from './services/email-configuration.service';
import { EmailConfigurationController } from './controllers/email-configuration.controller';
import { EmailConfiguration, CommonModule } from '@accounting/common';
import { AuthModule } from '@accounting/auth';
import { RbacModule } from '@accounting/rbac';

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
    RbacModule,
  ],
  controllers: [EmailConfigurationController],
  providers: [EmailSenderService, EmailReaderService, EmailConfigurationService],
  exports: [EmailSenderService, EmailReaderService, EmailConfigurationService],
})
export class EmailModule {}
