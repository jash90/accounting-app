import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { RBACModule } from '@accounting/rbac';

import { EmailAttachmentsController } from './controllers/email-attachments.controller';
import { EmailDraftsController } from './controllers/email-drafts.controller';
import { EmailMessagesController } from './controllers/email-messages.controller';
import { EmailDraft } from './entities/email-draft.entity';
import { EmailAiService } from './services/email-ai.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailClientService } from './services/email-client.service';
import { EmailDraftSyncService } from './services/email-draft-sync.service';
import { EmailDraftService } from './services/email-draft.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft]),
    EmailModule,
    StorageModule,
    RBACModule,
    AIAgentModule,
  ],
  controllers: [EmailMessagesController, EmailDraftsController, EmailAttachmentsController],
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
