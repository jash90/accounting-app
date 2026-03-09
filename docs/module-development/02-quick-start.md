# Quick Start (TL;DR)

> [← Back to Index](./README.md) | [← Previous: Introduction](./01-introduction.md)

For experienced developers, here's the condensed version:

## Backend Setup

```bash
# 1. Generate library
nx generate @nx/node:library tasks --directory=libs/modules/tasks

# 2. Create entity in libs/common/src/lib/entities/task.entity.ts
#    - Include TypeScript non-null assertions (!)
#    - Make companyId nullable for System Admin Company pattern
#    - Add nullable: true to Company relation

# 3. Create DTOs in libs/modules/tasks/src/lib/dto/
#    - create-task.dto.ts (with class-validator)
#    - update-task.dto.ts (all fields optional)
#    - task-response.dto.ts (with nested types for UserBasicInfoDto, CompanyBasicInfoDto)

# 4. Create service in libs/modules/tasks/src/lib/services/
#    - Inject Company repository for System Admin Company pattern
#    - Add getSystemCompany() helper method
#    - Implement ADMIN vs Company user access logic

# 5. Create controller in libs/modules/tasks/src/lib/controllers/
#    - Apply guards and decorators
#    - Comprehensive Swagger documentation (summary AND description)
#    - Document all response codes

# 6. Create module in libs/modules/tasks/src/lib/tasks.module.ts
#    - Include Company entity in TypeOrmModule.forFeature()

# 7. Register in AppModule and typeorm.config.ts
# 8. Export from libs/modules/tasks/src/index.ts
# 9. Update Company entity with OneToMany relation

# 10. Generate migration
npm run migration:generate -- apps/api/src/migrations/AddTaskEntity

# 11. Run migration
npm run migration:run

# 12. Update seeder with module metadata
```

## Frontend Setup

```bash
# 13. Create frontend DTOs in web/src/types/dtos.ts
#     - CreateTaskDto, UpdateTaskDto, TaskResponseDto

# 14. Create Zod schemas in web/src/lib/validation/schemas.ts
#     - createTaskSchema, updateTaskSchema

# 15. Create API client in web/src/lib/api/endpoints/tasks.ts
#     - All CRUD methods with proper typing

# 16. Update query keys in web/src/lib/api/query-client.ts

# 17. Create React Query hooks in web/src/lib/hooks/use-tasks.ts
#     - useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask

# 18. Create page component in web/src/pages/modules/tasks/task-list.tsx

# 19. Create form dialog in web/src/components/forms/task-form-dialog.tsx

# 20. Update routes in web/src/app/routes.tsx
#     - Admin, Company, and Employee routes

# 21. Test with different user roles (ADMIN, COMPANY_OWNER, EMPLOYEE)

# 22. Add module to sidebar navigation in web/src/components/layouts/
# 23. Create MSW mock handlers in web/src/lib/api/mocks/
# 24. Implement permission-based UI rendering
# 25. Ensure accessibility (aria-labels, focus states, contrast)
# 26. Follow AppTax Visual Identity (see design guides/)
```

## Key Files to Create/Modify

### Backend

- ✅ Entity: `libs/common/src/lib/entities/task.entity.ts`
- ✅ Backend DTOs: `libs/modules/tasks/src/lib/dto/*.dto.ts`
- ✅ Service: `libs/modules/tasks/src/lib/services/task.service.ts`
- ✅ Controller: `libs/modules/tasks/src/lib/controllers/task.controller.ts`
- ✅ Module: `libs/modules/tasks/src/lib/tasks.module.ts`
- ✅ Exports: `libs/modules/tasks/src/index.ts`
- ✅ Update: `apps/api/src/app/app.module.ts`
- ✅ Update: `apps/api/typeorm.config.ts`
- ✅ Update: `libs/common/src/lib/entities/company.entity.ts`
- ✅ Update: `libs/common/src/index.ts`
- ✅ Update: `apps/api/src/seeders/seeder.service.ts`
- ✅ Update: `apps/api/src/main.ts` (Swagger tags)

### Frontend

- ✅ Frontend DTOs: `web/src/types/dtos.ts`
- ✅ Zod Schemas: `web/src/lib/validation/schemas.ts`
- ✅ API Client: `web/src/lib/api/endpoints/tasks.ts`
- ✅ Query Keys: `web/src/lib/api/query-client.ts` (update)
- ✅ React Query Hooks: `web/src/lib/hooks/use-tasks.ts`
- ✅ Page Component: `web/src/pages/modules/tasks/task-list.tsx`
- ✅ Form Dialog: `web/src/components/forms/task-form-dialog.tsx`
- ✅ Routes: `web/src/app/routes.tsx` (update)
- ✅ MSW Handlers: `web/src/lib/api/mocks/tasks-handlers.ts`
- ✅ Navigation: `web/src/components/layouts/sidebar-nav.tsx` (update)
- ✅ Permission Hook: `web/src/lib/hooks/use-task-permissions.ts`

### Design System

- 📖 Reference: `design guides/AppTax-Brand-Quick-Reference.md`
- 📖 Reference: `design guides/AppTax-Brand-Guidelines.html`

## Complex Module Quick Start (AI Agent Example)

For advanced modules with multiple entities, encryption, file uploads, and external API integrations:

### When to Use Advanced Patterns

- Module needs 3+ related entities
- Sensitive data (API keys, tokens) must be encrypted
- External service integration (AI providers, payment gateways)
- File upload and processing requirements
- Usage tracking and rate limiting
- Vector search / RAG capabilities

### Backend Setup (Advanced)

```bash
# 1. Generate library
nx generate @nx/node:library ai-agent --directory=libs/modules/ai-agent

# 2. Create multiple entities in libs/common/src/lib/entities/
#    - ai-configuration.entity.ts (with encrypted API key)
#    - ai-conversation.entity.ts (with cascade messages)
#    - ai-message.entity.ts (with token tracking)
#    - ai-context.entity.ts (with vector embedding)
#    - token-usage.entity.ts (with composite unique index)
#    - token-limit.entity.ts (hierarchical limits)

# 3. Create abstract provider interface
#    - ai-provider.interface.ts (abstract class)
#    - openai-provider.service.ts (implementation)
#    - openrouter-provider.service.ts (implementation)

# 4. Create multiple services
#    - ai-configuration.service.ts (with encryption)
#    - ai-conversation.service.ts (chat logic)
#    - token-usage.service.ts (tracking)
#    - token-limit.service.ts (rate limiting)
#    - rag.service.ts (vector search)

# 5. Create multiple controllers
#    - ai-configuration.controller.ts (ADMIN-only)
#    - ai-conversation.controller.ts (all users)
#    - token-usage.controller.ts (role-based)
```

### Key Files for Complex Module (AI Agent)

**Backend:**

- ✅ Entities: `libs/common/src/lib/entities/ai-*.entity.ts` (6 entities)
- ✅ Provider Interface: `libs/modules/ai-agent/src/lib/services/ai-provider.interface.ts`
- ✅ Provider Implementations: `*-provider.service.ts` (OpenAI, OpenRouter)
- ✅ Services: `libs/modules/ai-agent/src/lib/services/*.service.ts` (8 services)
- ✅ Controllers: `libs/modules/ai-agent/src/lib/controllers/*.controller.ts` (3 controllers)
- ✅ DTOs: `libs/modules/ai-agent/src/lib/dto/*.dto.ts` (12+ DTOs)
- ✅ Module: `libs/modules/ai-agent/src/lib/ai-agent.module.ts`

**Frontend:**

- ✅ Pages: `web/src/pages/modules/ai-agent/*.tsx` (chat, config, usage, context)
- ✅ API Client: `web/src/lib/api/endpoints/ai-agent.ts`
- ✅ Hooks: `web/src/lib/hooks/use-ai-agent.ts`
- ✅ Components: `web/src/components/ai-agent/*.tsx`

### Key Differences from Simple Module

| Aspect        | Simple (Tasks) | Complex (AI Agent)       |
| ------------- | -------------- | ------------------------ |
| Entities      | 1 entity       | 6 entities               |
| Controllers   | 1 controller   | 3 controllers            |
| Services      | 1 service      | 8 services               |
| Encryption    | None           | AES-256-GCM for API keys |
| File Upload   | None           | PDF/TXT with validation  |
| Vector Search | None           | pgvector embeddings      |
| Rate Limiting | None           | Token-based limits       |
| External APIs | None           | OpenAI, OpenRouter       |

---

> **Next:** [Prerequisites](./03-prerequisites.md)
