import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '@accounting/email';
import { EmailDraft } from './entities/email-draft.entity';
import { EmailDraftService } from './services/email-draft.service';
import { EmailClientService } from './services/email-client.service';
import { EmailMessagesController } from './controllers/email-messages.controller';
import { EmailDraftsController } from './controllers/email-drafts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft]),
    EmailModule, // Import EmailModule for EmailSenderService, EmailReaderService, EmailConfigurationService
  ],
  controllers: [
    EmailMessagesController,
    EmailDraftsController,
  ],
  providers: [
    EmailDraftService,
    EmailClientService,
  ],
  exports: [
    EmailDraftService,
    EmailClientService,
  ],
})
export class EmailClientModule {}
