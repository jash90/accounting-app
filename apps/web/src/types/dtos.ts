import {
  UserRole,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  CustomFieldType,
  AutoAssignCondition,
  AmlGroup,
  TaskStatus,
  TaskPriority,
  TaskDependencyType,
} from './enums';
import {
  Client,
  ClientFieldDefinition,
  ClientIcon,
  NotificationSettings,
  ChangeLog,
  Task,
  TaskLabel,
  TaskComment,
  TaskDependency,
  AcceptanceCriterion,
} from './entities';

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
  companyName?: string;
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

// Email Configuration DTOs
export interface EmailConfigResponseDto {
  id: string;
  userId: string | null;
  companyId: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  imapUser: string;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailConfigDto {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  imapUser: string;
  imapPassword: string;
  displayName?: string;
}

export interface UpdateEmailConfigDto {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  imapHost?: string;
  imapPort?: number;
  imapTls?: boolean;
  imapUser?: string;
  imapPassword?: string;
  displayName?: string;
}

export interface TestSmtpDto {
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPassword: string;
}

export interface TestImapDto {
  imapHost: string;
  imapPort: number;
  imapTls?: boolean;
  imapUser: string;
  imapPassword: string;
}

export interface TestConnectionResultDto {
  success: boolean;
  message: string;
}


// Client DTOs
export interface CreateClientDto {
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  companyStartDate?: Date;
  cooperationStartDate?: Date;
  suspensionDate?: Date;
  companySpecificity?: string;
  additionalInfo?: string;
  gtuCode?: string;
  gtuCodes?: string[];
  amlGroup?: string;
  amlGroupEnum?: AmlGroup;
  receiveEmailCopy?: boolean;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {}

export interface ClientFiltersDto {
  search?: string;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
  isActive?: boolean;
}

export interface SetCustomFieldValuesDto {
  values: Record<string, string | null>;
}

export interface ClientResponseDto extends Client {
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  updatedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

// Client Field Definition DTOs
export interface CreateClientFieldDefinitionDto {
  name: string;
  label: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  enumValues?: string[];
  displayOrder?: number;
}

export interface UpdateClientFieldDefinitionDto extends Partial<CreateClientFieldDefinitionDto> {
  isActive?: boolean;
}

export interface ClientFieldDefinitionResponseDto extends ClientFieldDefinition {}

// Client Icon DTOs
export interface CreateClientIconDto {
  name: string;
  color?: string;
  iconType?: 'lucide' | 'custom' | 'emoji';
  iconValue?: string;
  tooltip?: string;
  autoAssignCondition?: AutoAssignCondition;
}

export interface UpdateClientIconDto {
  name?: string;
  color?: string;
  iconType?: 'lucide' | 'custom' | 'emoji';
  iconValue?: string;
  tooltip?: string;
  isActive?: boolean;
  autoAssignCondition?: AutoAssignCondition | null;
}

export interface ClientIconResponseDto extends ClientIcon {}

// Notification Settings DTOs
export interface CreateNotificationSettingsDto {
  receiveOnCreate?: boolean;
  receiveOnUpdate?: boolean;
  receiveOnDelete?: boolean;
  isAdminCopy?: boolean;
}

export interface UpdateNotificationSettingsDto extends CreateNotificationSettingsDto {}

export interface NotificationSettingsResponseDto extends NotificationSettings {}

// Change Log DTOs
export interface ChangeLogResponseDto extends ChangeLog {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Task DTOs
export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | string;
  startDate?: Date | string;
  estimatedMinutes?: number;
  storyPoints?: number;
  acceptanceCriteria?: AcceptanceCriterion[];
  clientId?: string;
  assigneeId?: string;
  parentTaskId?: string;
  labelIds?: string[];
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  isActive?: boolean;
}

export interface TaskFiltersDto {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  clientId?: string;
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ReorderTasksDto {
  taskIds: string[];
  status?: TaskStatus;
}

export interface BulkUpdateStatusDto {
  taskIds: string[];
  status: TaskStatus;
}

export interface TaskResponseDto extends Task {
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  client?: {
    id: string;
    name: string;
  };
}

export interface KanbanBoardDto {
  [status: string]: TaskResponseDto[];
}

export interface CalendarTaskDto {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  startDate?: Date;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Task Label DTOs
export interface CreateTaskLabelDto {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTaskLabelDto extends Partial<CreateTaskLabelDto> {
  isActive?: boolean;
}

export interface TaskLabelResponseDto extends TaskLabel {}

export interface AssignLabelDto {
  labelId: string;
}

// Task Comment DTOs
export interface CreateTaskCommentDto {
  content: string;
}

export interface UpdateTaskCommentDto {
  content: string;
}

export interface TaskCommentResponseDto extends TaskComment {
  author?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Task Dependency DTOs
export interface CreateTaskDependencyDto {
  dependsOnTaskId: string;
  dependencyType: TaskDependencyType;
}

export interface TaskDependencyResponseDto extends TaskDependency {
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  dependsOnTask?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

// =============================================
// Time Tracking DTOs
// =============================================

import {
  TimeEntry,
  TimeSettings,
} from './entities';
import {
  TimeEntryStatus,
  TimeRoundingMethod,
} from './enums';

// Time Entry DTOs
export interface CreateTimeEntryDto {
  description?: string;
  startTime: Date | string;
  endTime?: Date | string;
  durationMinutes?: number;
  isBillable?: boolean;
  hourlyRate?: number;
  currency?: string;
  tags?: string[];
  clientId?: string;
  taskId?: string;
}

export interface UpdateTimeEntryDto extends Partial<CreateTimeEntryDto> {}

export interface TimeEntryFiltersDto {
  search?: string;
  status?: TimeEntryStatus;
  isBillable?: boolean;
  clientId?: string;
  taskId?: string;
  userId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isRunning?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface TimeEntryResponseDto extends TimeEntry {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  client?: {
    id: string;
    name: string;
  };
  task?: {
    id: string;
    title: string;
  };
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Timer DTOs
export interface StartTimerDto {
  description?: string;
  clientId?: string;
  taskId?: string;
  isBillable?: boolean;
  tags?: string[];
}

export interface StopTimerDto {
  description?: string;
  isBillable?: boolean;
}

export interface UpdateTimerDto {
  description?: string;
  clientId?: string;
  taskId?: string;
  isBillable?: boolean;
  tags?: string[];
}

// Approval DTOs
export interface SubmitTimeEntryDto {}

export interface ApproveTimeEntryDto {}

export interface RejectTimeEntryDto {
  rejectionNote: string;
}

// Time Settings DTOs
export interface UpdateTimeSettingsDto {
  roundingMethod?: TimeRoundingMethod;
  roundingIntervalMinutes?: number;
  defaultHourlyRate?: number;
  defaultCurrency?: string;
  requireApproval?: boolean;
  allowOverlappingEntries?: boolean;
  workingHoursPerDay?: number;
  workingHoursPerWeek?: number;
  weekStartDay?: number;
  allowTimerMode?: boolean;
  allowManualEntry?: boolean;
  autoStopTimerAfterMinutes?: number;
  minimumEntryMinutes?: number;
  maximumEntryMinutes?: number;
  enableDailyReminder?: boolean;
  dailyReminderTime?: string;
  lockEntriesAfterDays?: number;
}

export interface TimeSettingsResponseDto extends TimeSettings {
  updatedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Timesheet DTOs
export interface TimesheetSummary {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
  entriesCount: number;
}

export interface TimesheetDayDto {
  date: string;
  entries: TimeEntryResponseDto[];
  totalMinutes: number;
  billableMinutes: number;
  totalAmount: number;
}

export interface DailyTimesheetDto {
  date: string;
  entries: TimeEntryResponseDto[];
  summary: TimesheetSummary;
}

export interface WeeklyTimesheetDto {
  weekStart: string;
  weekEnd: string;
  days: TimesheetDayDto[];
  summary: TimesheetSummary;
}

// Report DTOs
export interface TimeSummaryReportDto {
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
  entryCount: number;
  byClient?: {
    clientId: string;
    clientName: string;
    totalMinutes: number;
    totalAmount: number;
  }[];
  byUser?: {
    userId: string;
    userName: string;
    totalMinutes: number;
    totalAmount: number;
  }[];
}

export interface TimeByClientReportDto {
  clientId: string;
  clientName: string;
  totalMinutes: number;
  billableMinutes: number;
  totalAmount: number;
  entryCount: number;
}

