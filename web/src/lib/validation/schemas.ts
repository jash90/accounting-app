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
  provider: z.enum(['openai', 'openrouter'], { required_error: 'Provider is required' }),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
});

export type CreateAIConfigurationFormData = z.infer<typeof createAIConfigurationSchema>;

export const updateAIConfigurationSchema = z.object({
  provider: z.enum(['openai', 'openrouter']).optional(),
  model: z.string().min(1).optional(),
  apiKey: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(1).optional()
  ),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
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
  targetType: z.enum(['company', 'user'], { required_error: 'Target type is required' }),
  targetId: z.string().uuid('Invalid target ID'),
  monthlyLimit: z.number().int().min(0, 'Monthly limit must be non-negative'),
});

export type SetTokenLimitFormData = z.infer<typeof setTokenLimitSchema>;

