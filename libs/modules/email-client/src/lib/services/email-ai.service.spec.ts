import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AIProvider, type User, UserRole } from '@accounting/common';
import { type ReceivedEmail } from '@accounting/email';
import {
  type AIConfigurationService,
  type OpenAIProviderService,
  type OpenRouterProviderService,
  type TokenUsageService,
} from '@accounting/modules/ai-agent';

import { EmailAiService } from './email-ai.service';
import { type EmailDraftService } from './email-draft.service';

describe('EmailAiService', () => {
  let service: EmailAiService;
  let configService: jest.Mocked<
    Pick<AIConfigurationService, 'getConfiguration' | 'getDecryptedApiKey'>
  >;
  let openaiProvider: jest.Mocked<Pick<OpenAIProviderService, 'chat' | 'chatStream'>>;
  let openrouterProvider: jest.Mocked<Pick<OpenRouterProviderService, 'chat' | 'chatStream'>>;
  let tokenUsageService: jest.Mocked<Pick<TokenUsageService, 'trackUsage'>>;
  let draftService: jest.Mocked<Pick<EmailDraftService, 'create'>>;

  const mockUser = { id: 'user-1', companyId: 'company-1', role: UserRole.EMPLOYEE } as User;

  const mockOriginalEmail = {
    uid: 1,
    subject: 'Pytanie o fakturę',
    from: [{ name: 'Jan Kowalski', address: 'jan@test.com' }],
    to: [{ name: 'Biuro', address: 'biuro@test.com' }],
    text: 'Czy mogę otrzymać fakturę za usługi?',
    date: new Date(),
  } as unknown as ReceivedEmail;

  const mockAiConfig = {
    provider: AIProvider.OPENAI,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are an accounting assistant.',
  };

  const mockAiResponse = {
    content: 'Dzień dobry, tak, możemy wystawić fakturę.',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  };

  const mockDraft = {
    id: 'draft-1',
    to: ['jan@test.com'],
    subject: 'Re: Pytanie o fakturę',
    textContent: mockAiResponse.content,
    isAiGenerated: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      getConfiguration: jest.fn(),
      getDecryptedApiKey: jest.fn(),
    };

    openaiProvider = {
      chat: jest.fn(),
      chatStream: jest.fn(),
    };

    openrouterProvider = {
      chat: jest.fn(),
      chatStream: jest.fn(),
    };

    tokenUsageService = {
      trackUsage: jest.fn(),
    };

    draftService = {
      create: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailAiService,
          useFactory: () =>
            new EmailAiService(
              configService as any,
              openaiProvider as any,
              openrouterProvider as any,
              tokenUsageService as any,
              draftService as any
            ),
        },
      ],
    }).compile();

    service = module.get(EmailAiService);
  });

  describe('generateReplyDraft', () => {
    it('should generate AI reply draft using OpenAI provider', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      const result = await service.generateReplyDraft(mockUser, mockOriginalEmail);

      expect(result).toEqual(mockDraft);
      expect(openaiProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        'gpt-4',
        0.7,
        1000,
        'sk-test-key'
      );
      expect(tokenUsageService.trackUsage).toHaveBeenCalledWith(mockUser, 100, 50);
    });

    it('should use OpenRouter provider when configured', async () => {
      const openrouterConfig = { ...mockAiConfig, provider: AIProvider.OPENROUTER };
      configService.getConfiguration.mockResolvedValue(openrouterConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('or-test-key');
      openrouterProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      expect(openrouterProvider.chat).toHaveBeenCalled();
      expect(openaiProvider.chat).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when AI not configured', async () => {
      configService.getConfiguration.mockResolvedValue(null);

      await expect(service.generateReplyDraft(mockUser, mockOriginalEmail)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create draft with correct recipient and subject', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      expect(draftService.create).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          to: ['jan@test.com'],
          subject: 'Re: Pytanie o fakturę',
          textContent: mockAiResponse.content,
          isAiGenerated: true,
        })
      );
    });

    it('should pass tone and length options to prompt', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail, {
        messageUid: 1,
        tone: 'formal',
        length: 'short',
        customInstructions: 'Be very concise',
      });

      expect(draftService.create).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          aiOptions: {
            tone: 'formal',
            length: 'short',
            customInstructions: 'Be very concise',
          },
        })
      );
    });

    it('should use default tone and length when not specified', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      expect(draftService.create).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          aiOptions: { tone: 'neutral', length: 'medium', customInstructions: undefined },
        })
      );
    });

    it('should include sender info in user prompt', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      const chatCall = openaiProvider.chat.mock.calls[0];
      const userMessage = chatCall[0].find((m: any) => m.role === 'user');
      expect(userMessage?.content).toContain('Jan Kowalski');
      expect(userMessage?.content).toContain('jan@test.com');
      expect(userMessage?.content).toContain('Pytanie o fakturę');
    });

    it('should use config system prompt when available', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      const chatCall = openaiProvider.chat.mock.calls[0];
      const systemMessage = chatCall[0].find((m: any) => m.role === 'system');
      expect(systemMessage?.content).toContain('You are an accounting assistant.');
    });

    it('should use fallback system prompt when config has no systemPrompt', async () => {
      const configNoPrompt = { ...mockAiConfig, systemPrompt: null };
      configService.getConfiguration.mockResolvedValue(configNoPrompt as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      const chatCall = openaiProvider.chat.mock.calls[0];
      const systemMessage = chatCall[0].find((m: any) => m.role === 'system');
      expect(systemMessage?.content).toContain('biura rachunkowego');
    });

    it('should handle email with no sender name gracefully', async () => {
      const emailNoName = {
        ...mockOriginalEmail,
        from: [{ address: 'unknown@test.com' }],
      } as unknown as ReceivedEmail;

      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, emailNoName);

      const chatCall = openaiProvider.chat.mock.calls[0];
      const userMessage = chatCall[0].find((m: any) => m.role === 'user');
      expect(userMessage?.content).toContain('unknown@test.com');
    });

    it('should track token usage after successful generation', async () => {
      configService.getConfiguration.mockResolvedValue(mockAiConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      openaiProvider.chat.mockResolvedValue(mockAiResponse as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
      draftService.create.mockResolvedValue(mockDraft as any);

      await service.generateReplyDraft(mockUser, mockOriginalEmail);

      expect(tokenUsageService.trackUsage).toHaveBeenCalledWith(mockUser, 100, 50);
    });
  });

  describe('generateReplyDraftStream', () => {
    it('should return an observable', () => {
      configService.getConfiguration.mockResolvedValue(null);

      const result = service.generateReplyDraftStream(mockUser, mockOriginalEmail);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });
});
