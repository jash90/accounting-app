# Module Configuration & Patterns

> [← Back to Index](./README.md) | [← Previous: Final Checklist](./14-checklist.md)

This section covers essential configuration patterns used by all production modules.

## module.json Configuration File

Every module must have a `module.json` file in its root directory. This file defines metadata, permissions, and feature flags.

**File Location**: `libs/modules/{module-name}/module.json`

**Schema Reference**: `schemas/module.schema.json`

```json
{
  "$schema": "../../../schemas/module.schema.json",
  "slug": "time-tracking",
  "name": "Logowanie czasu",
  "description": "Modul do logowania czasu pracy z timerem, raportami i integracją z klientami i zadaniami",
  "version": "1.0.0",
  "isActive": true,
  "permissions": ["read", "write", "delete", "manage"],
  "defaultPermissions": ["read", "write"],
  "icon": "clock",
  "category": "productivity",
  "dependencies": ["ai-agent"],
  "config": {
    "enableTimer": true,
    "enableManualEntry": true,
    "enableProjects": true,
    "enableBillable": true,
    "enableApprovalWorkflow": true,
    "enableReports": true,
    "enableExport": true,
    "enableTimeRounding": true,
    "defaultRoundingInterval": 15
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | Yes | Path to JSON schema for validation |
| `slug` | string | Yes | URL-friendly identifier (e.g., `time-tracking`) |
| `name` | string | Yes | Display name in Polish (e.g., `Logowanie czasu`) |
| `description` | string | Yes | Description in Polish |
| `version` | string | Yes | Semantic version (e.g., `1.0.0`) |
| `isActive` | boolean | Yes | Whether module is enabled by default |
| `permissions` | string[] | Yes | Available permissions: `read`, `write`, `delete`, `manage` |
| `defaultPermissions` | string[] | Yes | Permissions granted by default |
| `icon` | string | Yes | Lucide icon name (e.g., `clock`, `users`, `mail`) |
| `category` | string | Yes | Category: `ai`, `crm`, `communication`, `productivity` |
| `dependencies` | string[] | No | Slugs of required modules |
| `config` | object | No | Module-specific feature flags |

### Example module.json Files

```json
// libs/modules/ai-agent/module.json
{
  "slug": "ai-agent",
  "name": "Agent AI",
  "category": "ai",
  "icon": "bot",
  "config": {
    "maxTokensPerDay": 100000,
    "supportedProviders": ["openai", "openrouter"],
    "enableRAG": true
  }
}

// libs/modules/clients/module.json
{
  "slug": "clients",
  "name": "Klienci",
  "category": "crm",
  "icon": "users",
  "config": {
    "enableCustomFields": true,
    "enableIcons": true,
    "enableChangeLog": true,
    "maxClientsPerCompany": 10000
  }
}

// libs/modules/email-client/module.json
{
  "slug": "email-client",
  "name": "Klient Email",
  "category": "communication",
  "icon": "mail",
  "dependencies": ["ai-agent"],
  "config": {
    "enableAIAssistant": true,
    "enableDrafts": true,
    "enableAttachments": true,
    "maxAttachmentSize": 10485760
  }
}
```

---

## Module Icon Requirements

Every module **MUST** have a unique icon defined in its `module.json` file. Icons are displayed in:
- Sidebar navigation
- Module list pages (admin and company views)
- Module cards and tables

**Icon Format**: Use lucide-react icon names in **kebab-case** format.

### Available Icons

Supported in `apps/web/src/lib/utils/module-icons.tsx`:

| Icon Name | Description | Use Case |
|-----------|-------------|----------|
| `package` | Default/fallback | Generic module |
| `users` | People/users | CRM, contacts, employees |
| `check-square` | Checkbox | Tasks, todos, approvals |
| `bot` | Robot | AI modules |
| `mail` | Envelope | Email, messaging |
| `clock` | Clock | Time tracking, scheduling |
| `file-text` | Document | Documents, notes |
| `calculator` | Calculator | Finance, calculations |
| `calendar` | Calendar | Scheduling, events |
| `settings` | Gear | Configuration, settings |
| `briefcase` | Briefcase | Business, projects |
| `bar-chart-3` | Chart | Analytics, reports |
| `credit-card` | Credit card | Payments, billing |
| `folder-open` | Open folder | Files, storage |

### Current Module Icons

| Module | Slug | Icon |
|--------|------|------|
| Zadania | `tasks` | `check-square` |
| Klienci | `clients` | `users` |
| Agent AI | `ai-agent` | `bot` |
| Klient Email | `email-client` | `mail` |
| Logowanie czasu | `time-tracking` | `clock` |

### Adding a New Icon

If your module needs an icon not in the list above, add it to the icon mapper:

```typescript
// apps/web/src/lib/utils/module-icons.tsx
import { NewIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  // ... existing icons
  'new-icon': NewIcon,
};
```

Browse available icons at: https://lucide.dev/icons/

---

## Exception Handling Pattern

Production modules use a three-tier exception handling architecture with error codes.

### Structure

```
libs/modules/{module}/src/lib/exceptions/
├── error-codes.enum.ts      # Centralized error codes
├── {module}.exception.ts    # Base exception class + domain exceptions
├── index.ts                 # Barrel exports
```

### Step 1: Define Error Codes

Create file: `libs/modules/{module}/src/lib/exceptions/error-codes.enum.ts`

```typescript
/**
 * Centralized error codes for module
 * Format: [ENTITY]_[NUMBER]
 */
export enum ClientErrorCode {
  // Client errors (CLIENT_00X)
  CLIENT_NOT_FOUND = 'CLIENT_001',
  CLIENT_ALREADY_EXISTS = 'CLIENT_002',
  CLIENT_DELETE_FAILED = 'CLIENT_003',
  CLIENT_UPDATE_FAILED = 'CLIENT_004',
  CLIENT_BATCH_OPERATION_FAILED = 'CLIENT_005',

  // Icon errors (ICON_00X)
  ICON_NOT_FOUND = 'ICON_001',
  ICON_UPLOAD_FAILED = 'ICON_002',
  ICON_INVALID_TYPE = 'ICON_003',

  // Authorization errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

### Step 2: Create Base Exception Class

Create file: `libs/modules/{module}/src/lib/exceptions/{module}.exception.ts`

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientErrorCode } from './error-codes.enum';

export interface ClientExceptionContext {
  clientId?: string;
  companyId?: string;
  userId?: string;
  operationStage?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Base exception class for all module errors
 * Provides structured error responses with error codes and context
 */
export class ClientException extends HttpException {
  constructor(
    public readonly errorCode: ClientErrorCode,
    message: string,
    public readonly context?: ClientExceptionContext,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        context,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

/**
 * Client not found exception
 * Use when client doesn't exist or belongs to different company
 */
export class ClientNotFoundException extends ClientException {
  constructor(clientId: string, companyId?: string) {
    super(
      ClientErrorCode.CLIENT_NOT_FOUND,
      `Client with ID ${clientId} not found`,
      { clientId, companyId },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Batch operation exception with detailed failure info
 * Use when some items in batch fail
 */
export class ClientBatchOperationException extends ClientException {
  constructor(
    failedItems: Array<{ id: string; error: string }>,
    context?: ClientExceptionContext,
  ) {
    super(
      ClientErrorCode.CLIENT_BATCH_OPERATION_FAILED,
      `Batch operation failed for ${failedItems.length} item(s)`,
      { ...context, additionalInfo: { failedItems } },
      HttpStatus.MULTI_STATUS,
    );
  }
}
```

### Step 3: Create Barrel Export

Create file: `libs/modules/{module}/src/lib/exceptions/index.ts`

```typescript
export * from './error-codes.enum';
export * from './client.exception';
// Add other exception files as needed
```

### Usage in Services

```typescript
import { ClientNotFoundException } from '../exceptions';

async findOne(id: string, companyId: string): Promise<Client> {
  const client = await this.clientRepository.findOne({
    where: { id, companyId },
  });

  if (!client) {
    throw new ClientNotFoundException(id, companyId);
  }

  return client;
}
```

---

## Controller Route Ordering

**IMPORTANT**: NestJS processes routes in the order controllers are registered. Specific routes must be registered BEFORE generic `/:id` routes.

### Module Registration Order

```typescript
// libs/modules/tasks/src/lib/tasks.module.ts
@Module({
  controllers: [
    // More specific routes must be registered before generic /:id routes
    TasksLookupController,    // Handles: /tasks/lookups/*
    TaskLabelsController,     // Handles: /tasks/labels/*
    TaskCommentsController,   // Handles: /tasks/:taskId/comments/*
    TaskDependenciesController, // Handles: /tasks/:taskId/dependencies/*
    TasksController,          // Handles: /tasks/:id (MUST BE LAST)
  ],
  // ...
})
export class TasksModule {}
```

### Why This Matters

Without proper ordering:
- Request to `/tasks/lookups` might match `/:id` route first
- `lookups` would be interpreted as a task ID
- Results in "Task not found" errors for valid lookup requests

### Lookup Controller Pattern

```typescript
// libs/modules/tasks/src/lib/controllers/tasks-lookup.controller.ts
@ApiTags('Tasks')
@Controller('tasks/lookups')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('tasks')
export class TasksLookupController {
  @Get('statuses')
  @ApiOperation({ summary: 'Get available task statuses' })
  getStatuses(): TaskStatus[] {
    return Object.values(TaskStatus);
  }

  @Get('priorities')
  @ApiOperation({ summary: 'Get available task priorities' })
  getPriorities(): TaskPriority[] {
    return Object.values(TaskPriority);
  }

  @Get('assignees')
  @ApiOperation({ summary: 'Get available assignees for current company' })
  async getAssignees(@CurrentUser() user: User): Promise<UserBasicInfo[]> {
    return this.tasksService.getAvailableAssignees(user);
  }
}
```

---

## Module Dependencies

Modules can declare dependencies on other modules using the `dependencies` field in `module.json`.

### Declaring Dependencies

```json
// libs/modules/email-client/module.json
{
  "slug": "email-client",
  "name": "Klient Email",
  "dependencies": ["ai-agent"]
}
```

### Importing Dependent Modules

```typescript
// libs/modules/email-client/src/lib/email-client.module.ts
import { AIAgentModule } from '@accounting/modules/ai-agent';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailDraft]),
    EmailModule,
    StorageModule,
    RBACModule,
    AIAgentModule,  // Import dependent module
  ],
  // ...
})
export class EmailClientModule {}
```

### Using Dependent Services

```typescript
// libs/modules/email-client/src/lib/services/email-ai.service.ts
import { AIConversationService } from '@accounting/modules/ai-agent';

@Injectable()
export class EmailAiService {
  constructor(
    private readonly aiConversationService: AIConversationService,
  ) {}

  async generateEmailDraft(prompt: string, user: User): Promise<string> {
    const response = await this.aiConversationService.sendMessage({
      message: prompt,
      user,
    });
    return response.content;
  }
}
```

---

## TenantService for Multi-Tenancy

The `TenantService` from `@accounting/common` provides centralized logic for determining the effective company ID based on user role.

**Service Location**: `libs/common/src/lib/services/tenant.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Gets the effective company ID for multi-tenant operations.
   * - For ADMIN users: Returns the system company ID
   * - For other users: Returns their assigned company ID
   */
  async getEffectiveCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new ForbiddenException('System company not found for admin user');
      }
      return systemCompany.id;
    }
    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to any company');
    }
    return user.companyId;
  }
}
```

### Usage in Services

```typescript
import { TenantService } from '@accounting/common';

@Injectable()
export class TasksService {
  constructor(
    private readonly tenantService: TenantService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async findAll(user: User): Promise<Task[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    return this.taskRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Alternative: Manual System Company Lookup

For simple cases, you can still use manual lookup:

```typescript
private async getSystemCompany(): Promise<Company> {
  const systemCompany = await this.companyRepository.findOne({
    where: { isSystemCompany: true },
  });
  if (!systemCompany) {
    throw new ForbiddenException('System company not found');
  }
  return systemCompany;
}
```

---

## Barrel Exports Pattern

All modules use barrel exports (index.ts files) to simplify imports and maintain clean module boundaries.

### Module-Level Export

`libs/modules/{module}/src/index.ts`:

```typescript
// Export module class
export * from './lib/{module}.module';

// Export services (for inter-module dependencies)
export * from './lib/services';

// Export DTOs (for shared types)
export * from './lib/dto';

// Export exceptions (for error handling)
export * from './lib/exceptions';
```

### Directory-Level Exports

```typescript
// libs/modules/tasks/src/lib/dto/index.ts
export * from './task.dto';
export * from './task-label.dto';
export * from './task-comment.dto';
export * from './task-dependency.dto';
export * from './task-response.dto';

// libs/modules/tasks/src/lib/controllers/index.ts
export * from './tasks.controller';
export * from './tasks-lookup.controller';
export * from './task-labels.controller';
export * from './task-comments.controller';
export * from './task-dependencies.controller';

// libs/modules/tasks/src/lib/exceptions/index.ts
export * from './error-codes.enum';
export * from './task.exception';

// libs/modules/tasks/src/lib/services/index.ts
export * from './tasks.service';
export * from './task-labels.service';
export * from './task-comments.service';
export * from './task-dependencies.service';
```

### Import Pattern

```typescript
// Clean imports from module boundary
import { TasksModule, TasksService } from '@accounting/modules/tasks';
import { CreateTaskDto, TaskResponseDto } from '@accounting/modules/tasks';
import { TaskNotFoundException } from '@accounting/modules/tasks';
```

---

## EncryptionService (AES-256-GCM)

The `EncryptionService` from `@accounting/common` provides authenticated encryption for sensitive data using AES-256-GCM.

**Service Location**: `libs/common/src/lib/services/encryption.service.ts`

### Key Features

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Format**: `salt:iv:authTag:encryptedData` (all hex-encoded)
- **Key Derivation**: scrypt with random salt
- **Development**: Persists key to `.encryption-key.dev` file
- **Production**: Requires `ENCRYPTION_SECRET` environment variable (>=32 characters)

### Usage Example

```typescript
import { EncryptionService } from '@accounting/common';

@Injectable()
export class AIConfigurationService {
  constructor(
    private readonly encryptionService: EncryptionService,
    @InjectRepository(AIConfiguration)
    private readonly configRepository: Repository<AIConfiguration>,
  ) {}

  async saveApiKey(configId: string, apiKey: string): Promise<void> {
    // Encrypt the API key before saving
    const encryptedKey = await this.encryptionService.encrypt(apiKey);

    await this.configRepository.update(configId, {
      encryptedApiKey: encryptedKey,
    });
  }

  async getApiKey(configId: string): Promise<string> {
    const config = await this.configRepository.findOneOrFail({
      where: { id: configId },
    });

    // Decrypt the API key when needed
    return this.encryptionService.decrypt(config.encryptedApiKey);
  }

  async hasApiKey(configId: string): Promise<boolean> {
    const config = await this.configRepository.findOne({
      where: { id: configId },
    });

    return config?.encryptedApiKey
      ? this.encryptionService.isEncryptedFormat(config.encryptedApiKey)
      : false;
  }
}
```

### Environment Configuration

```env
# .env (production)
ENCRYPTION_SECRET=your-very-secure-encryption-key-at-least-32-chars

# Development: Key auto-generated and persisted to .encryption-key.dev
```

### Best Practices

**DO**:
- Use `hasApiKey` pattern in responses (never expose actual key)
- Use `@Exclude()` decorator on encrypted fields in entities
- Validate encryption configuration at startup

**DON'T**:
- Return encrypted values in API responses
- Log decrypted sensitive data
- Commit `.encryption-key.dev` to version control

---

> **Next:** [Frontend Module Patterns](./16-frontend-patterns.md)
