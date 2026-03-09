import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AIConfiguration,
  AIContext,
  AIConversation,
  AIMessage,
  Company,
  TokenLimit,
  TokenUsage,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { AIConfigurationController } from './controllers/ai-configuration.controller';
import { AIConversationController } from './controllers/ai-conversation.controller';
import { TokenUsageController } from './controllers/token-usage.controller';
import { AIConfigurationService } from './services/ai-configuration.service';
import { AIConversationService } from './services/ai-conversation.service';
import { OpenAIModelsService } from './services/openai-models.service';
import { OpenAIProviderService } from './services/openai-provider.service';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import { OpenRouterProviderService } from './services/openrouter-provider.service';
import { RAGService } from './services/rag.service';
import { TokenLimitService } from './services/token-limit.service';
import { TokenUsageService } from './services/token-usage.service';

@Module({
  imports: [
    // Register all entities (including Company for System Admin Company pattern)
    TypeOrmModule.forFeature([
      AIConfiguration,
      AIConversation,
      AIMessage,
      AIContext,
      TokenUsage,
      TokenLimit,
      User,
      Company,
    ]),
    // Import RBAC module for guards and decorators
    RBACModule,
    // Import CommonModule for SystemCompanyService
    CommonModule,
  ],
  controllers: [AIConfigurationController, AIConversationController, TokenUsageController],
  providers: [
    // SystemCompanyService is provided by CommonModule
    AIConfigurationService,
    AIConversationService,
    TokenUsageService,
    TokenLimitService,
    OpenAIProviderService,
    OpenRouterProviderService,
    OpenRouterModelsService,
    OpenAIModelsService,
    RAGService,
  ],
  exports: [
    AIConfigurationService,
    AIConversationService,
    TokenUsageService,
    TokenLimitService,
    OpenAIProviderService,
    OpenRouterProviderService,
  ],
})
export class AIAgentModule {}
