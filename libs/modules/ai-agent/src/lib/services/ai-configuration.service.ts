import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIConfiguration, User, UserRole } from '@accounting/common';
import { CreateAIConfigurationDto } from '../dto/create-ai-configuration.dto';
import { UpdateAIConfigurationDto } from '../dto/update-ai-configuration.dto';
import { SystemCompanyService } from './system-company.service';
import * as crypto from 'crypto';

@Injectable()
export class AIConfigurationService {
  private readonly ENCRYPTION_KEY: string;
  private readonly ALGORITHM = 'aes-256-cbc';

  constructor(
    @InjectRepository(AIConfiguration)
    private configRepository: Repository<AIConfiguration>,
    private systemCompanyService: SystemCompanyService,
  ) {
    const encryptionKey = process.env.AI_API_KEY_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('AI_API_KEY_ENCRYPTION_KEY environment variable is required but not set');
    }
    if (Buffer.byteLength(encryptionKey, 'utf8') !== 32) {
      throw new Error(
        `AI_API_KEY_ENCRYPTION_KEY must be exactly 32 bytes for AES-256-CBC. Current length: ${Buffer.byteLength(encryptionKey, 'utf8')} bytes`
      );
    }
    this.ENCRYPTION_KEY = encryptionKey;
  }

  /**
   * Encrypt API key
   */
  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      iv,
    );
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt API key
   */
  private decryptApiKey(encryptedKey: string): string {
    try {
      if (!encryptedKey || !encryptedKey.includes(':')) {
        throw new Error('Invalid encrypted key format');
      }

      const [ivHex, encrypted] = encryptedKey.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted key format: missing IV or encrypted data');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPTION_KEY),
        iv,
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('API key decryption failed:', error instanceof Error ? error.message : error);
      throw new BadRequestException(
        'Failed to decrypt API key. The key may be corrupted. Please reconfigure the API key in settings.',
      );
    }
  }

  /**
   * Get global AI configuration
   * All users (ADMIN, COMPANY_OWNER, EMPLOYEE) use the same config
   * stored under System Admin company
   */
  async getConfiguration(user: User): Promise<AIConfiguration | null> {
    // Global config - all users use the admin's configuration
    const systemCompanyId = await this.systemCompanyService.getSystemCompanyId();

    const config = await this.configRepository.findOne({
      where: { companyId: systemCompanyId },
      relations: ['createdBy', 'updatedBy', 'company'],
    });

    return config;
  }

  /**
   * Create configuration (ADMIN only)
   */
  async create(
    createDto: CreateAIConfigurationDto,
    user: User,
  ): Promise<AIConfiguration> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create AI configuration');
    }

    const systemCompanyId = await this.systemCompanyService.getSystemCompanyId();

    // Check if configuration already exists
    const existing = await this.configRepository.findOne({
      where: { companyId: systemCompanyId },
    });

    if (existing) {
      throw new ConflictException('Configuration already exists. Use update instead.');
    }

    // Encrypt API key
    const encryptedApiKey = this.encryptApiKey(createDto.apiKey);

    // Encrypt embedding API key if provided
    const encryptedEmbeddingApiKey = createDto.embeddingApiKey
      ? this.encryptApiKey(createDto.embeddingApiKey)
      : null;

    const config = this.configRepository.create({
      ...createDto,
      apiKey: encryptedApiKey,
      embeddingApiKey: encryptedEmbeddingApiKey,
      companyId: systemCompanyId,
      createdById: user.id,
      updatedById: user.id,
    });

    const saved = await this.configRepository.save(config);

    return this.configRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'updatedBy', 'company'],
    }) as Promise<AIConfiguration>;
  }

  /**
   * Update configuration (ADMIN only)
   */
  async update(
    updateDto: UpdateAIConfigurationDto,
    user: User,
  ): Promise<AIConfiguration> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update AI configuration');
    }

    const config = await this.getConfiguration(user);
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }

    // Update fields
    if (updateDto.provider !== undefined) config.provider = updateDto.provider;
    if (updateDto.model !== undefined) config.model = updateDto.model;
    if (updateDto.systemPrompt !== undefined) config.systemPrompt = updateDto.systemPrompt;
    if (updateDto.temperature !== undefined) config.temperature = updateDto.temperature;
    if (updateDto.maxTokens !== undefined) config.maxTokens = updateDto.maxTokens;
    if (updateDto.enableStreaming !== undefined) config.enableStreaming = updateDto.enableStreaming;

    // Encrypt new API key if provided
    if (updateDto.apiKey !== undefined) {
      config.apiKey = this.encryptApiKey(updateDto.apiKey);
    }

    // Update embedding configuration
    if (updateDto.embeddingProvider !== undefined) config.embeddingProvider = updateDto.embeddingProvider;
    if (updateDto.embeddingModel !== undefined) config.embeddingModel = updateDto.embeddingModel;

    // Encrypt new embedding API key if provided
    if (updateDto.embeddingApiKey !== undefined) {
      config.embeddingApiKey = this.encryptApiKey(updateDto.embeddingApiKey);
    }

    config.updatedById = user.id;

    const saved = await this.configRepository.save(config);

    return this.configRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'updatedBy', 'company'],
    }) as Promise<AIConfiguration>;
  }

  /**
   * Get decrypted API key (internal use only)
   */
  async getDecryptedApiKey(user: User): Promise<string> {
    const config = await this.getConfiguration(user);
    if (!config) {
      throw new NotFoundException('AI configuration not found. Please configure the AI agent first.');
    }
    return this.decryptApiKey(config.apiKey);
  }

  /**
   * Get decrypted embedding API key (internal use only)
   * Falls back to main API key if no separate embedding key is configured
   */
  async getDecryptedEmbeddingApiKey(user: User): Promise<string> {
    const config = await this.getConfiguration(user);
    if (!config) {
      throw new NotFoundException('AI configuration not found. Please configure the AI agent first.');
    }

    // If separate embedding API key is configured, use it
    if (config.embeddingApiKey) {
      return this.decryptApiKey(config.embeddingApiKey);
    }

    // Fall back to main API key only if it exists
    if (config.apiKey) {
      return this.decryptApiKey(config.apiKey);
    }

    // No API key available
    throw new BadRequestException('No API key configured. Please configure an API key in AI settings.');
  }

  /**
   * Reset (clear) API key (ADMIN only)
   * This clears the API key, requiring reconfiguration before AI can be used
   */
  async resetApiKey(user: User): Promise<AIConfiguration> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reset API key');
    }

    const config = await this.getConfiguration(user);
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }

    if (!config.apiKey) {
      throw new BadRequestException('API key is not configured');
    }

    config.apiKey = null;
    config.updatedById = user.id;

    const saved = await this.configRepository.save(config);

    return this.configRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'updatedBy', 'company'],
    }) as Promise<AIConfiguration>;
  }

  /**
   * Get embedding configuration for RAG operations
   */
  async getEmbeddingConfig(user: User): Promise<{
    apiKey: string;
    model: string;
    provider: string;
  }> {
    const config = await this.getConfiguration(user);
    if (!config) {
      throw new NotFoundException('AI configuration not found. Please configure the AI agent first.');
    }

    // Get embedding API key (separate or fallback to main)
    let embeddingApiKey: string;
    if (config.embeddingApiKey) {
      embeddingApiKey = this.decryptApiKey(config.embeddingApiKey);
    } else if (config.apiKey) {
      embeddingApiKey = this.decryptApiKey(config.apiKey);
    } else {
      throw new BadRequestException('No API key configured. Please configure an API key in AI settings to use embedding features.');
    }

    // Get embedding model (default to text-embedding-ada-002)
    const embeddingModel = config.embeddingModel || 'text-embedding-ada-002';

    // Get embedding provider (default to OpenAI since OpenRouter doesn't support embeddings)
    const embeddingProvider = config.embeddingProvider || 'openai';

    return {
      apiKey: embeddingApiKey,
      model: embeddingModel,
      provider: embeddingProvider,
    };
  }
}
