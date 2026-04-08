import { BadRequestException } from '@nestjs/common';

import { AIProvider, type User } from '@accounting/common';

import { DocumentAiService } from './document-ai.service';

describe('DocumentAiService', () => {
  const user = { id: 'user-1' } as User;

  function build(overrides?: {
    config?: unknown;
    chatResult?: {
      content: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  }) {
    const trackUsage = jest.fn().mockResolvedValue(undefined);
    const getConfiguration = jest.fn().mockResolvedValue(
      overrides?.config === undefined
        ? {
            provider: AIProvider.OPENAI,
            model: 'gpt-4o-mini',
            temperature: 0.4,
            maxTokens: 2000,
            systemPrompt: '',
          }
        : overrides.config
    );
    const getDecryptedApiKey = jest.fn().mockResolvedValue('sk-test');
    const chat = jest.fn().mockResolvedValue(
      overrides?.chatResult ?? {
        content: '<h1>Umowa</h1><p>Strony zawieraja umowe.</p>',
        inputTokens: 12,
        outputTokens: 34,
        totalTokens: 46,
      }
    );

    const service = new DocumentAiService(
      { getConfiguration, getDecryptedApiKey } as never,
      { chat } as never,
      { chat: jest.fn() } as never,
      { trackUsage } as never
    );

    return { service, getConfiguration, chat, trackUsage };
  }

  it('returns generated HTML, token counts, and tracks usage', async () => {
    const { service, chat, trackUsage } = build();

    const result = await service.generate(user, {
      prompt: 'Krotka umowa o swiadczenie uslug ksiegowych',
      templateName: 'Umowa o uslugi',
      placeholders: ['nazwa_klienta', 'nip', 'kwota'],
    });

    expect(result.html).toContain('<h1>Umowa</h1>');
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(34);
    expect(result.totalTokens).toBe(46);
    expect(trackUsage).toHaveBeenCalledWith(user, 12, 34);

    // System prompt should reference the template name and placeholder list
    const messages = chat.mock.calls[0][0] as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    expect(systemMsg).toContain('"Umowa o uslugi"');
    expect(systemMsg).toContain('{{nazwa_klienta}}');
    expect(systemMsg).toContain('{{nip}}');
  });

  it('strips markdown code fences from model output', async () => {
    const { service } = build({
      chatResult: {
        content: '```html\n<p>Hello</p>\n```',
        inputTokens: 5,
        outputTokens: 8,
        totalTokens: 13,
      },
    });
    const result = await service.generate(user, { prompt: 'test prompt please' });
    expect(result.html).toBe('<p>Hello</p>');
  });

  it('throws BadRequestException when AI is not configured', async () => {
    const { service } = build({ config: null });
    await expect(
      service.generate(user, { prompt: 'jakis prompt do testu' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('embeds category-specific guidance into the system prompt', async () => {
    const { service, chat } = build();
    await service.generate(user, {
      prompt: 'Faktura za uslugi ksiegowe za marzec 2026',
      templateName: 'Faktura miesieczna',
      category: 'invoice',
    });
    const messages = chat.mock.calls[0][0] as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    expect(systemMsg).toContain('FAKTURA');
    expect(systemMsg).toContain('Sprzedawca');
    expect(systemMsg).toContain('Nabywca');
    expect(systemMsg).toContain('NIP');
    expect(systemMsg).toContain('Kategoria szablonu: invoice');
  });

  it('passes existing HTML so the AI knows to extend instead of duplicate', async () => {
    const { service, chat } = build();
    await service.generate(user, {
      prompt: 'Dodaj sekcje o terminach platnosci',
      templateName: 'Umowa',
      category: 'contract',
      currentHtml: '<h1>Umowa nr 1/2026</h1><p>Strony zawieraja umowe.</p>',
    });
    const messages = chat.mock.calls[0][0] as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    expect(systemMsg).toContain('ISTNIEJACA TRESC');
    expect(systemMsg).toContain('NIE powtarzaj');
    expect(systemMsg).toContain('<h1>Umowa nr 1/2026</h1>');
  });
});
