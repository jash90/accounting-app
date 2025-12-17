import { Module } from '@nestjs/common';
import { EmailSenderService } from './services/email-sender.service';
import { EmailReaderService } from './services/email-reader.service';

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
  providers: [EmailSenderService, EmailReaderService],
  exports: [EmailSenderService, EmailReaderService],
})
export class EmailModule {}
