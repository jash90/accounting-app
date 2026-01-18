import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { RBACModule } from '@accounting/rbac';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { EmailDraft } from './entities/email-draft.entity';
import { EmailDraftService } from './services/email-draft.service';
import { EmailDraftSyncService } from './services/email-draft-sync.service';
import { EmailClientService } from './services/email-client.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailAiService } from './services/email-ai.service';
import { EmailMessagesController } from './controllers/email-messages.controller';
import { EmailDraftsController } from './controllers/email-drafts.controller';
import { EmailAttachmentsController } from './controllers/email-attachments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft]),
    EmailModule,
    StorageModule,
    RBACModule,
    AIAgentModule,
  ],
  controllers: [
    EmailMessagesController,
    EmailDraftsController,
    EmailAttachmentsController,
  ],
  providers: [
    EmailDraftService,
    EmailDraftSyncService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiService,
  ],
  exports: [
    EmailDraftService,
    EmailDraftSyncService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiService,
  ],
})
export class EmailClientModule {}
