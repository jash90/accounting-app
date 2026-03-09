import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createJwtModuleConfig } from '@accounting/auth';
import { EmailAutoReplyTemplate, User } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { RBACModule } from '@accounting/rbac';

import { EmailAttachmentsController } from './controllers/email-attachments.controller';
import { EmailAutoReplyTemplatesController } from './controllers/email-auto-reply-templates.controller';
import { EmailDraftsController } from './controllers/email-drafts.controller';
import { EmailMessagesController } from './controllers/email-messages.controller';
import { EmailDraft } from './entities/email-draft.entity';
import { EmailGateway } from './gateways/email.gateway';
import { EmailAiService } from './services/email-ai.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailAutoReplyMatcherService } from './services/email-auto-reply-matcher.service';
import { EmailAutoReplyTemplateService } from './services/email-auto-reply-template.service';
import { EmailClientService } from './services/email-client.service';
import { EmailDraftSyncService } from './services/email-draft-sync.service';
import { EmailDraftService } from './services/email-draft.service';
import { EmailIdleService } from './services/email-idle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft, EmailAutoReplyTemplate, User]),
    CommonModule,
    EmailModule,
    StorageModule,
    RBACModule,
    AIAgentModule,
    JwtModule.registerAsync(createJwtModuleConfig()),
  ],
  controllers: [
    EmailMessagesController,
    EmailDraftsController,
    EmailAttachmentsController,
    EmailAutoReplyTemplatesController,
  ],
  providers: [
    EmailDraftService,
    EmailDraftSyncService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiService,
    EmailIdleService,
    EmailGateway,
    EmailAutoReplyTemplateService,
    EmailAutoReplyMatcherService,
  ],
  exports: [
    EmailDraftService,
    EmailDraftSyncService,
    EmailClientService,
    EmailAttachmentService,
    EmailAiService,
    EmailAutoReplyTemplateService,
  ],
})
export class EmailClientModule {}
