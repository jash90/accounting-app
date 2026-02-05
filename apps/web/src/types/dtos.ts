import {
  type AcceptanceCriterion,
  type ChangeLog,
  type Client,
  type ClientFieldDefinition,
  type ClientIcon,
  type NotificationSettings,
  type Task,
  type TaskComment,
  type TaskDependency,
  type TaskLabel,
  type TimeEntry,
  type TimeSettings,
} from './entities';
// =============================================
// Offers Module DTOs
// =============================================
import {
  UserRole,
  type AmlGroup,
  type AutoAssignCondition,
  type CustomFieldType,
  type EmploymentType,
  type LeadSource,
  type LeadStatus,
  type OfferActivityType,
  type OfferStatus,
  type TaskDependencyType,
  type TaskPriority,
  type TaskStatus,
  type TaxScheme,
  type TimeEntryStatus,
  type TimeRoundingMethod,
  type VatStatus,
  type ZusStatus,
} from './enums';

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
  icon: string | null;
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

// User Module Permission (returned from getEmployeeModules)
export interface UserModulePermission {
  id: string;
  userId: string;
  moduleId: string;
  module: ModuleDto;
  permissions: string[];
  grantedById: string;
  createdAt: Date;
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
  hasApiKey: boolean; // API key status indicator (actual key is never returned)
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean; // Enable real-time token streaming via SSE
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider: AIProvider | null;
  hasEmbeddingApiKey: boolean; // Separate embedding API key status indicator
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
  companySpecificity?: string;
  additionalInfo?: string;
  gtuCode?: string;
  gtuCodes?: string[];
  pkdCode?: string;
  amlGroup?: string;
  amlGroupEnum?: AmlGroup;
  receiveEmailCopy?: boolean;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {}

export interface CustomFieldFilter {
  fieldId: string;
  operator: string;
  value: string | string[];
}

export interface ClientFiltersDto {
  search?: string;
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
  amlGroupEnum?: AmlGroup;
  gtuCode?: string;
  pkdCode?: string;
  receiveEmailCopy?: boolean;
  isActive?: boolean;
  cooperationStartDateFrom?: string;
  cooperationStartDateTo?: string;
  companyStartDateFrom?: string;
  companyStartDateTo?: string;
  customFieldFilters?: CustomFieldFilter[];
  status?: string;
  type?: string;
  assignedUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
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

export interface TaskResponseDto extends Omit<Task, 'createdBy' | 'assignee' | 'client'> {
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

export interface TaskCommentResponseDto extends Omit<TaskComment, 'author'> {
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

export interface TaskDependencyResponseDto extends Omit<TaskDependency, 'task' | 'dependsOnTask'> {
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

export interface TimeEntryResponseDto extends Omit<
  TimeEntry,
  'user' | 'client' | 'task' | 'createdBy' | 'approvedBy'
> {
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

export interface TimeSettingsResponseDto extends Omit<TimeSettings, 'updatedBy'> {
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

// Lead DTOs
export interface CreateLeadDto {
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactPosition?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  notes?: string;
  estimatedValue?: number;
  assignedToId?: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: LeadStatus;
}

export interface LeadFiltersDto {
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  assignedToId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}

export interface LeadResponseDto {
  id: string;
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactPosition?: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source?: LeadSource;
  notes?: string;
  estimatedValue?: number;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  convertedToClientId?: string;
  convertedAt?: Date;
  companyId: string;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ConvertLeadToClientDto {
  clientName?: string;
}

export interface LeadStatisticsDto {
  totalLeads: number;
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
  proposalSentCount: number;
  negotiationCount: number;
  convertedCount: number;
  lostCount: number;
  conversionRate: number;
}

// Offer Template DTOs
export interface OfferPlaceholderDto {
  key: string;
  label: string;
  description?: string;
  defaultValue?: string;
}

export interface OfferServiceItemDto {
  name: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  unit?: string;
}

export interface OfferServiceItemWithAmountDto extends OfferServiceItemDto {
  netAmount: number;
}

export interface CreateOfferTemplateDto {
  name: string;
  description?: string;
  availablePlaceholders?: OfferPlaceholderDto[];
  defaultServiceItems?: OfferServiceItemDto[];
  defaultValidityDays?: number;
  defaultVatRate?: number;
  isDefault?: boolean;
}

export interface UpdateOfferTemplateDto extends Partial<CreateOfferTemplateDto> {
  isActive?: boolean;
}

export interface OfferTemplateFiltersDto {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface OfferTemplateResponseDto {
  id: string;
  name: string;
  description?: string;
  templateFilePath?: string;
  templateFileName?: string;
  availablePlaceholders?: OfferPlaceholderDto[];
  defaultServiceItems?: OfferServiceItemDto[];
  defaultValidityDays: number;
  defaultVatRate: number;
  isDefault: boolean;
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Offer DTOs
export interface ServiceTermsDto {
  items: OfferServiceItemWithAmountDto[];
  paymentTermDays?: number;
  paymentMethod?: string;
  additionalTerms?: string;
}

export interface RecipientSnapshotDto {
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactPosition?: string;
  email?: string;
  phone?: string;
}

export interface CreateOfferDto {
  title: string;
  description?: string;
  clientId?: string;
  leadId?: string;
  templateId?: string;
  vatRate?: number;
  serviceTerms?: {
    items: OfferServiceItemDto[];
    paymentTermDays?: number;
    paymentMethod?: string;
    additionalTerms?: string;
  };
  customPlaceholders?: Record<string, string>;
  offerDate?: string;
  validUntil?: string;
  validityDays?: number;
}

export interface UpdateOfferDto extends Partial<CreateOfferDto> {}

export interface UpdateOfferStatusDto {
  status: OfferStatus;
  reason?: string;
}

export interface SendOfferDto {
  email: string;
  subject?: string;
  body?: string;
  cc?: string[];
}

export interface DuplicateOfferDto {
  clientId?: string;
  leadId?: string;
  title?: string;
}

export interface OfferFiltersDto {
  search?: string;
  status?: OfferStatus;
  statuses?: OfferStatus[];
  clientId?: string;
  leadId?: string;
  offerDateFrom?: string;
  offerDateTo?: string;
  validUntilFrom?: string;
  validUntilTo?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface OfferResponseDto {
  id: string;
  offerNumber: string;
  title: string;
  description?: string;
  status: OfferStatus;
  clientId?: string;
  client?: {
    id: string;
    name: string;
    nip?: string;
  };
  leadId?: string;
  lead?: LeadResponseDto;
  recipientSnapshot: RecipientSnapshotDto;
  templateId?: string;
  template?: {
    id: string;
    name: string;
  };
  totalNetAmount: number;
  vatRate: number;
  totalGrossAmount: number;
  serviceTerms?: ServiceTermsDto;
  customPlaceholders?: Record<string, string>;
  offerDate: Date;
  validUntil: Date;
  generatedDocumentPath?: string;
  generatedDocumentName?: string;
  sentAt?: Date;
  sentToEmail?: string;
  sentById?: string;
  sentBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  emailSubject?: string;
  emailBody?: string;
  companyId: string;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferStatisticsDto {
  totalOffers: number;
  draftCount: number;
  readyCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalValue: number;
  acceptedValue: number;
  conversionRate: number;
}

// Offer Activity DTOs
export interface OfferActivityMetadataDto {
  previousStatus?: OfferStatus;
  newStatus?: OfferStatus;
  documentPath?: string;
  emailRecipient?: string;
  emailSubject?: string;
  comment?: string;
  duplicatedFromOfferId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface OfferActivityResponseDto {
  id: string;
  offerId: string;
  activityType: OfferActivityType;
  description?: string;
  metadata?: OfferActivityMetadataDto;
  performedById: string;
  performedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
}

// Standard placeholders response
export interface StandardPlaceholdersResponseDto {
  placeholders: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}
