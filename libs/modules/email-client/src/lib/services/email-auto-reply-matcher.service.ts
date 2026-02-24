import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User, UserRole } from '@accounting/common';
import { ReceivedEmail } from '@accounting/email';

import { EmailAiService } from './email-ai.service';
import { EmailAutoReplyTemplateService } from './email-auto-reply-template.service';
import { EmailAiOptionsDto } from '../dto/email-ai-options.dto';

interface NewEmailEvent {
  companyId: string;
  message: ReceivedEmail;
}

/**
 * Service that automatically matches incoming emails against auto-reply templates
 * and generates AI-powered draft responses for matched templates.
 *
 * Listens to the 'email.new-message' event emitted by EmailIdleService
 * when a new email is received via IMAP IDLE.
 */
@Injectable()
export class EmailAutoReplyMatcherService {
  private readonly logger = new Logger(EmailAutoReplyMatcherService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly templateService: EmailAutoReplyTemplateService,
    private readonly aiService: EmailAiService
  ) {}

  @OnEvent('email.new-message')
  async handleNewEmail(event: NewEmailEvent): Promise<void> {
    const { companyId, message } = event;

    const templates = await this.templateService.findActiveByCompanyId(companyId);
    if (templates.length === 0) return;

    const subject = message.subject || '';
    const body = message.text || '';

    const matchedTemplates = templates.filter((t) =>
      this.templateService.matchesEmail(t, subject, body)
    );

    if (matchedTemplates.length === 0) return;

    // Find a company owner to use as the actor for draft creation
    const companyOwner = await this.userRepository.findOne({
      where: { companyId, role: UserRole.COMPANY_OWNER, isActive: true },
    });

    if (!companyOwner) {
      this.logger.warn(
        `No active company owner found for company ${companyId}, skipping auto-reply generation`
      );
      return;
    }

    for (const template of matchedTemplates) {
      try {
        const aiOptions = {
          messageUid: 0,
          tone: (template.tone as 'formal' | 'casual' | 'neutral') || 'neutral',
          length: 'medium' as const,
          customInstructions: template.customInstructions || undefined,
        } as EmailAiOptionsDto;

        await this.aiService.generateReplyDraft(companyOwner, message, aiOptions);
        await this.templateService.incrementMatchCount(template.id);

        this.logger.log(
          `Auto-reply draft created for template "${template.name}" (company ${companyId})`
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate auto-reply for template "${template.name}" (${template.id}): ${(error as Error).message}`
        );
      }
    }
  }
}
