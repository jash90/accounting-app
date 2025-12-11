import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AIConfiguration,
  AIConversation,
  AIMessage,
  AIContext,
  TokenUsage,
  TokenLimit,
  User,
  Company,
} from '@accounting/common';
import { RBACModule } from '@accounting/rbac';
import { AIConfigurationController } from './controllers/ai-configuration.controller';
import { AIConversationController } from './controllers/ai-conversation.controller';
import { TokenUsageController } from './controllers/token-usage.controller';
import { AIConfigurationService } from './services/ai-configuration.service';
import { AIConversationService } from './services/ai-conversation.service';
import { TokenUsageService } from './services/token-usage.service';
import { TokenLimitService } from './services/token-limit.service';
import { OpenAIProviderService } from './services/openai-provider.service';
import { OpenRouterProviderService } from './services/openrouter-provider.service';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import { OpenAIModelsService } from './services/openai-models.service';
import { RAGService } from './services/rag.service';
import { SystemCompanyService } from './services/system-company.service';

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
  ],
  controllers: [
    AIConfigurationController,
    AIConversationController,
    TokenUsageController,
  ],
  providers: [
    SystemCompanyService,
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
  ],
})
export class AIAgentModule {}
