import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { User, AIProvider } from '@accounting/common';
import { ReceivedEmail } from '@accounting/email';
import {
  AIConfigurationService,
  OpenAIProviderService,
  OpenRouterProviderService,
  TokenUsageService,
} from '@accounting/modules/ai-agent';
import { EmailDraftService } from './email-draft.service';
import { EmailAiOptionsDto } from '../dto/email-ai-options.dto';

@Injectable()
export class EmailAiService {
  private readonly logger = new Logger(EmailAiService.name);

  constructor(
    private readonly configService: AIConfigurationService,
    private readonly openaiProvider: OpenAIProviderService,
    private readonly openrouterProvider: OpenRouterProviderService,
    private readonly tokenUsageService: TokenUsageService,
    private readonly draftService: EmailDraftService,
  ) {}

  /**
   * Generate an AI reply draft for an email.
   * Uses the centralized AI Agent configuration and providers.
   */
  async generateReplyDraft(
    user: User,
    originalEmail: ReceivedEmail,
    options?: EmailAiOptionsDto,
  ) {
    // Get AI configuration
    const config = await this.configService.getConfiguration(user);
    if (!config) {
      this.logger.warn(`AI not configured for user ${user.id}`);
      throw new BadRequestException('AI not configured. Please ask admin to configure AI Agent.');
    }

    const apiKey = await this.configService.getDecryptedApiKey(user);

    // Build prompts for email reply
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildReplyPrompt(originalEmail, options);

    // Prepare messages for AI
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Select provider based on configuration
    const provider =
      config.provider === AIProvider.OPENAI
        ? this.openaiProvider
        : this.openrouterProvider;

    this.logger.log(`Generating AI reply with ${config.provider}/${config.model} for user ${user.id}`);

    // Call AI provider
    const response = await provider.chat(
      messages,
      config.model,
      config.temperature,
      config.maxTokens,
      apiKey,
    );

    // Track token usage
    await this.tokenUsageService.trackUsage(
      user,
      response.inputTokens,
      response.outputTokens,
    );

    this.logger.log(`AI reply generated: ${response.totalTokens} tokens used`);

    // Create draft from AI response
    const draft = await this.draftService.create(user, {
      to: [originalEmail.from[0]?.address || ''],
      subject: `Re: ${originalEmail.subject}`,
      textContent: response.content,
      isAiGenerated: true,
      aiPrompt: userPrompt,
      aiOptions: {
        tone: options?.tone || 'neutral',
        length: options?.length || 'medium',
        customInstructions: options?.customInstructions,
      },
    });

    return draft;
  }

  private buildSystemPrompt(options?: EmailAiOptionsDto): string {
    const tone = options?.tone || 'neutral';
    const length = options?.length || 'medium';

    const toneInstructions = {
      formal: 'Użyj formalnego, profesjonalnego języka biznesowego.',
      casual: 'Użyj przyjaznego, ale profesjonalnego tonu.',
      neutral: 'Użyj neutralnego, rzeczowego tonu biznesowego.',
    };

    const lengthInstructions = {
      short: 'Odpowiedź powinna być zwięzła, maksymalnie 2-3 zdania.',
      medium: 'Odpowiedź powinna być umiarkowanej długości, 4-6 zdań.',
      long: 'Odpowiedź może być dłuższa i bardziej szczegółowa.',
    };

    return `Jesteś asystentem email dla biura rachunkowego w Polsce.
Generujesz profesjonalne odpowiedzi na emaile w języku polskim.

${toneInstructions[tone]}
${lengthInstructions[length]}
${options?.customInstructions ? `\nDodatkowe instrukcje: ${options.customInstructions}` : ''}

Zasady:
- Używaj profesjonalnego języka biznesowego
- Odpowiedz na wszystkie punkty z oryginalnej wiadomości
- Użyj odpowiedniego powitania i zakończenia
- Nie dodawaj informacji, których nie znasz (jak imię nadawcy, jeśli nie jest podane)
- Odpowiedź powinna być gotowa do wysłania`;
  }

  private buildReplyPrompt(email: ReceivedEmail, options?: EmailAiOptionsDto): string {
    const senderName = email.from[0]?.name || email.from[0]?.address || 'nadawca';

    return `Napisz odpowiedź na poniższy email:

Od: ${senderName} <${email.from[0]?.address || 'nieznany'}>
Temat: ${email.subject || 'Brak tematu'}
Treść:
${email.text || '[Brak treści tekstowej]'}

${options?.customInstructions ? `\nDodatkowe wskazówki: ${options.customInstructions}` : ''}`;
  }
}
