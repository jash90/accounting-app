import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  AIConversation,
  AIMessage,
  AIProvider,
  PaginatedResponseDto,
  type User,
  UserRole,
} from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { type AIConfigurationService } from './ai-configuration.service';
import { AIConversationService } from './ai-conversation.service';
import { type OpenAIProviderService } from './openai-provider.service';
import { type OpenRouterProviderService } from './openrouter-provider.service';
import { type RAGService } from './rag.service';
import { type TokenLimitService } from './token-limit.service';
import { type TokenUsageService } from './token-usage.service';

describe('AIConversationService', () => {
  let service: AIConversationService;
  let conversationRepo: jest.Mocked<Repository<AIConversation>>;
  let messageRepo: jest.Mocked<Repository<AIMessage>>;
  let configService: jest.Mocked<
    Pick<AIConfigurationService, 'getConfiguration' | 'getDecryptedApiKey'>
  >;
  let openaiProvider: jest.Mocked<Pick<OpenAIProviderService, 'chat' | 'chatStream'>>;
  let openrouterProvider: jest.Mocked<Pick<OpenRouterProviderService, 'chat' | 'chatStream'>>;
  let ragService: jest.Mocked<
    Pick<RAGService, 'searchContextByKeywords' | 'buildRAGContext' | 'hasActiveDocuments'>
  >;
  let tokenLimitService: jest.Mocked<Pick<TokenLimitService, 'enforceTokenLimit'>>;
  let tokenUsageService: jest.Mocked<Pick<TokenUsageService, 'trackUsage'>>;
  let systemCompanyService: jest.Mocked<
    Pick<SystemCompanyService, 'getCompanyIdForUser' | 'getSystemCompanyId'>
  >;

  const companyId = 'company-1';
  const systemCompanyId = 'system-company-1';
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;
  const mockAdmin = { id: 'admin-1', companyId: null, role: UserRole.ADMIN } as unknown as User;

  const mockConversation: AIConversation = {
    id: 'conv-1',
    title: 'Test Conversation',
    companyId,
    createdById: mockUser.id,
    totalTokens: 0,
    messageCount: 0,
    messages: [],
  } as unknown as AIConversation;

  beforeEach(async () => {
    jest.clearAllMocks();

    conversationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<AIConversation>>;

    messageRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<AIMessage>>;

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

    ragService = {
      searchContextByKeywords: jest.fn(),
      buildRAGContext: jest.fn(),
      hasActiveDocuments: jest.fn(),
    };

    tokenLimitService = {
      enforceTokenLimit: jest.fn(),
    };

    tokenUsageService = {
      trackUsage: jest.fn(),
    };

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
      getSystemCompanyId: jest.fn().mockResolvedValue(systemCompanyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AIConversationService,
          useFactory: () =>
            new AIConversationService(
              conversationRepo as any,
              messageRepo as any,
              configService as any,
              openaiProvider as any,
              openrouterProvider as any,
              ragService as any,
              tokenLimitService as any,
              tokenUsageService as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(AIConversation), useValue: conversationRepo },
        { provide: getRepositoryToken(AIMessage), useValue: messageRepo },
      ],
    }).compile();

    service = module.get(AIConversationService);
  });

  describe('findAll', () => {
    it('should return conversations array when no pagination provided', async () => {
      const conversations = [mockConversation];
      conversationRepo.find.mockResolvedValue(conversations);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(conversations);
      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(conversationRepo.find).toHaveBeenCalledWith({
        where: { companyId, createdById: mockUser.id },
        relations: ['createdBy', 'company'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return paginated response when pagination provided', async () => {
      const conversations = [mockConversation];
      conversationRepo.findAndCount.mockResolvedValue([conversations, 1]);

      const result = await service.findAll(mockUser, { page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(conversationRepo.findAndCount).toHaveBeenCalled();
    });

    it('should return empty result for non-admin user without companyId', async () => {
      const noCompanyUser = {
        id: 'user-2',
        companyId: null,
        role: UserRole.EMPLOYEE,
      } as unknown as User;

      const result = await service.findAll(noCompanyUser);

      expect(result).toEqual([]);
      expect(conversationRepo.find).not.toHaveBeenCalled();
    });

    it('should return empty paginated for non-admin user without companyId', async () => {
      const noCompanyUser = {
        id: 'user-2',
        companyId: null,
        role: UserRole.EMPLOYEE,
      } as unknown as User;

      const result = await service.findAll(noCompanyUser, { page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect((result as PaginatedResponseDto<AIConversation>).data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return conversation with sorted messages', async () => {
      const conv = {
        ...mockConversation,
        messages: [{ createdAt: new Date('2026-01-02') }, { createdAt: new Date('2026-01-01') }],
      } as unknown as AIConversation;
      conversationRepo.findOne.mockResolvedValue(conv);

      const result = await service.findOne('conv-1', mockUser);

      expect(result.messages[0].createdAt).toEqual(new Date('2026-01-01'));
      expect(result.messages[1].createdAt).toEqual(new Date('2026-01-02'));
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow('not found');
    });

    it('should throw ForbiddenException if user is not the conversation owner', async () => {
      const conv = { ...mockConversation, createdById: 'other-user' } as unknown as AIConversation;
      conversationRepo.findOne.mockResolvedValue(conv);

      await expect(service.findOne('conv-1', mockUser)).rejects.toThrow('Access denied');
    });

    it('should verify company match for non-admin users', async () => {
      const otherCompanyConv = {
        ...mockConversation,
        companyId: 'other-company',
      } as unknown as AIConversation;
      conversationRepo.findOne.mockResolvedValue(otherCompanyConv);

      await expect(service.findOne('conv-1', mockUser)).rejects.toThrow('Access denied');
    });

    it('should verify system company for admin users', async () => {
      const conv = {
        ...mockConversation,
        createdById: mockAdmin.id,
        companyId: 'non-system-company',
      } as unknown as AIConversation;
      conversationRepo.findOne.mockResolvedValue(conv);

      await expect(service.findOne('conv-1', mockAdmin)).rejects.toThrow('not found');
    });
  });

  describe('create', () => {
    it('should create a conversation with default title', async () => {
      conversationRepo.create.mockReturnValue(mockConversation);
      conversationRepo.save.mockResolvedValue(mockConversation);
      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.create({}, mockUser);

      expect(result).toEqual(mockConversation);
      expect(conversationRepo.create).toHaveBeenCalledWith({
        title: 'New Conversation',
        companyId,
        createdById: mockUser.id,
      });
    });

    it('should create a conversation with provided title', async () => {
      conversationRepo.create.mockReturnValue(mockConversation);
      conversationRepo.save.mockResolvedValue(mockConversation);
      conversationRepo.findOne.mockResolvedValue(mockConversation);

      await service.create({ title: 'My Title' }, mockUser);

      expect(conversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Title' })
      );
    });

    it('should throw ForbiddenException for user without companyId', async () => {
      const noCompanyUser = {
        id: 'user-2',
        companyId: null,
        role: UserRole.EMPLOYEE,
      } as unknown as User;

      await expect(service.create({}, noCompanyUser)).rejects.toThrow(
        'User not associated with company'
      );
    });
  });

  describe('sendMessage', () => {
    const mockConfig = {
      provider: AIProvider.OPENAI,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant.',
    };

    const mockResponse = {
      content: 'AI response',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    };

    beforeEach(() => {
      conversationRepo.findOne.mockResolvedValue(mockConversation);
      tokenLimitService.enforceTokenLimit.mockResolvedValue(undefined);
      configService.getConfiguration.mockResolvedValue(mockConfig as any);
      configService.getDecryptedApiKey.mockResolvedValue('sk-test-key');
      messageRepo.find.mockResolvedValue([]);
      messageRepo.create.mockImplementation((data) => data as any);
      messageRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: 'msg-1', ...data } as any)
      );
      ragService.hasActiveDocuments.mockResolvedValue(false);
      openaiProvider.chat.mockResolvedValue(mockResponse);
      conversationRepo.update.mockResolvedValue({} as any);
      tokenUsageService.trackUsage.mockResolvedValue(undefined);
    });

    it('should send message and return assistant response', async () => {
      const result = await service.sendMessage('conv-1', { content: 'Hello' }, mockUser);

      expect(result).toBeDefined();
      expect(tokenLimitService.enforceTokenLimit).toHaveBeenCalledWith(mockUser);
      expect(openaiProvider.chat).toHaveBeenCalled();
      expect(tokenUsageService.trackUsage).toHaveBeenCalledWith(mockUser, 100, 50);
    });

    it('should include system prompt in chat messages', async () => {
      await service.sendMessage('conv-1', { content: 'Hello' }, mockUser);

      const chatArgs = openaiProvider.chat.mock.calls[0][0];
      expect(chatArgs[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' });
    });

    it('should include RAG context when OpenAI provider and documents exist', async () => {
      ragService.hasActiveDocuments.mockResolvedValue(true);
      ragService.searchContextByKeywords.mockResolvedValue([
        { id: 'ctx-1', filename: 'doc.pdf', extractedText: 'relevant text' } as any,
      ]);
      ragService.buildRAGContext.mockReturnValue('RAG context text');

      await service.sendMessage('conv-1', { content: 'Hello' }, mockUser);

      expect(ragService.searchContextByKeywords).toHaveBeenCalledWith('Hello', companyId, 3);
      const chatArgs = openaiProvider.chat.mock.calls[0][0];
      const ragMessage = chatArgs.find((m: any) => m.content.includes('knowledge base'));
      expect(ragMessage).toBeDefined();
    });

    it('should skip RAG for OpenRouter provider', async () => {
      configService.getConfiguration.mockResolvedValue({
        ...mockConfig,
        provider: AIProvider.OPENROUTER,
      } as any);
      openrouterProvider.chat.mockResolvedValue(mockResponse);

      await service.sendMessage('conv-1', { content: 'Hello' }, mockUser);

      expect(ragService.hasActiveDocuments).not.toHaveBeenCalled();
      expect(openrouterProvider.chat).toHaveBeenCalled();
    });

    it('should update conversation totals after response', async () => {
      await service.sendMessage('conv-1', { content: 'Hello' }, mockUser);

      expect(conversationRepo.update).toHaveBeenCalledWith(
        { id: 'conv-1' },
        expect.objectContaining({
          totalTokens: expect.any(Function),
          messageCount: expect.any(Function),
        })
      );
    });

    it('should throw if AI config is missing', async () => {
      configService.getConfiguration.mockResolvedValue(null);

      await expect(service.sendMessage('conv-1', { content: 'Hello' }, mockUser)).rejects.toThrow(
        'AI not configured'
      );
    });
  });

  describe('remove', () => {
    it('should remove the conversation after verifying access', async () => {
      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.remove.mockResolvedValue(mockConversation);

      await service.remove('conv-1', mockUser);

      expect(conversationRepo.remove).toHaveBeenCalledWith(mockConversation);
    });
  });
});
