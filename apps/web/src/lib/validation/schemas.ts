import { z } from 'zod';
import { UserRole } from '@/types/enums';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().uuid().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// User Schemas
export const createUserSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
  role: z.nativeEnum(UserRole),
  companyId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().uuid().optional()
  ),
  companyName: z.string().optional(),
}).superRefine((data, ctx) => {
  // EMPLOYEE requires companyId
  if (data.role === UserRole.EMPLOYEE && !data.companyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Firma jest wymagana dla roli Pracownik',
      path: ['companyId'],
    });
  }
  // COMPANY_OWNER requires companyName
  if (data.role === UserRole.COMPANY_OWNER && !data.companyName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nazwa firmy jest wymagana dla roli Właściciel firmy',
      path: ['companyName'],
    });
  }
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  companyId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nazwa firmy jest wymagana'),
  ownerId: z.string().uuid('Nieprawidłowy identyfikator właściciela'),
});

export type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;

// Module Schemas
export const createModuleSchema = z.object({
  name: z.string().min(1, 'Nazwa modułu jest wymagana'),
  slug: z.string()
    .min(1, 'Identyfikator (slug) jest wymagany')
    .regex(/^[a-z0-9-]+$/, 'Identyfikator może zawierać tylko małe litery, cyfry i myślniki'),
  description: z.string().min(1, 'Opis jest wymagany'),
});

export type CreateModuleFormData = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Identyfikator może zawierać tylko małe litery, cyfry i myślniki')
    .optional(),
  description: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateModuleFormData = z.infer<typeof updateModuleSchema>;

// Employee Schemas
export const createEmployeeSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

// Permission Schemas
export const grantModuleAccessSchema = z.object({
  moduleSlug: z.string().min(1, 'Identyfikator modułu jest wymagany'),
  permissions: z.array(z.enum(['read', 'write', 'delete'])).min(1, 'Wymagane jest co najmniej jedno uprawnienie'),
});

export type GrantModuleAccessFormData = z.infer<typeof grantModuleAccessSchema>;

// AI Agent Schemas

// AI Configuration Schemas
export const createAIConfigurationSchema = z.object({
  provider: z.enum(['openai', 'openrouter'], { message: 'Dostawca jest wymagany' }),
  model: z.string().min(1, 'Model jest wymagany'),
  apiKey: z.string().min(1, 'Klucz API jest wymagany'),
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
  content: z.string().min(1, 'Wiadomość nie może być pusta').max(10000, 'Wiadomość jest za długa'),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;

// Context/File Upload Schemas
export const uploadContextFileSchema = z.object({
  file: z.instanceof(File, { message: 'Plik jest wymagany' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Rozmiar pliku musi być mniejszy niż 10MB')
    .refine(
      (file) => ['application/pdf', 'text/plain', 'text/markdown'].includes(file.type),
      'Dozwolone są tylko pliki PDF, TXT i MD'
    ),
});

export type UploadContextFileFormData = z.infer<typeof uploadContextFileSchema>;

// Token Limit Schemas
export const setTokenLimitSchema = z.object({
  targetType: z.enum(['company', 'user'], { message: 'Typ celu jest wymagany' }),
  targetId: z.string().uuid('Nieprawidłowy identyfikator celu'),
  monthlyLimit: z.number().int().min(0, 'Miesięczny limit musi być nieujemny'),
});

export type SetTokenLimitFormData = z.infer<typeof setTokenLimitSchema>;

// Email Configuration Schemas
export const createEmailConfigSchema = z.object({
  // SMTP Configuration
  smtpHost: z.string().min(3, 'Host SMTP jest wymagany'),
  smtpPort: z.number().int().min(1, 'Port musi być co najmniej 1').max(65535, 'Port musi być maksymalnie 65535'),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email('Nieprawidłowy adres email'),
  smtpPassword: z.string().min(1, 'Hasło SMTP jest wymagane'),
  // IMAP Configuration
  imapHost: z.string().min(3, 'Host IMAP jest wymagany'),
  imapPort: z.number().int().min(1, 'Port musi być co najmniej 1').max(65535, 'Port musi być maksymalnie 65535'),
  imapTls: z.boolean(),
  imapUser: z.string().email('Nieprawidłowy adres email'),
  imapPassword: z.string().min(1, 'Hasło IMAP jest wymagane'),
  // Optional metadata
  displayName: z.string().optional(),
});

export type CreateEmailConfigFormData = z.infer<typeof createEmailConfigSchema>;

export const updateEmailConfigSchema = z.object({
  // SMTP Configuration
  smtpHost: z.string().min(3).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().email().optional(),
  smtpPassword: z.string().optional(), // Empty string allowed for updates (keeps existing password)
  // IMAP Configuration
  imapHost: z.string().min(3).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapTls: z.boolean().optional(),
  imapUser: z.string().email().optional(),
  imapPassword: z.string().optional(), // Empty string allowed for updates (keeps existing password)
  // Optional metadata
  displayName: z.string().optional(),
});

export type UpdateEmailConfigFormData = z.infer<typeof updateEmailConfigSchema>;

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
  receiveEmailCopy: z.boolean().optional().default(true),
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
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Rozmiar pliku nie może przekraczać 5MB')
    .refine(
      (file) => ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type),
      'Dozwolone są tylko pliki PNG, JPEG, SVG i WebP'
    )
    .optional(),
  isActive: z.boolean().optional(),
  autoAssignCondition: autoAssignConditionSchema.optional().nullable(),
}).superRefine((data, ctx) => {
  // Only validate cross-field when iconType is being changed
  if (data.iconType) {
    if ((data.iconType === 'lucide' || data.iconType === 'emoji') && !data.iconValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wartość ikony jest wymagana dla tego typu',
        path: ['iconValue'],
      });
    }
    if (data.iconType === 'custom' && !data.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Plik ikony jest wymagany dla typu niestandardowego',
        path: ['file'],
      });
    }
  }
});

export type UpdateClientIconFormData = z.infer<typeof updateClientIconSchema>;

// Notification Settings Schemas
export const notificationSettingsSchema = z.object({
  receiveOnCreate: z.boolean().default(false),
  receiveOnUpdate: z.boolean().default(false),
  receiveOnDelete: z.boolean().default(false),
});

export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

