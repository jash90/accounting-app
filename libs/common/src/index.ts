// Enums
export * from './lib/enums/user-role.enum';
export * from './lib/enums/employment-type.enum';
export * from './lib/enums/vat-status.enum';
export * from './lib/enums/tax-scheme.enum';
export * from './lib/enums/zus-status.enum';
export * from './lib/enums/custom-field-type.enum';
export * from './lib/enums/change-action.enum';
export * from './lib/enums/aml-group.enum';
export * from './lib/enums/icon-type.enum';
export * from './lib/enums/delete-request-status.enum';
export * from './lib/enums/task-status.enum';
export * from './lib/enums/task-priority.enum';
export * from './lib/enums/task-dependency-type.enum';
export * from './lib/enums/time-entry-status.enum';
export * from './lib/enums/time-rounding-method.enum';
export * from './lib/enums/notification-type.enum';

// Constants
export * from './lib/constants';

// Types
export * from './lib/types';

// Decorators
export * from './lib/decorators/sanitize.decorator';

// Entities
export * from './lib/entities/user.entity';
export * from './lib/entities/company.entity';
export * from './lib/entities/module.entity';
export * from './lib/entities/company-module-access.entity';
export * from './lib/entities/user-module-permission.entity';
// NOTE: EmailDraft is NOT exported from common to maintain proper module boundaries.
// Import directly from '@accounting/modules/email-client' where needed.
export * from './lib/entities/ai-configuration.entity';
export * from './lib/entities/ai-conversation.entity';
export * from './lib/entities/ai-message.entity';
export * from './lib/entities/ai-context.entity';
export * from './lib/entities/token-usage.entity';
export * from './lib/entities/token-limit.entity';
export * from './lib/entities/email-configuration.entity';
export * from './lib/entities/change-log.entity';
export * from './lib/entities/client.entity';
export * from './lib/entities/client-field-definition.entity';
export * from './lib/entities/client-custom-field-value.entity';
export * from './lib/entities/client-icon.entity';
export * from './lib/entities/client-icon-assignment.entity';
export * from './lib/entities/client-suspension.entity';
export * from './lib/entities/notification-settings.entity';
export * from './lib/entities/client-delete-request.entity';
export * from './lib/entities/task.entity';
export * from './lib/entities/task-label.entity';
export * from './lib/entities/task-label-assignment.entity';
export * from './lib/entities/task-dependency.entity';
export * from './lib/entities/task-comment.entity';
export * from './lib/entities/time-entry.entity';
export * from './lib/entities/time-settings.entity';
export * from './lib/entities/notification.entity';
export { AIProvider } from './lib/entities/ai-configuration.entity';
export { AIMessageRole } from './lib/entities/ai-message.entity';
export * from './lib/dto/responses';
export * from './lib/dto/requests';
export * from './lib/dto/pagination.dto';
// NOTE: EncryptionService is NOT exported from the barrel file because it uses
// Node.js-specific modules (crypto, fs, util.promisify) that don't work in browsers.
// Import directly from './lib/services/encryption.service' in backend code where needed.

// NOTE: TenantService and CommonModule are NOT exported from the barrel file because
// they use NestJS decorators and TypeORM which pull in Node.js dependencies at bundle time.
// Import directly in backend code:
//   import { TenantService } from '@accounting/common/lib/services/tenant.service';
//   import { CommonModule } from '@accounting/common/lib/common.module';

// Re-export TenantService type for type-only imports in frontend if needed
export type { TenantService } from './lib/services/tenant.service';
