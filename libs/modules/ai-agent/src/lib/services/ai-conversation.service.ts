import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIConversation,
  AIMessage,
  AIMessageRole,
  AIContext,
  User,
  UserRole,
  AIProvider,
} from '@accounting/common';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../dto/pagination.dto';
import { AIConfigurationService } from './ai-configuration.service';
import { OpenAIProviderService } from './openai-provider.service';
import { OpenRouterProviderService } from './openrouter-provider.service';
import { RAGService } from './rag.service';
import { TokenLimitService } from './token-limit.service';
import { TokenUsageService } from './token-usage.service';
import { SystemCompanyService } from './system-company.service';

@Injectable()
export class AIConversationService {
  private readonly logger = new Logger(AIConversationService.name);

  constructor(
    @InjectRepository(AIConversation)
    private conversationRepository: Repository<AIConversation>,
    @InjectRepository(AIMessage)
    private messageRepository: Repository<AIMessage>,
    private configService: AIConfigurationService,
    private openaiProvider: OpenAIProviderService,
    private openrouterProvider: OpenRouterProviderService,
    private ragService: RAGService,
    private tokenLimitService: TokenLimitService,
    private tokenUsageService: TokenUsageService,
    private systemCompanyService: SystemCompanyService,
  ) {}

  async findAll(
    user: User,
    pagination?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AIConversation> | AIConversation[]> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    let companyId: string;

    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      if (!user.companyId) {
        return pagination ? new PaginatedResponseDto([], 0, page, limit) : [];
      }
      companyId = user.companyId;
    }

    // If no pagination requested, return array for backward compatibility
    // Filter by user.id so each user sees only their own conversations
    if (!pagination) {
      return this.conversationRepository.find({
        where: { companyId, createdById: user.id },
        relations: ['createdBy', 'company'],
        order: { updatedAt: 'DESC' },
      });
    }

    // With pagination - filter by user.id so each user sees only their own conversations
    const [data, total] = await this.conversationRepository.findAndCount({
      where: { companyId, createdById: user.id },
      relations: ['createdBy', 'company'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<AIConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['createdBy', 'company', 'messages', 'messages.user'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    // Verify user can only access their own conversation
    if (conversation.createdById !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    // Additional company check for security
    if (user.role === UserRole.ADMIN) {
      const systemCompanyId = await this.systemCompanyService.getSystemCompanyId();
      if (conversation.companyId !== systemCompanyId) {
        throw new NotFoundException(`Conversation with ID ${id} not found`);
      }
    } else {
      if (user.companyId !== conversation.companyId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return conversation;
  }

  async create(createDto: CreateConversationDto, user: User): Promise<AIConversation> {
    let targetCompanyId: string;

    if (user.role === UserRole.ADMIN) {
      targetCompanyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      if (!user.companyId) {
        throw new ForbiddenException('User not associated with company');
      }
      targetCompanyId = user.companyId;
    }

    const conversation = this.conversationRepository.create({
      title: createDto.title || 'New Conversation',
      companyId: targetCompanyId,
      createdById: user.id,
    });

    const saved = await this.conversationRepository.save(conversation);

    return this.conversationRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'company', 'messages'],
    }) as Promise<AIConversation>;
  }

  async sendMessage(
    conversationId: string,
    sendDto: SendMessageDto,
    user: User,
  ): Promise<AIMessage> {
    this.logger.debug(`sendMessage started for conversation: ${conversationId}`);

    const conversation = await this.findOne(conversationId, user);
    this.logger.debug(`Conversation found: ${conversation.id}`);

    // Check token limits
    await this.tokenLimitService.checkLimit(user);
    this.logger.debug('Token limit check passed');

    // Get AI configuration
    const config = await this.configService.getConfiguration(user);
    if (!config) {
      this.logger.error('AI configuration not found for user');
      throw new BadRequestException('AI not configured. Please contact admin.');
    }
    this.logger.debug(`AI config found: provider=${config.provider}, model=${config.model}`);

    const apiKey = await this.configService.getDecryptedApiKey(user);
    this.logger.debug('API key decrypted successfully');

    // Get conversation history
    const messages = await this.messageRepository.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
    });

    // Build message array for AI
    const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    // Add system prompt if configured
    if (config.systemPrompt) {
      chatMessages.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }

    // Add RAG context (only for OpenAI provider with active documents)
    let similarContexts: AIContext[] = [];

    // Only call RAG if:
    // 1. Using OpenAI provider (OpenRouter doesn't support embeddings)
    // 2. There are active documents to search
    if (config.provider === AIProvider.OPENAI) {
      const hasDocuments = await this.ragService.hasActiveDocuments(
        conversation.companyId,
      );
      if (hasDocuments) {
        try {
          similarContexts = await this.ragService.findSimilarContext(
            sendDto.content,
            conversation.companyId,
            apiKey,
            3,
          );

          if (similarContexts.length > 0) {
            const ragContext = this.ragService.buildRAGContext(
              similarContexts,
            );
            chatMessages.push({
              role: 'system',
              content: `You have access to the following knowledge base documents. Use them to provide accurate answers:\n${ragContext}`,
            });
          }
        } catch (error) {
          // Log but don't fail - RAG is optional enhancement
          this.logger.warn(
            'RAG context retrieval failed:',
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    // Add conversation history
    messages.forEach((msg) => {
      chatMessages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add user message
    chatMessages.push({
      role: 'user',
      content: sendDto.content,
    });

    // Save user message - use FK columns only to avoid TypeORM cascade issues
    const userMessage = this.messageRepository.create({
      conversationId: conversation.id,
      role: AIMessageRole.USER,
      content: sendDto.content,
      userId: user.id,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      contextUsed: similarContexts.map((ctx) => ctx.id),
    });

    const savedUserMessage = await this.messageRepository.save(userMessage);

    // Get AI response
    const provider =
      config.provider === AIProvider.OPENAI
        ? this.openaiProvider
        : this.openrouterProvider;

    this.logger.debug(`Calling AI provider: ${config.provider}, model: ${config.model}`);

    let response;
    try {
      response = await provider.chat(
        chatMessages,
        config.model,
        config.temperature,
        config.maxTokens,
        apiKey,
      );
    } catch (error) {
      this.logger.error(
        `AI provider call failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw HttpExceptions (already have proper status codes)
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        'Failed to get AI response. Please try again later.',
      );
    }

    this.logger.debug(`AI response received: ${response.totalTokens} tokens`);

    // Save assistant message - use FK columns only to avoid TypeORM cascade issues
    const assistantMessage = this.messageRepository.create({
      conversationId: conversation.id,
      role: AIMessageRole.ASSISTANT,
      content: response.content,
      userId: null,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.totalTokens,
    });

    const savedAssistantMessage = await this.messageRepository.save(assistantMessage);

    // Update conversation totals using update() to avoid cascade on loaded messages
    await this.conversationRepository.update(
      { id: conversation.id },
      {
        totalTokens: () => `"totalTokens" + ${response.totalTokens}`,
        messageCount: () => `"messageCount" + 2`,
      },
    );

    // Track token usage
    await this.tokenUsageService.trackUsage(
      user,
      response.inputTokens,
      response.outputTokens,
    );

    // Return assistant message (already has relations loaded)
    return savedAssistantMessage;
  }

  async remove(id: string, user: User): Promise<void> {
    const conversation = await this.findOne(id, user);
    await this.conversationRepository.remove(conversation);
  }
}
