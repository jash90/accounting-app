import { z } from 'zod';

import { UserRole } from '@/types/enums';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Aktualne hasło jest wymagane'),
    newPassword: z
      .string()
      .min(8, 'Nowe hasło musi mieć co najmniej 8 znaków')
      .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
      .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
      .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
      .regex(/[@$!%*?&]/, 'Hasło musi zawierać znak specjalny (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Potwierdzenie hasła jest wymagane'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z
    .string()
    .min(12, 'Hasło musi mieć co najmniej 12 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Hasło musi zawierać znak specjalny'),
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().uuid().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// User Schemas
export const createUserSchema = z
  .object({
    email: z.string().email('Nieprawidłowy adres email'),
    password: z
      .string()
      .min(12, 'Hasło musi mieć co najmniej 12 znaków')
      .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
      .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
      .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Hasło musi zawierać znak specjalny'),
    firstName: z.string().min(1, 'Imię jest wymagane'),
    lastName: z.string().min(1, 'Nazwisko jest wymagane'),
    role: z.nativeEnum(UserRole),
    companyId: z.preprocess((val) => (val === '' ? undefined : val), z.string().uuid().optional()),
    companyName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
  slug: z
    .string()
    .min(1, 'Identyfikator (slug) jest wymagany')
    .regex(/^[a-z0-9-]+$/, 'Identyfikator może zawierać tylko małe litery, cyfry i myślniki'),
  description: z.string().min(1, 'Opis jest wymagany'),
});

export type CreateModuleFormData = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
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
  password: z
    .string()
    .min(12, 'Hasło musi mieć co najmniej 12 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Hasło musi zawierać znak specjalny'),
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

// Permission Schemas
export const grantModuleAccessSchema = z.object({
  moduleSlug: z.string().min(1, 'Identyfikator modułu jest wymagany'),
  permissions: z
    .array(z.enum(['read', 'write', 'delete']))
    .min(1, 'Wymagane jest co najmniej jedno uprawnienie'),
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
  file: z
    .instanceof(File, { message: 'Plik jest wymagany' })
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
  smtpPort: z
    .number()
    .int()
    .min(1, 'Port musi być co najmniej 1')
    .max(65535, 'Port musi być maksymalnie 65535'),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email('Nieprawidłowy adres email'),
  smtpPassword: z.string().min(1, 'Hasło SMTP jest wymagane'),
  // IMAP Configuration
  imapHost: z.string().min(3, 'Host IMAP jest wymagany'),
  imapPort: z
    .number()
    .int()
    .min(1, 'Port musi być co najmniej 1')
    .max(65535, 'Port musi być maksymalnie 65535'),
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

// PKD code validation - must be in format XX.XX or XX.XX.X (e.g., 62.01 or 62.01.Z)
const pkdCodeSchema = z
  .string()
  .max(10)
  .optional()
  .refine((val) => !val || /^\d{2}\.\d{2}(\.[A-Z])?$/.test(val), {
    message: 'Kod PKD musi być w formacie XX.XX lub XX.XX.X (np. 62.01 lub 62.01.Z)',
  });

// GTU code validation - must be in format GTU_XX (e.g., GTU_01)
const gtuCodeSchema = z
  .string()
  .max(10)
  .optional()
  .refine((val) => !val || /^GTU_\d{2}$/.test(val), {
    message: 'Kod GTU musi być w formacie GTU_XX (np. GTU_01)',
  });

// NIP validation - must be exactly 10 digits
const nipSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\d{10}$/.test(val), {
    message: 'NIP musi składać się z dokładnie 10 cyfr',
  });

// Client Schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Nazwa klienta jest wymagana').max(255),
  nip: nipSchema,
  email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  companyStartDate: z.date().optional().nullable(),
  cooperationStartDate: z.date().optional().nullable(),
  companySpecificity: z.string().optional(),
  additionalInfo: z.string().optional(),
  gtuCode: gtuCodeSchema,
  pkdCode: pkdCodeSchema,
  amlGroup: z.string().max(50).optional(),
  employmentType: z
    .enum(['DG', 'DG_ETAT', 'DG_AKCJONARIUSZ', 'DG_HALF_TIME_BELOW_MIN', 'DG_HALF_TIME_ABOVE_MIN'])
    .optional(),
  vatStatus: z.enum(['VAT_MONTHLY', 'VAT_QUARTERLY', 'NO', 'NO_WATCH_LIMIT']).optional(),
  taxScheme: z.enum(['PIT_17', 'PIT_19', 'LUMP_SUM', 'GENERAL']).optional(),
  zusStatus: z.enum(['FULL', 'PREFERENTIAL', 'NONE']).optional(),
  receiveEmailCopy: z.boolean().optional().default(true),
});

export type CreateClientFormData = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();

export type UpdateClientFormData = z.infer<typeof updateClientSchema>;

export const customFieldFilterSchema = z.object({
  fieldId: z.string().min(1),
  operator: z.string().min(1),
  value: z.union([z.string(), z.array(z.string())]),
});

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
  employmentType: z
    .enum(['DG', 'DG_ETAT', 'DG_AKCJONARIUSZ', 'DG_HALF_TIME_BELOW_MIN', 'DG_HALF_TIME_ABOVE_MIN'])
    .optional(),
  vatStatus: z.enum(['VAT_MONTHLY', 'VAT_QUARTERLY', 'NO', 'NO_WATCH_LIMIT']).optional(),
  taxScheme: z.enum(['PIT_17', 'PIT_19', 'LUMP_SUM', 'GENERAL']).optional(),
  zusStatus: z.enum(['FULL', 'PREFERENTIAL', 'NONE']).optional(),
  amlGroupEnum: z.enum(['LOW', 'STANDARD', 'ELEVATED', 'HIGH']).optional(),
  gtuCode: z.string().optional(),
  pkdCode: z.string().optional(),
  receiveEmailCopy: z.boolean().optional(),
  isActive: z.boolean().optional(),
  cooperationStartDateFrom: z.string().optional(),
  cooperationStartDateTo: z.string().optional(),
  companyStartDateFrom: z.string().optional(),
  companyStartDateTo: z.string().optional(),
  customFieldFilters: z.array(customFieldFilterSchema).optional(),
});

export type ClientFiltersFormData = z.infer<typeof clientFiltersSchema>;

// Client Field Definition Schemas
export const createClientFieldDefinitionSchema = z.object({
  name: z.string().min(1, 'Nazwa pola jest wymagana').max(100),
  label: z.string().min(1, 'Etykieta pola jest wymagana').max(200),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'ENUM'], {
    message: 'Typ pola jest wymagany',
  }),
  isRequired: z.boolean().default(false),
  enumValues: z.array(z.string()).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateClientFieldDefinitionFormData = z.infer<typeof createClientFieldDefinitionSchema>;

export const updateClientFieldDefinitionSchema = createClientFieldDefinitionSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export type UpdateClientFieldDefinitionFormData = z.infer<typeof updateClientFieldDefinitionSchema>;

// Auto-Assign Condition Schema
const singleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'greaterThan',
    'lessThan',
    'greaterThanOrEqual',
    'lessThanOrEqual',
    'isEmpty',
    'isNotEmpty',
    'in',
    'notIn',
    'between',
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  secondValue: z.union([z.string(), z.number()]).optional(),
});

type SingleCondition = z.infer<typeof singleConditionSchema>;

interface ConditionGroup {
  logicalOperator: 'and' | 'or';
  conditions: (SingleCondition | ConditionGroup)[];
}

const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    logicalOperator: z.enum(['and', 'or']),
    conditions: z.array(z.union([singleConditionSchema, conditionGroupSchema])),
  })
);

const autoAssignConditionSchema = z.union([singleConditionSchema, conditionGroupSchema]);

// Client Icon Schemas
export const createClientIconSchema = z
  .object({
    name: z.string().min(1, 'Nazwa ikony jest wymagana').max(100),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Nieprawidłowy format koloru')
      .optional()
      .or(z.literal('')),
    iconType: z.enum(['lucide', 'custom', 'emoji'], { message: 'Wybierz typ ikony' }),
    iconValue: z.string().optional(),
    file: z
      .instanceof(File)
      .refine((file) => file.size <= 5 * 1024 * 1024, 'Rozmiar pliku nie może przekraczać 5MB')
      .refine(
        (file) => ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type),
        'Dozwolone są tylko pliki PNG, JPEG, SVG i WebP'
      )
      .optional(),
    autoAssignCondition: autoAssignConditionSchema.optional().nullable(),
  })
  .refine(
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

export const updateClientIconSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .or(z.literal('')),
    iconType: z.enum(['lucide', 'custom', 'emoji']).optional(),
    iconValue: z.string().optional(),
    file: z
      .instanceof(File)
      .refine((file) => file.size <= 5 * 1024 * 1024, 'Rozmiar pliku nie może przekraczać 5MB')
      .refine(
        (file) => ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type),
        'Dozwolone są tylko pliki PNG, JPEG, SVG i WebP'
      )
      .optional(),
    isActive: z.boolean().optional(),
    autoAssignCondition: autoAssignConditionSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
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

// Client Suspension Schemas
export const createSuspensionSchema = z
  .object({
    startDate: z.date({ message: 'Data zawieszenia jest wymagana' }),
    endDate: z.date({ message: 'Nieprawidłowy format daty odwieszenia' }).optional().nullable(),
    reason: z.string().max(1000, 'Powód nie może przekraczać 1000 znaków').optional(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'Data odwieszenia musi być późniejsza niż data zawieszenia',
      path: ['endDate'],
    }
  );

export type CreateSuspensionFormData = z.infer<typeof createSuspensionSchema>;

export const updateSuspensionSchema = z.object({
  endDate: z.date({ message: 'Nieprawidłowy format daty odwieszenia' }).optional().nullable(),
  reason: z.string().max(1000, 'Powód nie może przekraczać 1000 znaków').optional(),
});

export type UpdateSuspensionFormData = z.infer<typeof updateSuspensionSchema>;

// =============================================
// Offers Module Schemas
// =============================================

// Lead Schemas
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki').max(255),
  nip: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: 'NIP musi składać się z 10 cyfr',
    }),
  regon: z
    .string()
    .optional()
    .refine((val) => !val || /^(\d{9}|\d{14})$/.test(val), {
      message: 'REGON musi składać się z 9 lub 14 cyfr',
    }),
  street: z.string().max(255).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  contactPerson: z.string().max(255).optional(),
  contactPosition: z.string().max(100).optional(),
  email: z.string().email('Nieprawidłowy format adresu email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  source: z
    .enum(['WEBSITE', 'REFERRAL', 'PHONE', 'EMAIL', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'OTHER'])
    .optional(),
  notes: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  assignedToId: z.string().uuid().optional(),
});

export type CreateLeadFormData = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z
    .enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST'])
    .optional(),
});

export type UpdateLeadFormData = z.infer<typeof updateLeadSchema>;

// Offer Service Item Schema
export const offerServiceItemSchema = z.object({
  name: z.string().min(1, 'Nazwa usługi jest wymagana').max(255),
  description: z.string().max(1000).optional(),
  unitPrice: z.number().min(0, 'Cena jednostkowa musi być nieujemna'),
  quantity: z.number().min(0.01, 'Ilość musi być większa od 0'),
  unit: z.string().max(20).optional(),
});

export type OfferServiceItemFormData = z.infer<typeof offerServiceItemSchema>;

// Offer Template Schemas
export const createOfferTemplateSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki').max(255),
  description: z.string().optional(),
  defaultServiceItems: z.array(offerServiceItemSchema).optional(),
  defaultValidityDays: z.number().int().min(1).max(365).optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateOfferTemplateFormData = z.infer<typeof createOfferTemplateSchema>;

export const updateOfferTemplateSchema = createOfferTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateOfferTemplateFormData = z.infer<typeof updateOfferTemplateSchema>;

// Service Terms Schema
export const serviceTermsSchema = z.object({
  items: z.array(offerServiceItemSchema).min(1, 'Wymagana jest co najmniej jedna pozycja usługi'),
  paymentTermDays: z.number().int().min(1).max(365).optional(),
  paymentMethod: z.string().max(100).optional(),
  additionalTerms: z.string().optional(),
});

export type ServiceTermsFormData = z.infer<typeof serviceTermsSchema>;

// Offer Schemas
export const createOfferSchema = z
  .object({
    title: z.string().min(2, 'Tytuł musi mieć minimum 2 znaki').max(255),
    description: z.string().optional(),
    clientId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
    vatRate: z.number().min(0).max(100).optional(),
    serviceTerms: serviceTermsSchema.optional(),
    customPlaceholders: z.record(z.string(), z.string()).optional(),
    offerDate: z.date().optional(),
    validUntil: z.date().optional(),
    validityDays: z.number().int().min(1).max(365).optional(),
  })
  .refine((data) => data.clientId || data.leadId, {
    message: 'Wybierz klienta lub leada',
    path: ['clientId'],
  });

export type CreateOfferFormData = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  serviceTerms: serviceTermsSchema.optional(),
  customPlaceholders: z.record(z.string(), z.string()).optional(),
  offerDate: z.date().optional(),
  validUntil: z.date().optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
});

export type UpdateOfferFormData = z.infer<typeof updateOfferSchema>;

// Send Offer Schema
export const sendOfferSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
  subject: z.string().max(255).optional(),
  body: z.string().optional(),
  cc: z.array(z.string().email('Nieprawidłowy format adresu email w CC')).optional(),
});

export type SendOfferFormData = z.infer<typeof sendOfferSchema>;

// Duplicate Offer Schema
export const duplicateOfferSchema = z.object({
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
});

export type DuplicateOfferFormData = z.infer<typeof duplicateOfferSchema>;

// Convert Lead Schema
export const convertLeadToClientSchema = z.object({
  clientName: z.string().max(255).optional(),
});

export type ConvertLeadToClientFormData = z.infer<typeof convertLeadToClientSchema>;
