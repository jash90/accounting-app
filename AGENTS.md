# AGENTS.md

This file provides guidance to AI agents (GitHub Copilot, Cursor, Claude Code, etc.) working with code in this repository.

## Project Context

**Type**: RBAC Multi-tenant SaaS Platform
**Backend**: NestJS 11 + TypeORM + PostgreSQL
**Frontend**: React 19 + Vite + TanStack Query + shadcn/ui
**Monorepo**: Nx 22
**Testing**: Bun Test + Playwright

## Critical Architecture Constraints

### Multi-Tenancy (MANDATORY)

All business data **MUST** be isolated by `companyId`. Every business entity and query requires:

```typescript
// Entity pattern - ALWAYS include companyId
@Entity()
export class BusinessEntity {
  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;
}

// Service pattern - ALWAYS filter by companyId
async findAll(user: User): Promise<Entity[]> {
  return this.repository.find({
    where: { companyId: user.companyId },
  });
}
```

### Authorization Guards (Required Order)

Controllers must apply guards in this exact order:

```typescript
@Controller('items')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('module-slug')
export class ItemsController {
  @Get()
  @RequirePermission(Permission.READ)
  async findAll(@CurrentUser() user: User) {}
}
```

### System Admin Company Pattern

ADMIN users access data via a special "System Admin Company". Services must handle this:

```typescript
private async getSystemCompany(): Promise<Company> {
  return this.companyRepository.findOneOrFail({
    where: { name: 'System Admin Company' },
  });
}

async findAll(user: User): Promise<Entity[]> {
  if (user.role === UserRole.ADMIN) {
    const systemCompany = await this.getSystemCompany();
    return this.repository.find({ where: { companyId: systemCompany.id } });
  }
  return this.repository.find({ where: { companyId: user.companyId } });
}
```

## Common Commands

```bash
# Development
bun run dev              # Start backend + frontend
bun run serve            # Backend only (port 3000)
bun run serve:web        # Frontend only (port 4200)
bun run seed             # Seed test data

# Testing
bun test                 # Backend tests
bun run test:web         # Frontend tests
bun run test:e2e         # Playwright E2E
bun run test:integration # Integration tests

# Database
bun run migration:generate  # Generate from entity changes
bun run migration:run       # Run pending migrations
bun run migration:revert    # Revert last migration

# Quality
bun run lint             # Lint backend
bun run lint:web         # Lint frontend
```

## Test Credentials

| Role     | Email               | Password       |
| -------- | ------------------- | -------------- |
| Admin    | `admin@system.com`  | `Admin123!`    |
| Owner    | `owner@acme.com`    | `Owner123!`    |
| Employee | `employee@acme.com` | `Employee123!` |

## Path Aliases

```typescript
// Backend
import { User, Company } from '@accounting/common';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { RequireModule, RequirePermission } from '@accounting/rbac';
import { TasksModule } from '@accounting/modules/tasks';

// Frontend
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
```

## Module Structure

### Backend Module (`libs/modules/[name]/`)

```
libs/modules/[name]/
├── src/
│   ├── index.ts              # Barrel exports
│   └── lib/
│       ├── [name].module.ts  # NestJS module
│       ├── controllers/      # REST endpoints
│       ├── services/         # Business logic
│       ├── dto/              # Request/response DTOs
│       └── exceptions/       # Custom exceptions
```

### Frontend Module (`apps/web/src/pages/modules/[name]/`)

```
apps/web/src/
├── pages/modules/[name]/     # Page components
├── components/forms/         # Form dialogs
├── lib/
│   ├── api/endpoints/        # API client functions
│   ├── hooks/                # React Query hooks
│   └── validation/schemas.ts # Zod schemas
└── types/dtos.ts             # TypeScript DTOs
```

## Key Patterns

### Backend DTO Pattern

```typescript
// create-item.dto.ts
export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Item name' })
  name!: string;
}

// item-response.dto.ts
export class ItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() companyId!: string;
}
```

### Frontend React Query Pattern

```typescript
// use-items.ts
export function useItems() {
  return useQuery({
    queryKey: queryKeys.items.all,
    queryFn: itemsApi.getAll,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}
```

### Permission-Based UI

```typescript
const { hasPermission } = useModulePermissions('module-slug');

return (
  <>
    {hasPermission(Permission.READ) && <ViewButton />}
    {hasPermission(Permission.WRITE) && <EditButton />}
    {hasPermission(Permission.DELETE) && <DeleteButton />}
  </>
);
```

## Role Hierarchy

| Role              | Access Scope                     | Business Data                  |
| ----------------- | -------------------------------- | ------------------------------ |
| **ADMIN**         | System-wide (companies, modules) | Via System Admin Company only  |
| **COMPANY_OWNER** | Own company + employees          | Full access to enabled modules |
| **EMPLOYEE**      | Granted permissions only         | Filtered by companyId          |

## API Structure

```
GET  /                    # Health check
GET  /api/docs            # Swagger UI

POST /auth/login          # Public
POST /auth/refresh        # Public
POST /auth/register       # Public

/admin/*                  # ADMIN role only
/company/*                # COMPANY_OWNER role
/modules/*                # Permission-based
```

## File Registration Checklist

When creating new entities:

1. Define entity in `libs/common/src/lib/entities/`
2. Export from `libs/common/src/index.ts`
3. Register in `apps/api/typeorm.config.ts`
4. Add to module's `TypeOrmModule.forFeature([])`
5. Generate migration: `bun run migration:generate`
6. Run migration: `bun run migration:run`

## AI Provider Integration

The project uses an abstraction layer for AI providers:

```typescript
// libs/modules/ai-agent/src/lib/services/
export abstract class AIProviderService {
  abstract sendMessage(config: AIConfiguration, messages: AIMessage[]): Promise<AIResponse>;
}

// Implementations
export class OpenAIProviderService extends AIProviderService {}
export class OpenRouterProviderService extends AIProviderService {}
```

## Common Mistakes to Avoid

1. **Missing companyId filter** - Always filter business data by `companyId`
2. **Wrong guard order** - Must be: JwtAuthGuard → ModuleAccessGuard → PermissionGuard
3. **Missing entity registration** - Register in both `typeorm.config.ts` AND module
4. **Forgetting migrations** - Always generate after entity changes
5. **ADMIN data access** - ADMIN uses System Admin Company, not `user.companyId`
6. **Non-null assertions** - Use `!` in entities for TypeORM columns

## Documentation References

| Document                     | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `docs/ARCHITECTURE_GUIDE.md` | System design, entity relationships |
| `docs/MODULE_DEVELOPMENT.md` | Complete module creation tutorial   |
| `docs/API_DOCUMENTATION.md`  | Backend API reference               |
| `docs/FRONTEND_GUIDE.md`     | React patterns, components          |
| `docs/DESIGN_SYSTEM.md`      | UI components, styling              |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
