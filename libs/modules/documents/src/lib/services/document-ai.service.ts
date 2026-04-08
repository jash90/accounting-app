import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { AIProvider, User } from '@accounting/common';
import {
  AIConfigurationService,
  OpenAIProviderService,
  OpenRouterProviderService,
  TokenUsageService,
} from '@accounting/modules/ai-agent';

export interface DocumentAiGenerateOptions {
  prompt: string;
  templateName?: string;
  placeholders?: string[];
}

export interface DocumentAiGenerateResult {
  html: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Generate document body content (HTML) from a free-form user prompt using
 * the company's configured AI provider. Mirrors the EmailAiService pattern
 * but produces HTML that drops straight into the TipTap editor via
 * editor.commands.setContent / insertContent.
 */
@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  constructor(
    private readonly configService: AIConfigurationService,
    private readonly openaiProvider: OpenAIProviderService,
    private readonly openrouterProvider: OpenRouterProviderService,
    private readonly tokenUsageService: TokenUsageService
  ) {}

  async generate(user: User, opts: DocumentAiGenerateOptions): Promise<DocumentAiGenerateResult> {
    const config = await this.configService.getConfiguration(user);
    if (!config) {
      this.logger.warn(`AI not configured for user ${user.id}`);
      throw new BadRequestException(
        'AI nie jest skonfigurowane. Skontaktuj się z administratorem.'
      );
    }

    const apiKey = await this.configService.getDecryptedApiKey(user);

    const systemPrompt = this.buildSystemPrompt(opts);
    const userPrompt = opts.prompt.trim();

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const provider =
      config.provider === AIProvider.OPENAI ? this.openaiProvider : this.openrouterProvider;

    this.logger.log(
      `Generating document content with ${config.provider}/${config.model} for user ${user.id}`
    );

    const response = await provider.chat(
      messages,
      config.model,
      config.temperature,
      config.maxTokens,
      apiKey
    );

    await this.tokenUsageService.trackUsage(user, response.inputTokens, response.outputTokens);

    this.logger.log(`Document AI generated: ${response.totalTokens} tokens used`);

    return {
      html: this.sanitiseHtml(response.content),
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.totalTokens,
    };
  }

  private buildSystemPrompt(opts: DocumentAiGenerateOptions): string {
    const placeholderList =
      opts.placeholders && opts.placeholders.length > 0
        ? opts.placeholders.map((k) => `{{${k}}}`).join(', ')
        : null;

    const placeholderHint = placeholderList
      ? `\nDostepne placeholdery (uzyj ich tam, gdzie pasuja, np. zamiast nazwy klienta wstaw {{nazwa_klienta}}): ${placeholderList}`
      : '';

    const templateHint = opts.templateName
      ? `\nNazwa szablonu, do ktorego generujesz tresc: "${opts.templateName}".`
      : '';

    return [
      'Jestes asystentem generujacym profesjonalne dokumenty ksiegowe, prawne i biurowe',
      'dla polskiego biura rachunkowego. Pisz po polsku, w formalnym tonie, uzywajac poprawnej',
      'terminologii ksiegowej i prawnej.',
      '',
      'WAZNE: Odpowiadaj WYLACZNIE czystym kodem HTML, bez blokow kodu, bez komentarzy,',
      'bez wyjasnien. Nie dodawaj <html>, <head>, <body> ani <style>. Nie uzywaj inline',
      'style="...". Generuj wylacznie znaczniki dozwolone w edytorze TipTap:',
      '',
      '- <h1>, <h2>, <h3> - naglowki',
      '- <p> - akapity',
      '- <strong>, <em>, <u>, <s> - formatowanie inline',
      '- <ul><li>, <ol><li> - listy punktowane i numerowane',
      '- <table><tr><th><td> - tabele (z opcjonalnym <thead>)',
      '- <blockquote> - cytaty',
      '- <hr> - pozioma linia',
      '- <a href="..."> - linki',
      '',
      'Dla placeholderow uzywaj skladni Handlebars: {{nazwa_zmiennej}}.',
      'Te tokeny sa podmieniane na rzeczywiste dane przed wyslaniem dokumentu do klienta.',
      templateHint,
      placeholderHint,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Defensive cleanup: some models still wrap their output in markdown code
   * fences despite the system prompt forbidding it. Strip the fence so the
   * HTML drops cleanly into the editor.
   */
  private sanitiseHtml(raw: string): string {
    let html = raw.trim();
    const fenceRegex = /^```(?:html|HTML)?\s*\n?([\s\S]*?)\n?```$/;
    const match = fenceRegex.exec(html);
    if (match) html = match[1].trim();
    return html;
  }
}
