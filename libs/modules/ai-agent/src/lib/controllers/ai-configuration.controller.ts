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
import { CreateAIConfigurationDto } from '../dto/create-ai-configuration.dto';
import { UpdateAIConfigurationDto } from '../dto/update-ai-configuration.dto';
import { AIConfigurationResponseDto } from '../dto/ai-configuration-response.dto';

@ApiTags('ai-agent')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ai-agent/config')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class AIConfigurationController {
  constructor(private readonly configService: AIConfigurationService) {}

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

    // Don't return the actual API key for security
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
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

    // Don't return the actual API key
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
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

    // Don't return the actual API key
    return {
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
    };
  }
}
