import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@accounting/auth';
import { ModuleAccessGuard, PermissionGuard, RequireModule } from '@accounting/rbac';
import { User } from '@accounting/common';
import { AIConfigurationService } from '../services/ai-configuration.service';
import { OpenRouterModelsService, OpenRouterModel } from '../services/openrouter-models.service';
import { OpenAIModelsService, OpenAIModel } from '../services/openai-models.service';
import { CreateAIConfigurationDto } from '../dto/create-ai-configuration.dto';
import { UpdateAIConfigurationDto } from '../dto/update-ai-configuration.dto';
import { AIConfigurationResponseDto } from '../dto/ai-configuration-response.dto';
import { OpenAIModelDto } from '../dto/openai-model.dto';

@ApiTags('ai-agent')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ai-agent/config')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class AIConfigurationController {
  constructor(
    private readonly configService: AIConfigurationService,
    private readonly modelsService: OpenRouterModelsService,
    private readonly openaiModelsService: OpenAIModelsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get AI configuration',
    description: 'Retrieve the AI agent configuration for the current user\'s company. ADMIN users get System Admin company configuration. API key is not returned for security.',
  })
  @ApiOkResponse({
    description: 'Configuration retrieved successfully',
    type: AIConfigurationResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Configuration not found - AI agent not configured yet',
  })
  @ApiForbiddenResponse({
    description: 'No access to ai-agent module',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getConfiguration(@CurrentUser() user: User) {
    const config = await this.configService.getConfiguration(user);
    if (!config) {
      return null;
    }

    // Don't return the actual API keys for security
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
      hasEmbeddingApiKey: !!config.embeddingApiKey,
      embeddingApiKey: undefined,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create AI configuration',
    description: 'Create AI agent configuration. **ADMIN only**. Sets up the AI provider, model, system prompt, and API key for the System Admin company.',
  })
  @ApiBody({
    type: CreateAIConfigurationDto,
    description: 'Configuration data',
  })
  @ApiCreatedResponse({
    description: 'Configuration created successfully',
    type: AIConfigurationResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Only ADMIN users can create configuration, or configuration already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async create(
    @Body() createDto: CreateAIConfigurationDto,
    @CurrentUser() user: User,
  ) {
    const config = await this.configService.create(createDto, user);

    // Don't return the actual API keys
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
      hasEmbeddingApiKey: !!config.embeddingApiKey,
      embeddingApiKey: undefined,
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'Update AI configuration',
    description: 'Update AI agent configuration. **ADMIN only**. Partial updates supported. API key is re-encrypted if provided.',
  })
  @ApiBody({
    type: UpdateAIConfigurationDto,
    description: 'Fields to update',
  })
  @ApiOkResponse({
    description: 'Configuration updated successfully',
    type: AIConfigurationResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Only ADMIN users can update configuration',
  })
  @ApiNotFoundResponse({
    description: 'Configuration not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async update(
    @Body() updateDto: UpdateAIConfigurationDto,
    @CurrentUser() user: User,
  ) {
    const config = await this.configService.update(updateDto, user);

    // Don't return the actual API keys
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
      hasEmbeddingApiKey: !!config.embeddingApiKey,
      embeddingApiKey: undefined,
    };
  }

  @Post('reset-api-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset (clear) API key',
    description: 'Clear the current API key. **ADMIN only**. After reset, AI features will be disabled until a new API key is configured.',
  })
  @ApiOkResponse({
    description: 'API key cleared successfully',
    type: AIConfigurationResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Only ADMIN users can reset API key',
  })
  @ApiNotFoundResponse({
    description: 'Configuration not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async resetApiKey(@CurrentUser() user: User) {
    const config = await this.configService.resetApiKey(user);

    return {
      ...config,
      hasApiKey: false,
      apiKey: undefined,
      hasEmbeddingApiKey: !!config.embeddingApiKey,
      embeddingApiKey: undefined,
    };
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get available OpenRouter models',
    description: 'Retrieve list of available AI models from OpenRouter. Results are cached for 1 hour. Falls back to curated list if API unavailable.',
  })
  @ApiOkResponse({
    description: 'Models retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'anthropic/claude-3.5-sonnet' },
          name: { type: 'string', example: 'Claude 3.5 Sonnet' },
          provider: { type: 'string', example: 'Anthropic' },
          contextWindow: { type: 'number', example: 200000 },
          maxOutputTokens: { type: 'number', example: 8192 },
          costPer1kInput: { type: 'number', example: 3.0 },
          costPer1kOutput: { type: 'number', example: 15.0 },
          supportsVision: { type: 'boolean', example: true },
          supportsFunctionCalling: { type: 'boolean', example: true },
          description: { type: 'string', example: 'Most intelligent model' },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'No access to ai-agent module',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getModels(): Promise<OpenRouterModel[]> {
    return this.modelsService.getModels();
  }

  @Get('openai-models')
  @ApiOperation({
    summary: 'Get available OpenAI chat models',
    description: 'Retrieve list of available chat models from OpenAI. Results are cached for 1 hour. Falls back to curated list if API unavailable. Requires valid API key in configuration.',
  })
  @ApiOkResponse({
    description: 'Models retrieved successfully',
    type: [OpenAIModelDto],
  })
  @ApiForbiddenResponse({
    description: 'No access to ai-agent module',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getOpenAIModels(@CurrentUser() user: User): Promise<OpenAIModel[]> {
    // Try to get API key from configuration, if available
    let apiKey: string | undefined;
    try {
      apiKey = await this.configService.getDecryptedApiKey(user);
    } catch {
      // No API key configured - return default models
    }

    if (!apiKey) {
      return this.openaiModelsService.getDefaultChatModels();
    }

    return this.openaiModelsService.getChatModels(apiKey);
  }

  @Get('openai-embedding-models')
  @ApiOperation({
    summary: 'Get available OpenAI embedding models',
    description: 'Retrieve list of available embedding models from OpenAI. Results are cached for 1 hour. Falls back to curated list if API unavailable. Requires valid API key in configuration.',
  })
  @ApiOkResponse({
    description: 'Embedding models retrieved successfully',
    type: [OpenAIModelDto],
  })
  @ApiForbiddenResponse({
    description: 'No access to ai-agent module',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getOpenAIEmbeddingModels(@CurrentUser() user: User): Promise<OpenAIModel[]> {
    // Try to get API key from configuration, if available
    let apiKey: string | undefined;
    try {
      apiKey = await this.configService.getDecryptedApiKey(user);
    } catch {
      // No API key configured - return default models
    }

    if (!apiKey) {
      return this.openaiModelsService.getDefaultEmbeddingModels();
    }

    return this.openaiModelsService.getEmbeddingModels(apiKey);
  }
}
