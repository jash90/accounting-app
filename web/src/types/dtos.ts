import { UserRole } from './enums';
import { User, Company, Module, SimpleText } from './entities';

// Re-export for external consumers
export { UserRole };

// Auth DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: string;
}

export interface AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: UserDto;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

// User DTOs
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  companyId?: string;
  isActive?: boolean;
}

// Company DTOs
export interface CompanyDto {
  id: string;
  name: string;
  ownerId: string;
  owner?: UserDto;
  isActive: boolean;
  isSystemCompany: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyDto {
  name: string;
  ownerId: string;
}

export interface UpdateCompanyDto {
  name?: string;
  isActive?: boolean;
}

// Module DTOs
export interface ModuleDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateModuleDto {
  name: string;
  slug: string;
  description: string;
}

export interface UpdateModuleDto {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

// Employee DTOs
export interface CreateEmployeeDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateEmployeeDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

// Permission DTOs
export interface GrantModuleAccessDto {
  moduleSlug: string;
  permissions: string[];
}

export interface UpdateModulePermissionDto {
  permissions: string[];
}

export enum PermissionTargetType {
  COMPANY = 'company',
  EMPLOYEE = 'employee',
}

export interface ManageModulePermissionDto {
  targetType: PermissionTargetType;
  targetId: string;
  moduleSlug: string;
  permissions?: string[];
}

// SimpleText DTOs
export interface CreateSimpleTextDto {
  content: string;
}

export interface UpdateSimpleTextDto {
  content?: string;
}

export interface SimpleTextResponseDto {
  id: string;
  content: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// AI Agent DTOs

// Enums
export enum AIProvider {
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// AI Configuration DTOs
export interface AIConfigurationResponseDto {
  id: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  provider: AIProvider;
  model: string;
  systemPrompt: string | null;
  hasApiKey: boolean;  // API key status indicator (actual key is never returned)
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean;  // Enable real-time token streaming via SSE
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider: AIProvider | null;
  hasEmbeddingApiKey: boolean;  // Separate embedding API key status indicator
  embeddingModel: string | null;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  updatedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAIConfigurationDto {
  provider: AIProvider;
  model: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableStreaming?: boolean;
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider?: AIProvider;
  embeddingApiKey?: string;
  embeddingModel?: string;
}

export interface UpdateAIConfigurationDto {
  provider?: AIProvider;
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableStreaming?: boolean;
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider?: AIProvider;
  embeddingApiKey?: string;
  embeddingModel?: string;
}

// Conversation DTOs
export interface AIMessageDto {
  id: string;
  role: MessageRole;
  content: string;
  totalTokens: number;
  createdAt: Date;
}

export interface ConversationResponseDto {
  id: string;
  title: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  messages: AIMessageDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDto {
  title?: string;
}

export interface SendMessageDto {
  content: string;
}

// Streaming DTOs
export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  error?: string;
}

// Context/RAG DTOs
export interface AIContextResponseDto {
  id: string;
  filename: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
  extractedText: string;
  isActive: boolean;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  uploadedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Token Usage DTOs
export interface TokenUsageResponseDto {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  conversationId: string;
  messageId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  provider: AIProvider;
  createdAt: Date;
}

export interface TokenUsageSummaryDto {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  conversationCount: number;
  messageCount: number;
  byUser?: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    totalTokens: number;
  }[];
}

export interface CompanyTokenUsageDto {
  companyId: string;
  companyName: string;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  userCount: number;
  conversationCount: number;
  messageCount: number;
  users: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    conversationCount: number;
    messageCount: number;
  }[];
}

export interface SetTokenLimitDto {
  targetType: 'company' | 'user';
  targetId: string;
  monthlyLimit: number;
}

export interface TokenLimitResponseDto {
  id: string;
  companyId: string | null;
  userId: string | null;
  monthlyLimit: number;
  currentUsage: number;
  resetDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// OpenRouter Model DTOs
export interface OpenRouterModelDto {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  description?: string;
}

// OpenAI Model DTOs
export interface OpenAIModelDto {
  id: string;
  name: string;
  description: string;
  created?: number;
}

