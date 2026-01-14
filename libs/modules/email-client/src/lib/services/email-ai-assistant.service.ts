import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { User } from '@accounting/common';
import { ReceivedEmail } from '@accounting/email';
import { EmailDraftService } from './email-draft.service';
import { GenerateAiDraftDto } from '../dto/generate-ai-draft.dto';

@Injectable()
export class EmailAiAssistantService {
  private readonly logger = new Logger(EmailAiAssistantService.name);

  constructor(private readonly draftService: EmailDraftService) {}

  async generateReplyDraft(user: User, originalEmail: ReceivedEmail, options: GenerateAiDraftDto) {
    const systemPrompt = this.buildSystemPrompt(user, options);
    const userPrompt = this.buildReplyPrompt(originalEmail, options);

    // TODO: Integrate with AI provider (OpenAI/OpenRouter)
    // For now, create placeholder draft
    const aiContent = `[AI Draft - To be implemented]\n\nDzień dobry,\n\nW odpowiedzi na Państwa email...\n\nPozdrawiam`;

    const draft = await this.draftService.create(user, {
      to: [originalEmail.from[0]?.address || ''],
      subject: `Re: ${originalEmail.subject}`,
      textContent: aiContent,
      isAiGenerated: true,
      aiPrompt: userPrompt,
      aiOptions: {
        tone: options.tone || 'neutral',
        length: options.length || 'medium',
        customInstructions: options.customInstructions,
      },
    });

    this.logger.log(`AI draft generated for user ${user.id}`);
    return draft;
  }

  private buildSystemPrompt(user: User, options: GenerateAiDraftDto): string {
    return `You are an email assistant for an accounting firm in Poland.
Generate professional email replies in Polish.

Tone: ${options.tone || 'neutral'}
Length: ${options.length || 'medium'}
${options.customInstructions ? `Instructions: ${options.customInstructions}` : ''}

Guidelines:
- Professional business language
- Address all points
- Proper greeting and closing`;
  }

  private buildReplyPrompt(email: ReceivedEmail, options: GenerateAiDraftDto): string {
    return `Generate a reply to this email:
From: ${email.from[0]?.address}
Subject: ${email.subject}
Content: ${email.text}

${options.customInstructions || ''}`;
  }
}
