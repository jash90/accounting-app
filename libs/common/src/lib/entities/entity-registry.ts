/**
 * Single source of truth for all TypeORM entities.
 *
 * Used by:
 * - apps/api/typeorm.config.ts (migration generation)
 * - apps/api/src/app/app.module.ts (runtime TypeORM)
 *
 * When adding a new entity:
 * 1. Define entity in libs/common/src/lib/entities/ (or module-specific entities/)
 * 2. Export from barrel (libs/common/src/index.ts or module index.ts)
 * 3. Add to this registry
 * 4. Generate migration: bun run migration:generate
 * 5. Run migration: bun run migration:run
 */
import { AIConfiguration } from './ai-configuration.entity';
import { AIContext } from './ai-context.entity';
import { AIConversation } from './ai-conversation.entity';
import { AIMessage } from './ai-message.entity';
import { ChangeLog } from './change-log.entity';
import { ClientCustomFieldValue } from './client-custom-field-value.entity';
import { ClientDeleteRequest } from './client-delete-request.entity';
import { ClientFieldDefinition } from './client-field-definition.entity';
import { ClientIconAssignment } from './client-icon-assignment.entity';
import { ClientIcon } from './client-icon.entity';
import { ClientReliefPeriod } from './client-relief-period.entity';
import { ClientSuspension } from './client-suspension.entity';
import { Client } from './client.entity';
import { CompanyModuleAccess } from './company-module-access.entity';
import { Company } from './company.entity';
import { CustomFieldReminder } from './custom-field-reminder.entity';
import { DocumentTemplate } from './document-template.entity';
import { EmailAutoReplyTemplate } from './email-auto-reply-template.entity';
import { EmailConfiguration } from './email-configuration.entity';
import { GeneratedDocument } from './generated-document.entity';
import { KsefAuditLog } from './ksef-audit-log.entity';
import { KsefConfiguration } from './ksef-configuration.entity';
import { KsefInvoice } from './ksef-invoice.entity';
import { KsefSession } from './ksef-session.entity';
import { Lead } from './lead.entity';
import { Module } from './module.entity';
import { MonthlySettlement } from './monthly-settlement.entity';
import { NotificationSettings } from './notification-settings.entity';
import { Notification } from './notification.entity';
import { OfferActivity } from './offer-activity.entity';
import { OfferTemplate } from './offer-template.entity';
import { Offer } from './offer.entity';
import { SettlementComment } from './settlement-comment.entity';
import { SettlementSettings } from './settlement-settings.entity';
import { TaskComment } from './task-comment.entity';
import { TaskDependency } from './task-dependency.entity';
import { TaskLabelAssignment } from './task-label-assignment.entity';
import { TaskLabel } from './task-label.entity';
import { Task } from './task.entity';
import { TimeEntry } from './time-entry.entity';
import { TimeSettings } from './time-settings.entity';
import { TokenLimit } from './token-limit.entity';
import { TokenUsage } from './token-usage.entity';
import { UserModulePermission } from './user-module-permission.entity';
import { User } from './user.entity';

/**
 * All entities from @accounting/common.
 * Module-specific entities (e.g. EmailDraft) are added separately where needed.
 */
export const COMMON_ENTITIES = [
  // Core
  User,
  Company,
  Module,
  CompanyModuleAccess,
  UserModulePermission,

  // AI Agent
  AIConfiguration,
  AIConversation,
  AIMessage,
  AIContext,
  TokenUsage,
  TokenLimit,

  // Infrastructure
  ChangeLog,
  EmailConfiguration,
  EmailAutoReplyTemplate,
  Notification,
  NotificationSettings,

  // Clients
  Client,
  ClientFieldDefinition,
  ClientCustomFieldValue,
  ClientIcon,
  ClientIconAssignment,
  ClientSuspension,
  ClientReliefPeriod,
  ClientDeleteRequest,
  CustomFieldReminder,

  // Tasks
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskDependency,
  TaskComment,

  // Time Tracking
  TimeEntry,
  TimeSettings,

  // Offers & Leads
  Lead,
  OfferTemplate,
  Offer,
  OfferActivity,

  // Settlements
  MonthlySettlement,
  SettlementComment,
  SettlementSettings,

  // Documents
  DocumentTemplate,
  GeneratedDocument,

  // KSeF
  KsefConfiguration,
  KsefSession,
  KsefInvoice,
  KsefAuditLog,
] as const;
