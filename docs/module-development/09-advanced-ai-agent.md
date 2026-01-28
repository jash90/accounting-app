# Advanced Module Patterns (AI Agent Example)

> [← Back to Index](./README.md) | [← Previous: Testing Guide](./08-testing.md)

This section covers advanced patterns for complex modules requiring encryption, external APIs, file uploads, and vector search.

---

## When to Use Advanced Patterns

Use these patterns when your module needs:

- **Multiple related entities** (3+ entities with complex relationships)
- **Sensitive data handling** (API keys, credentials, tokens)
- **External service integration** (third-party APIs, providers)
- **File processing** (uploads, document parsing)
- **Vector search/RAG** (semantic search, embeddings)
- **Usage tracking** (quotas, rate limiting, billing)
- **Role-based controller separation** (admin vs. user operations)

---

## Complex Multi-Entity Architecture

When building modules with multiple entities, design relationships carefully to maintain data integrity and enable efficient queries.

### Multi-Entity Architecture Example

```
AI Agent Module Entities:
├── AIConfiguration     # Provider settings (company-level)
├── AIConversation      # Chat sessions
├── AIMessage           # Individual messages
├── AIContext           # Knowledge base documents
├── TokenUsage          # Daily usage tracking
└── TokenLimit          # Usage quotas
```

### Entity with JSONB and Vector Columns

**File**: `libs/common/src/lib/entities/ai-context.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('ai_contexts')
@Index(['companyId', 'isActive'])
export class AIContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  source: string | null;

  // JSONB column for flexible metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  // Vector embedding for semantic search (requires pgvector extension)
  @Column({ type: 'vector', length: 1536, nullable: true })
  embedding: number[] | null;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Composite Unique Indexes

For entities requiring unique combinations:

```typescript
@Entity('token_usage')
@Index(['companyId', 'date'], { unique: true }) // One record per company per day
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'int', default: 0 })
  requestCount: number;
}
```

### Cascade Delete Relationships

```typescript
@Entity('ai_conversations')
export class AIConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ nullable: true })
  title: string | null;

  // Messages deleted when conversation deleted
  @OneToMany(() => AIMessage, (message) => message.conversation, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: AIMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Sensitive Data Encryption (AES-256-GCM)

When storing API keys, credentials, or other sensitive data, use encryption at rest with authenticated encryption (GCM mode).

### Encryption Service Pattern

**File**: `libs/modules/ai-agent/src/lib/services/ai-configuration.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AIConfigurationService implements OnModuleInit {
  private readonly ALGORITHM = 'aes-256-gcm';
  private ENCRYPTION_KEY: Buffer;

  onModuleInit() {
    // Validate encryption key exists
    const key = process.env.AI_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'AI_ENCRYPTION_KEY environment variable is required for secure API key storage'
      );
    }
    // Derive a proper 32-byte key using PBKDF2
    const salt = process.env.AI_ENCRYPTION_SALT || 'default-salt-change-in-prod';
    this.ENCRYPTION_KEY = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt API key with random IV and authentication tag
   * Format: iv:authTag:encryptedData (hex encoded)
   */
  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(12); // GCM recommended IV size is 12 bytes
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt API key
   */
  private decryptApiKey(encryptedKey: string): string {
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Store configuration - encrypt API key before saving
   */
  async create(createDto: CreateAIConfigurationDto, user: User): Promise<AIConfiguration> {
    const configuration = this.configRepository.create({
      ...createDto,
      companyId: user.companyId,
      // Never store plaintext API keys
      apiKey: this.encryptApiKey(createDto.apiKey),
      createdById: user.id,
    });

    return this.configRepository.save(configuration);
  }

  /**
   * Get decrypted API key for use (internal only)
   */
  async getDecryptedApiKey(companyId: string): Promise<string> {
    const config = await this.findActiveByCompany(companyId);
    return this.decryptApiKey(config.apiKey);
  }
}
```

### Never Expose Encrypted Data in Responses

**File**: `libs/modules/ai-agent/src/lib/dto/ai-configuration-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class AIConfigurationResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  provider: string;

  @ApiProperty()
  @Expose()
  model: string;

  // NEVER expose the actual API key
  @Exclude()
  apiKey: string;

  // Instead, indicate if key is configured
  @ApiProperty({ description: 'Whether an API key is configured' })
  @Expose()
  hasApiKey: boolean;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  constructor(partial: Partial<AIConfigurationResponseDto>) {
    Object.assign(this, partial);
    // Derive hasApiKey from presence of apiKey
    this.hasApiKey = !!partial.apiKey;
  }
}
```

### Environment Variables for Encryption

**File**: `.env.example`

```env
# AI Agent Module
AI_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

---

## Provider Abstraction Pattern

When integrating with external services that may have multiple providers, use abstraction to enable flexibility.

### Abstract Provider Interface

**File**: `libs/modules/ai-agent/src/lib/providers/ai-provider.service.ts`

```typescript
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  totalTokens: number;
}

export abstract class AIProviderService {
  abstract readonly providerName: string;

  abstract chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string
  ): Promise<ChatResponse>;

  abstract generateEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse>;

  abstract listModels(apiKey: string): Promise<string[]>;
}
```

### OpenAI Provider Implementation

**File**: `libs/modules/ai-agent/src/lib/providers/openai-provider.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AIProviderService,
  ChatMessage,
  ChatResponse,
  EmbeddingResponse,
} from './ai-provider.service';

@Injectable()
export class OpenAIProviderService extends AIProviderService {
  readonly providerName = 'openai';

  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string
  ): Promise<ChatResponse> {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      model: response.model,
    };
  }

  async generateEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    const client = new OpenAI({ apiKey });

    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      totalTokens: response.usage.total_tokens,
    };
  }

  async listModels(apiKey: string): Promise<string[]> {
    const client = new OpenAI({ apiKey });
    const response = await client.models.list();

    return response.data.filter((model) => model.id.startsWith('gpt-')).map((model) => model.id);
  }
}
```

### Alternative Provider (OpenRouter)

**File**: `libs/modules/ai-agent/src/lib/providers/openrouter-provider.service.ts`

```typescript
@Injectable()
export class OpenRouterProviderService extends AIProviderService {
  readonly providerName = 'openrouter';
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string
  ): Promise<ChatResponse> {
    // OpenRouter uses OpenAI-compatible API
    const client = new OpenAI({
      apiKey,
      baseURL: this.baseUrl,
    });

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      model: response.model,
    };
  }

  // ... similar implementations
}
```

### Runtime Provider Selection

**File**: `libs/modules/ai-agent/src/lib/services/ai-chat.service.ts`

```typescript
@Injectable()
export class AIChatService {
  private providers: Map<string, AIProviderService>;

  constructor(
    private readonly openAIProvider: OpenAIProviderService,
    private readonly openRouterProvider: OpenRouterProviderService,
    private readonly configService: AIConfigurationService
  ) {
    // Register available providers
    this.providers = new Map([
      ['openai', this.openAIProvider],
      ['openrouter', this.openRouterProvider],
    ]);
  }

  /**
   * Get appropriate provider based on company configuration
   */
  private async getProvider(companyId: string): Promise<{
    provider: AIProviderService;
    config: AIConfiguration;
    apiKey: string;
  }> {
    const config = await this.configService.findActiveByCompany(companyId);
    const provider = this.providers.get(config.provider);

    if (!provider) {
      throw new BadRequestException(`Unsupported AI provider: ${config.provider}`);
    }

    const apiKey = await this.configService.getDecryptedApiKey(companyId);

    return { provider, config, apiKey };
  }

  async chat(conversationId: string, message: string, user: User) {
    const { provider, config, apiKey } = await this.getProvider(user.companyId);

    // Use the appropriate provider
    const response = await provider.chat(
      messages,
      config.model,
      config.temperature,
      config.maxTokens,
      apiKey
    );

    return response;
  }
}
```

---

## File Upload & Processing

For modules that handle file uploads with processing.

### Controller with File Upload

**File**: `libs/modules/ai-agent/src/lib/controllers/ai-context.controller.ts`

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@Controller('modules/ai-agent/context')
@ApiTags('AI Agent - Context')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('ai-agent')
export class AIContextController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/ai-context',
        filename: (req, file, cb) => {
          // Generate unique filename
          const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        // Validate file types
        const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/json'];
        const allowedExtensions = ['.txt', '.md', '.pdf', '.json'];

        const ext = extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`
            ),
            false
          );
        }
      },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (txt, md, pdf, json)',
        },
        title: {
          type: 'string',
          description: 'Title for the context document',
        },
      },
      required: ['file'],
    },
  })
  async uploadContext(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.contextService.createFromFile(file, title, user);
  }
}
```

### File Processing Service

```typescript
@Injectable()
export class AIContextService {
  async createFromFile(file: Express.Multer.File, title: string, user: User): Promise<AIContext> {
    // Read and process file content
    const content = await this.extractContent(file);

    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(content, user.companyId);

    // Create context entry
    const context = this.contextRepository.create({
      companyId: user.companyId,
      title: title || file.originalname,
      content,
      source: file.originalname,
      metadata: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
      embedding,
      createdById: user.id,
    });

    // Clean up uploaded file after processing
    await fs.promises.unlink(file.path);

    return this.contextRepository.save(context);
  }

  private async extractContent(file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase();

    switch (ext) {
      case '.txt':
      case '.md':
        return fs.promises.readFile(file.path, 'utf-8');

      case '.json':
        const json = await fs.promises.readFile(file.path, 'utf-8');
        return JSON.stringify(JSON.parse(json), null, 2);

      case '.pdf':
        // Use pdf-parse or similar library
        const pdfParse = require('pdf-parse');
        const dataBuffer = await fs.promises.readFile(file.path);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;

      default:
        throw new BadRequestException(`Unsupported file type: ${ext}`);
    }
  }
}
```

---

## Vector Search (RAG Pattern)

For modules requiring semantic search capabilities using embeddings.

### Enable pgvector Extension

**Migration**: `migrations/XXXXXX-add-pgvector.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgvector implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Add vector column to ai_contexts
    await queryRunner.query(`
      ALTER TABLE ai_contexts
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);

    // Create index for similarity search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ai_contexts_embedding_idx
      ON ai_contexts
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ai_contexts_embedding_idx`);
    await queryRunner.query(`ALTER TABLE ai_contexts DROP COLUMN IF EXISTS embedding`);
  }
}
```

### Embedding Generation

```typescript
@Injectable()
export class AIContextService {
  constructor(
    private readonly configService: AIConfigurationService,
    private readonly openAIProvider: OpenAIProviderService
  ) {}

  /**
   * Generate embedding vector for text
   */
  private async generateEmbedding(text: string, companyId: string): Promise<number[]> {
    const apiKey = await this.configService.getDecryptedApiKey(companyId);

    const response = await this.openAIProvider.generateEmbedding(text, apiKey);

    return response.embedding;
  }
}
```

### Similarity Search for RAG

```typescript
@Injectable()
export class AIContextService {
  /**
   * Find relevant context documents using cosine similarity
   */
  async findRelevantContext(
    query: string,
    companyId: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<AIContext[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query, companyId);

    // Use raw query for vector similarity search
    const results = await this.contextRepository
      .createQueryBuilder('context')
      .select(['context.id', 'context.title', 'context.content', 'context.source'])
      .addSelect(`1 - (context.embedding <=> :embedding)`, 'similarity')
      .where('context.companyId = :companyId', { companyId })
      .andWhere('context.isActive = true')
      .andWhere('context.embedding IS NOT NULL')
      .andWhere(`1 - (context.embedding <=> :embedding) >= :minSimilarity`, {
        minSimilarity,
      })
      .setParameter('embedding', `[${queryEmbedding.join(',')}]`)
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .getRawMany();

    return results;
  }
}
```

### Injecting Context into Chat

```typescript
@Injectable()
export class AIChatService {
  async chat(conversationId: string, userMessage: string, user: User) {
    // Find relevant context using RAG
    const relevantContext = await this.contextService.findRelevantContext(
      userMessage,
      user.companyId,
      3, // Top 3 most relevant
      0.7, // Minimum similarity threshold
    );

    // Build system message with context
    const systemMessage = this.buildSystemMessage(relevantContext);

    // Include context in messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Send to AI provider
    const response = await provider.chat(messages, config.model, ...);

    return response;
  }

  private buildSystemMessage(context: AIContext[]): string {
    if (context.length === 0) {
      return 'You are a helpful assistant.';
    }

    const contextText = context
      .map((c) => `### ${c.title}\n${c.content}`)
      .join('\n\n');

    return `You are a helpful assistant. Use the following context to answer questions:

${contextText}

If the context doesn't contain relevant information, say so and answer based on your general knowledge.`;
  }
}
```

---

## Token Tracking & Rate Limiting

For modules requiring usage tracking and quota enforcement.

### Token Usage Entity

```typescript
@Entity('token_usage')
@Index(['companyId', 'date'], { unique: true })
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'int', default: 0 })
  requestCount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Token Limit Entity with Hierarchical Limits

```typescript
@Entity('token_limits')
export class TokenLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Can be company-wide or user-specific
  @Column({ nullable: true })
  companyId: string | null;

  @Column({ nullable: true })
  userId: string | null;

  @Column({ type: 'int' })
  dailyLimit: number;

  @Column({ type: 'int' })
  monthlyLimit: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.8 })
  warningThreshold: number; // Alert at 80% usage

  @Column({ default: true })
  isActive: boolean;
}
```

### Token Tracking Service

```typescript
@Injectable()
export class TokenUsageService {
  /**
   * Record token usage for a request
   */
  async recordUsage(
    companyId: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Upsert daily record
    await this.usageRepository
      .createQueryBuilder()
      .insert()
      .into(TokenUsage)
      .values({
        companyId,
        date: today,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        requestCount: 1,
      })
      .orUpdate(
        [
          'promptTokens = token_usage.promptTokens + EXCLUDED.promptTokens',
          'completionTokens = token_usage.completionTokens + EXCLUDED.completionTokens',
          'totalTokens = token_usage.totalTokens + EXCLUDED.totalTokens',
          'requestCount = token_usage.requestCount + 1',
        ],
        ['companyId', 'date']
      )
      .execute();
  }

  /**
   * Check if company is within limits before allowing request
   */
  async checkLimits(
    companyId: string,
    estimatedTokens: number
  ): Promise<{ allowed: boolean; reason?: string; usage?: TokenUsageStats }> {
    const limit = await this.getCompanyLimit(companyId);
    if (!limit) {
      return { allowed: true }; // No limit configured
    }

    const dailyUsage = await this.getDailyUsage(companyId);
    const monthlyUsage = await this.getMonthlyUsage(companyId);

    // Check daily limit
    if (dailyUsage + estimatedTokens > limit.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded (${dailyUsage}/${limit.dailyLimit})`,
        usage: { daily: dailyUsage, monthly: monthlyUsage },
      };
    }

    // Check monthly limit
    if (monthlyUsage + estimatedTokens > limit.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly token limit exceeded (${monthlyUsage}/${limit.monthlyLimit})`,
        usage: { daily: dailyUsage, monthly: monthlyUsage },
      };
    }

    // Check warning threshold
    const monthlyPercentage = monthlyUsage / limit.monthlyLimit;
    if (monthlyPercentage >= limit.warningThreshold) {
      // Log warning but allow request
      this.logger.warn(
        `Company ${companyId} at ${(monthlyPercentage * 100).toFixed(1)}% of monthly limit`
      );
    }

    return { allowed: true, usage: { daily: dailyUsage, monthly: monthlyUsage } };
  }
}
```

### Integrating Limit Checks

```typescript
@Injectable()
export class AIChatService {
  async chat(conversationId: string, message: string, user: User) {
    // Estimate tokens (rough: 1 token ~ 4 chars)
    const estimatedTokens = Math.ceil(message.length / 4) * 2; // Request + response

    // Check limits before proceeding
    const limitCheck = await this.tokenUsageService.checkLimits(
      user.companyId,
      estimatedTokens,
    );

    if (!limitCheck.allowed) {
      throw new ForbiddenException(limitCheck.reason);
    }

    // Proceed with chat...
    const response = await provider.chat(...);

    // Record actual usage
    await this.tokenUsageService.recordUsage(
      user.companyId,
      response.promptTokens,
      response.completionTokens,
    );

    return response;
  }
}
```

---

## Multiple Controllers Pattern

When a module needs different access patterns for different user types.

### Controller Separation Strategy

```
AI Agent Controllers:
├── AIConfigurationController  # ADMIN & COMPANY_OWNER only
│   └── Manage AI provider settings, API keys
├── AIConversationController   # All authenticated users
│   └── Chat functionality, conversation management
├── AIContextController        # COMPANY_OWNER & EMPLOYEE with permissions
│   └── Knowledge base management
└── TokenUsageController       # Role-based read access
    └── Usage statistics and reporting
```

### Admin-Only Controller

```typescript
@Controller('modules/ai-agent/admin/configuration')
@ApiTags('AI Agent - Admin Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COMPANY_OWNER)
export class AIConfigurationController {
  @Post()
  @ApiOperation({ summary: 'Create AI configuration (Admin/Owner only)' })
  async create(@Body() createDto: CreateAIConfigurationDto, @CurrentUser() user: User) {
    return this.configService.create(createDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update AI configuration' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAIConfigurationDto,
    @CurrentUser() user: User
  ) {
    return this.configService.update(id, updateDto, user);
  }
}
```

### User-Facing Controller

```typescript
@Controller('modules/ai-agent/chat')
@ApiTags('AI Agent - Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class AIConversationController {
  @Get()
  @RequirePermission('ai-agent', Permission.READ)
  @ApiOperation({ summary: 'List user conversations' })
  async findAll(@CurrentUser() user: User) {
    return this.conversationService.findAllByUser(user);
  }

  @Post()
  @RequirePermission('ai-agent', Permission.WRITE)
  @ApiOperation({ summary: 'Start new conversation' })
  async create(@Body() createDto: CreateConversationDto, @CurrentUser() user: User) {
    return this.conversationService.create(createDto, user);
  }

  @Post(':id/message')
  @RequirePermission('ai-agent', Permission.WRITE)
  @ApiOperation({ summary: 'Send message in conversation' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() messageDto: SendMessageDto,
    @CurrentUser() user: User
  ) {
    return this.chatService.chat(conversationId, messageDto.content, user);
  }
}
```

### Statistics Controller with Role-Based Access

```typescript
@Controller('modules/ai-agent/usage')
@ApiTags('AI Agent - Usage Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TokenUsageController {
  @Get('my-usage')
  @ApiOperation({ summary: 'Get current user usage statistics' })
  async getMyUsage(@CurrentUser() user: User) {
    return this.usageService.getUserUsage(user.id);
  }

  @Get('company')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.COMPANY_OWNER)
  @ApiOperation({ summary: 'Get company-wide usage (Owner/Admin only)' })
  async getCompanyUsage(@CurrentUser() user: User) {
    return this.usageService.getCompanyUsage(user.companyId);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all companies usage (Admin only)' })
  async getAllUsage() {
    return this.usageService.getAllUsage();
  }
}
```

### Module Registration with Multiple Controllers

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIConfiguration,
      AIConversation,
      AIMessage,
      AIContext,
      TokenUsage,
      TokenLimit,
    ]),
    RBACModule,
  ],
  controllers: [
    AIConfigurationController,
    AIConversationController,
    AIContextController,
    TokenUsageController,
  ],
  providers: [
    AIConfigurationService,
    AIConversationService,
    AIChatService,
    AIContextService,
    TokenUsageService,
    OpenAIProviderService,
    OpenRouterProviderService,
  ],
  exports: [AIConfigurationService, AIChatService, TokenUsageService],
})
export class AIAgentModule {}
```

---

> **Next:** [Troubleshooting](./10-troubleshooting.md)
