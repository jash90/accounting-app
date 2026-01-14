import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { EmailDraft } from './entities/email-draft.entity';
import { EmailDraftService } from './services/email-draft.service';
import { EmailClientService } from './services/email-client.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailAiAssistantService } from './services/email-ai-assistant.service';
import { EmailMessagesController } from './controllers/email-messages.controller';
import { EmailDraftsController } from './controllers/email-drafts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft]),
    EmailModule,
    StorageModule,
  ],
  controllers: [
    EmailMessagesController,
    EmailDraftsController,
  ],
  providers: [
    EmailDraftService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiAssistantService,
  ],
  exports: [
    EmailDraftService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiAssistantService,
  ],
})
export class EmailClientModule {}
