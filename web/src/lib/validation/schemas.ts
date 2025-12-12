import { z } from 'zod';
import { UserRole } from '@/types/enums';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().uuid().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// User Schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().uuid().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  companyId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  ownerId: z.string().uuid('Invalid owner ID'),
});

export type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;

// Module Schemas
export const createModuleSchema = z.object({
  name: z.string().min(1, 'Module name is required'),
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(1, 'Description is required'),
});

export type CreateModuleFormData = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateModuleFormData = z.infer<typeof updateModuleSchema>;

// Employee Schemas
export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

// Permission Schemas
export const grantModuleAccessSchema = z.object({
  moduleSlug: z.string().min(1, 'Module slug is required'),
  permissions: z.array(z.enum(['read', 'write', 'delete'])).min(1, 'At least one permission is required'),
});

export type GrantModuleAccessFormData = z.infer<typeof grantModuleAccessSchema>;

// SimpleText Schemas
export const createSimpleTextSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
});

export type CreateSimpleTextFormData = z.infer<typeof createSimpleTextSchema>;

export const updateSimpleTextSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
});

export type UpdateSimpleTextFormData = z.infer<typeof updateSimpleTextSchema>;

// AI Agent Schemas

// AI Configuration Schemas
export const createAIConfigurationSchema = z.object({
  provider: z.enum(['openai', 'openrouter'], { message: 'Provider is required' }),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  enableStreaming: z.boolean().optional(),
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider: z.enum(['openai', 'openrouter']).optional(),
  embeddingApiKey: z.string().optional(),
  embeddingModel: z.string().optional(),
});

export type CreateAIConfigurationFormData = z.infer<typeof createAIConfigurationSchema>;

export const updateAIConfigurationSchema = z.object({
  provider: z.enum(['openai', 'openrouter']).optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  enableStreaming: z.boolean().optional(),
  // Embedding configuration (for RAG/Knowledge Base)
  embeddingProvider: z.enum(['openai', 'openrouter']).optional(),
  embeddingApiKey: z.string().optional(),
  embeddingModel: z.string().optional(),
});

export type UpdateAIConfigurationFormData = z.infer<typeof updateAIConfigurationSchema>;

// Conversation Schemas
export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export type CreateConversationFormData = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message is too long'),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;

// Context/File Upload Schemas
export const uploadContextFileSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['application/pdf', 'text/plain', 'text/markdown'].includes(file.type),
      'Only PDF, TXT, and MD files are allowed'
    ),
});

export type UploadContextFileFormData = z.infer<typeof uploadContextFileSchema>;

// Token Limit Schemas
export const setTokenLimitSchema = z.object({
  targetType: z.enum(['company', 'user'], { message: 'Target type is required' }),
  targetId: z.string().uuid('Invalid target ID'),
  monthlyLimit: z.number().int().min(0, 'Monthly limit must be non-negative'),
});

export type SetTokenLimitFormData = z.infer<typeof setTokenLimitSchema>;

// Client Schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Nazwa klienta jest wymagana').max(255),
  nip: z.string().max(20).optional(),
  email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  companyStartDate: z.date().optional().nullable(),
  cooperationStartDate: z.date().optional().nullable(),
  suspensionDate: z.date().optional().nullable(),
  companySpecificity: z.string().optional(),
  additionalInfo: z.string().optional(),
  gtuCode: z.string().max(10).optional(),
  amlGroup: z.string().max(50).optional(),
  employmentType: z.enum(['DG', 'DG_ETAT', 'DG_AKCJONARIUSZ', 'DG_HALF_TIME_BELOW_MIN', 'DG_HALF_TIME_ABOVE_MIN']).optional(),
  vatStatus: z.enum(['VAT_MONTHLY', 'VAT_QUARTERLY', 'NO', 'NO_WATCH_LIMIT']).optional(),
  taxScheme: z.enum(['PIT_17', 'PIT_19', 'LUMP_SUM', 'GENERAL']).optional(),
  zusStatus: z.enum(['FULL', 'PREFERENTIAL', 'NONE']).optional(),
});

export type CreateClientFormData = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();

export type UpdateClientFormData = z.infer<typeof updateClientSchema>;

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
  employmentType: z.enum(['DG', 'DG_ETAT', 'DG_AKCJONARIUSZ', 'DG_HALF_TIME_BELOW_MIN', 'DG_HALF_TIME_ABOVE_MIN']).optional(),
  vatStatus: z.enum(['VAT_MONTHLY', 'VAT_QUARTERLY', 'NO', 'NO_WATCH_LIMIT']).optional(),
  taxScheme: z.enum(['PIT_17', 'PIT_19', 'LUMP_SUM', 'GENERAL']).optional(),
  zusStatus: z.enum(['FULL', 'PREFERENTIAL', 'NONE']).optional(),
  isActive: z.boolean().optional(),
});

export type ClientFiltersFormData = z.infer<typeof clientFiltersSchema>;

// Client Field Definition Schemas
export const createClientFieldDefinitionSchema = z.object({
  name: z.string().min(1, 'Nazwa pola jest wymagana').max(100),
  label: z.string().min(1, 'Etykieta pola jest wymagana').max(200),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'ENUM'], { required_error: 'Typ pola jest wymagany' }),
  isRequired: z.boolean().default(false),
  enumValues: z.array(z.string()).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateClientFieldDefinitionFormData = z.infer<typeof createClientFieldDefinitionSchema>;

export const updateClientFieldDefinitionSchema = createClientFieldDefinitionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateClientFieldDefinitionFormData = z.infer<typeof updateClientFieldDefinitionSchema>;

// Auto-Assign Condition Schema
const singleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty', 'in', 'notIn', 'between']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  secondValue: z.union([z.string(), z.number()]).optional(),
});

const conditionGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    logicalOperator: z.enum(['and', 'or']),
    conditions: z.array(z.union([singleConditionSchema, conditionGroupSchema])),
  })
);

const autoAssignConditionSchema = z.union([singleConditionSchema, conditionGroupSchema]);

// Client Icon Schemas
export const createClientIconSchema = z.object({
  name: z.string().min(1, 'Nazwa ikony jest wymagana').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Nieprawidłowy format koloru').optional().or(z.literal('')),
  iconType: z.enum(['lucide', 'custom', 'emoji'], { required_error: 'Wybierz typ ikony' }),
  iconValue: z.string().optional(),
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Rozmiar pliku nie może przekraczać 5MB')
    .refine(
      (file) => ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type),
      'Dozwolone są tylko pliki PNG, JPEG, SVG i WebP'
    )
    .optional(),
  autoAssignCondition: autoAssignConditionSchema.optional().nullable(),
}).refine(
  (data) => {
    // For LUCIDE and EMOJI types, iconValue is required
    if (data.iconType === 'lucide' || data.iconType === 'emoji') {
      return !!data.iconValue;
    }
    // For CUSTOM type, file is required
    if (data.iconType === 'custom') {
      return !!data.file;
    }
    return true;
  },
  {
    message: 'Wybierz ikonę lub prześlij plik',
    path: ['iconValue'],
  }
);

export type CreateClientIconFormData = z.infer<typeof createClientIconSchema>;

export const updateClientIconSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal('')),
  iconType: z.enum(['lucide', 'custom', 'emoji']).optional(),
  iconValue: z.string().optional(),
  isActive: z.boolean().optional(),
  autoAssignCondition: autoAssignConditionSchema.optional().nullable(),
});

export type UpdateClientIconFormData = z.infer<typeof updateClientIconSchema>;

// Notification Settings Schemas
export const notificationSettingsSchema = z.object({
  receiveOnCreate: z.boolean().default(false),
  receiveOnUpdate: z.boolean().default(false),
  receiveOnDelete: z.boolean().default(false),
});

export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

