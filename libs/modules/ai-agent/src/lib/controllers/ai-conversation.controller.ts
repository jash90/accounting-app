import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { AIConversationService } from '../services/ai-conversation.service';
import { RAGService } from '../services/rag.service';
import { AIConfigurationService } from '../services/ai-configuration.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { AIContextResponseDto } from '../dto/ai-context-response.dto';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIContext, Company, UserRole } from '@accounting/common';
import * as path from 'path';
import * as fs from 'fs/promises';

@ApiTags('ai-agent')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ai-agent')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class AIConversationController {
  constructor(
    private readonly conversationService: AIConversationService,
    private readonly ragService: RAGService,
    private readonly configService: AIConfigurationService,
    @InjectRepository(AIContext)
    private contextRepository: Repository<AIContext>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  @Get('conversations')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get all conversations',
    description: 'Retrieve all AI chat conversations for the authenticated user\'s company. ADMIN users see System Admin company conversations. Supports optional pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based, default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiOkResponse({
    description: 'List of conversations retrieved successfully. Returns paginated response if pagination params provided, otherwise returns array.',
    type: [ConversationResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'No access to ai-agent module or no read permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async findAllConversations(
    @CurrentUser() user: User,
    @Query() pagination?: PaginationQueryDto,
  ) {
    // If both page and limit are undefined, return unpaginated for backward compatibility
    if (!pagination?.page && !pagination?.limit) {
      return this.conversationService.findAll(user);
    }
    return this.conversationService.findAll(user, pagination);
  }

  @Get('conversations/:id')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Retrieve a single conversation with all messages. Must belong to user\'s company.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Conversation not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - conversation belongs to different company',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async findOneConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.conversationService.findOne(id, user);
  }

  @Post('conversations')
  @RequirePermission('ai-agent', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new conversation',
    description: 'Start a new AI chat conversation. Optional title can be provided.',
  })
  @ApiBody({
    type: CreateConversationDto,
    description: 'Conversation data (title is optional)',
  })
  @ApiCreatedResponse({
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'No write permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @CurrentUser() user: User,
  ) {
    return this.conversationService.create(createDto, user);
  }

  @Post('conversations/:id/messages')
  @RequirePermission('ai-agent', 'write')
  @ApiOperation({
    summary: 'Send message in conversation',
    description: 'Send a user message and receive AI response. RAG context is automatically injected if relevant files are uploaded. Token usage is tracked and limits are enforced.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: SendMessageDto,
    description: 'Message content',
  })
  @ApiOkResponse({
    description: 'Message sent and AI response received',
    schema: {
      type: 'object',
      properties: {
        userMessage: { type: 'object', description: 'User message that was sent' },
        assistantMessage: { type: 'object', description: 'AI assistant response' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Token limit exceeded or AI not configured',
  })
  @ApiForbiddenResponse({
    description: 'No write permission or access denied',
  })
  @ApiNotFoundResponse({
    description: 'Conversation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async sendMessage(
    @Param('id') id: string,
    @Body() sendDto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    const assistantMessage = await this.conversationService.sendMessage(
      id,
      sendDto,
      user,
    );

    return {
      userMessage: { content: sendDto.content },
      assistantMessage,
    };
  }

  @Post('conversations/:id/messages/stream')
  @RequirePermission('ai-agent', 'write')
  @Sse()
  @ApiOperation({
    summary: 'Send message with streaming response (SSE)',
    description: 'Send a user message and receive AI response as a stream of Server-Sent Events. Use when enableStreaming is true in AI configuration.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: SendMessageDto,
    description: 'Message content',
  })
  @ApiOkResponse({
    description: 'SSE stream of AI response chunks',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['content', 'done', 'error'] },
        content: { type: 'string', description: 'Content chunk (for type=content)' },
        inputTokens: { type: 'number', description: 'Input tokens (for type=done)' },
        outputTokens: { type: 'number', description: 'Output tokens (for type=done)' },
        totalTokens: { type: 'number', description: 'Total tokens (for type=done)' },
        error: { type: 'string', description: 'Error message (for type=error)' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Token limit exceeded or AI not configured',
  })
  @ApiForbiddenResponse({
    description: 'No write permission or access denied',
  })
  @ApiNotFoundResponse({
    description: 'Conversation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  sendMessageStream(
    @Param('id') id: string,
    @Body() sendDto: SendMessageDto,
    @CurrentUser() user: User,
  ): Observable<MessageEvent> {
    return this.conversationService.sendMessageStream(id, sendDto, user).pipe(
      map((chunk) => ({ data: chunk } as MessageEvent)),
    );
  }

  @Delete('conversations/:id')
  @RequirePermission('ai-agent', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Permanently delete a conversation and all its messages.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Conversation deleted successfully',
  })
  @ApiForbiddenResponse({
    description: 'No delete permission or access denied',
  })
  @ApiNotFoundResponse({
    description: 'Conversation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async removeConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.conversationService.remove(id, user);
  }

  @Post('context')
  @RequirePermission('ai-agent', 'write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/ai-context',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'text/plain',
          'text/markdown',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, TXT, and MD files are allowed'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload context file for RAG',
    description: 'Upload a PDF, TXT, or MD file to be used as context for AI responses. File is processed to extract text and generate embeddings for semantic search. Max file size: 10MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (PDF, TXT, or MD)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'File uploaded and processed successfully',
    type: AIContextResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid file type or file too large',
  })
  @ApiForbiddenResponse({
    description: 'No write permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async uploadContext(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new Error('System Admin company not found');
      }
      companyId = systemCompany.id;
    } else {
      companyId = user.companyId;
    }

    // Get embedding configuration (separate API key, model, and provider if configured)
    const embeddingConfig = await this.configService.getEmbeddingConfig(user);

    const context = await this.ragService.processFile(
      file.path,
      file.originalname,
      file.mimetype,
      file.size,
      companyId,
      user,
      embeddingConfig.apiKey,
      embeddingConfig.model,
    );

    return this.contextRepository.findOne({
      where: { id: context.id },
      relations: ['uploadedBy', 'company'],
    });
  }

  @Get('context')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get all uploaded context files',
    description: 'Retrieve list of all uploaded context files for RAG. Files belong to user\'s company.',
  })
  @ApiOkResponse({
    description: 'List of context files retrieved successfully',
    type: [AIContextResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'No read permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getAllContext(@CurrentUser() user: User) {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new Error('System Admin company not found');
      }
      companyId = systemCompany.id;
    } else {
      companyId = user.companyId;
    }

    return this.contextRepository.find({
      where: { companyId },
      relations: ['uploadedBy', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('context/:id')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get context file details',
    description: 'Retrieve a single context file with extracted text content for preview.',
  })
  @ApiParam({
    name: 'id',
    description: 'Context file ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Context file retrieved successfully with extracted text',
    type: AIContextResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Context file not found',
  })
  @ApiForbiddenResponse({
    description: 'No read permission or access denied',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getContextFile(@Param('id') id: string, @CurrentUser() user: User) {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new Error('System Admin company not found');
      }
      companyId = systemCompany.id;
    } else {
      companyId = user.companyId;
    }

    const context = await this.contextRepository.findOne({
      where: { id, companyId },
      relations: ['uploadedBy', 'company'],
    });

    if (!context) {
      throw new NotFoundException('Context file not found');
    }

    return {
      id: context.id,
      companyId: context.companyId,
      company: context.company ? {
        id: context.company.id,
        name: context.company.name,
        isSystemCompany: context.company.isSystemCompany,
      } : null,
      filename: context.filename,
      mimeType: context.mimeType,
      fileSize: context.fileSize,
      isActive: context.isActive,
      uploadedBy: {
        id: context.uploadedBy.id,
        email: context.uploadedBy.email,
        firstName: context.uploadedBy.firstName,
        lastName: context.uploadedBy.lastName,
      },
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      extractedText: context.extractedText,
    };
  }

  @Delete('context/:id')
  @RequirePermission('ai-agent', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete context file',
    description: 'Permanently delete an uploaded context file. File must belong to user\'s company.',
  })
  @ApiParam({
    name: 'id',
    description: 'Context file ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Context file deleted successfully',
  })
  @ApiForbiddenResponse({
    description: 'No delete permission or access denied',
  })
  @ApiNotFoundResponse({
    description: 'Context file not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async removeContext(@Param('id') id: string, @CurrentUser() user: User) {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new Error('System Admin company not found');
      }
      companyId = systemCompany.id;
    } else {
      companyId = user.companyId;
    }

    const context = await this.contextRepository.findOne({
      where: { id, companyId },
    });

    if (!context) {
      throw new NotFoundException('Context file not found');
    }

    // Delete physical file
    try {
      await fs.unlink(context.filePath);
    } catch (error) {
      // File already deleted or doesn't exist
    }

    await this.contextRepository.remove(context);
  }
}
