# Final Checklist

> [← Back to Index](./README.md) | [← Previous: Reference](./13-reference.md)

Before considering your module complete, verify all steps:

## Development Checklist

- [ ] **Entity Created**
  - [ ] File: `libs/common/src/lib/entities/task.entity.ts`
  - [ ] Multi-tenant fields (companyId, createdById)
  - [ ] Proper relationships
  - [ ] Timestamps
  - [ ] Exported from common/index.ts

- [ ] **DTOs Created**
  - [ ] CreateDto with validation
  - [ ] UpdateDto (all fields optional)
  - [ ] ResponseDto with Swagger docs

- [ ] **Service Implemented**
  - [ ] CRUD operations
  - [ ] Multi-tenant filtering
  - [ ] ADMIN restrictions
  - [ ] Ownership verification
  - [ ] Error handling

- [ ] **Controller Implemented**
  - [ ] Guards applied
  - [ ] @RequireModule decorator
  - [ ] @RequirePermission decorators
  - [ ] Swagger documentation
  - [ ] All CRUD endpoints

- [ ] **Module Configured**
  - [ ] TasksModule created
  - [ ] TypeORM entities registered
  - [ ] RBACModule imported
  - [ ] Public exports in index.ts

- [ ] **Integration Complete**
  - [ ] AppModule imports TasksModule
  - [ ] Task entity in TypeORM config
  - [ ] Company relationship added
  - [ ] Migration generated and run
  - [ ] Seeder updated
  - [ ] Swagger tag added

- [ ] **Frontend Implemented**
  - [ ] Frontend DTOs created in `web/src/types/dtos.ts`
  - [ ] Zod validation schemas in `web/src/lib/validation/schemas.ts`
  - [ ] API client in `web/src/lib/api/endpoints/tasks.ts`
  - [ ] Query keys updated in `web/src/lib/api/query-client.ts`
  - [ ] React Query hooks in `web/src/lib/hooks/use-tasks.ts`
  - [ ] Page component in `web/src/pages/modules/tasks/task-list.tsx`
  - [ ] Form dialog in `web/src/components/forms/task-form-dialog.tsx`
  - [ ] Routes configured in `web/src/app/routes.tsx`
  - [ ] Frontend follows AppTax Visual Identity (colors, typography, components)

## Backend Testing Checklist

- [ ] **Company Owner Testing**
  - [ ] Can create tasks
  - [ ] Can read all company tasks
  - [ ] Can update own tasks
  - [ ] Can delete tasks
  - [ ] Can assign to employees

- [ ] **Employee Testing (with permissions)**
  - [ ] Read permission works
  - [ ] Write permission works
  - [ ] Delete permission works
  - [ ] Cannot access without permission

- [ ] **Multi-Tenant Isolation**
  - [ ] Company A cannot see Company B tasks
  - [ ] Cannot modify other company's tasks
  - [ ] Data properly isolated

- [ ] **ADMIN Testing**
  - [ ] Can create/view/modify data in System Admin company
  - [ ] Cannot access other companies' data
  - [ ] Can manage module metadata
  - [ ] Can grant module to companies

## Frontend Testing Checklist

- [ ] **UI Components**
  - [ ] Page renders correctly
  - [ ] DataTable displays tasks
  - [ ] Form dialog opens/closes
  - [ ] Delete confirmation works

- [ ] **CRUD Operations**
  - [ ] Create task through UI
  - [ ] Edit task works
  - [ ] Delete task with confirmation
  - [ ] Validation errors display correctly

- [ ] **Data Display**
  - [ ] Task status badges render
  - [ ] Due dates formatted correctly
  - [ ] Assignee names display
  - [ ] Loading states work
  - [ ] Empty states display

- [ ] **Different User Roles**
  - [ ] ADMIN can access /admin/modules/tasks
  - [ ] COMPANY_OWNER can access /company/modules/tasks
  - [ ] EMPLOYEE can access /modules/tasks
  - [ ] Permissions enforced in UI

- [ ] **React Query**
  - [ ] Cache invalidation works
  - [ ] Optimistic updates (if implemented)
  - [ ] Error handling displays toast
  - [ ] Success messages display

## Integration Checklist

- [ ] **Navigation**
  - [ ] Module added to admin sidebar navigation
  - [ ] Module added to company owner sidebar navigation
  - [ ] Module added to employee sidebar navigation
  - [ ] Conditional rendering based on module access

- [ ] **MSW Mocks**
  - [ ] Mock handlers created for all endpoints
  - [ ] Mock data matches backend DTO structure
  - [ ] Handlers registered in main handlers file
  - [ ] Error scenarios covered (404, 403, 400)

- [ ] **Accessibility**
  - [ ] Icon buttons have `aria-label`
  - [ ] Form labels associated with inputs
  - [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
  - [ ] Loading states announced to screen readers
  - [ ] Focus visible on all interactive elements
  - [ ] Keyboard navigation works correctly

- [ ] **Error Handling**
  - [ ] API errors display user-friendly messages
  - [ ] Validation errors shown per field
  - [ ] Toast notifications for success/error
  - [ ] Loading states during operations

## Documentation Checklist

- [ ] **README Updated**
  - [ ] Module description
  - [ ] Usage examples
  - [ ] API endpoints listed

- [ ] **Swagger Documentation**
  - [ ] All endpoints documented
  - [ ] Request/response examples
  - [ ] Proper tags

- [ ] **Code Comments**
  - [ ] Complex logic explained
  - [ ] TODO items documented
  - [ ] Edge cases noted

## Advanced Module Checklist (If Applicable)

For modules with complex features like AI Agent, add these additional checks:

- [ ] **Sensitive Data Handling**
  - [ ] API keys encrypted with AES-256-GCM
  - [ ] Encryption key loaded from environment variable
  - [ ] Encryption key existence validated at startup (`OnModuleInit`)
  - [ ] API keys never exposed in responses (use `hasApiKey` pattern)
  - [ ] `@Exclude()` decorator on sensitive fields
  - [ ] No sensitive data in logs

- [ ] **Provider Abstraction (External APIs)**
  - [ ] Abstract base class/interface defined
  - [ ] Concrete implementations for each provider
  - [ ] Runtime provider selection based on configuration
  - [ ] Error handling for provider failures
  - [ ] Timeout handling for external calls

- [ ] **File Upload Handling**
  - [ ] File type validation (whitelist approach)
  - [ ] File size limits configured
  - [ ] Unique filenames generated (prevent overwrites)
  - [ ] Files cleaned up after processing
  - [ ] Swagger `@ApiConsumes('multipart/form-data')` added

- [ ] **Vector Search / RAG**
  - [ ] pgvector extension enabled in database
  - [ ] Vector column with correct dimensions (1536 for ada-002)
  - [ ] IVFFlat index created for similarity search
  - [ ] Embedding generation working
  - [ ] Similarity search returning relevant results
  - [ ] Context injection into prompts

- [ ] **Token/Usage Tracking**
  - [ ] Usage entity with composite unique index (companyId, date)
  - [ ] Atomic upsert for usage recording
  - [ ] Limit checking before expensive operations
  - [ ] Warning threshold alerts implemented
  - [ ] Daily and monthly limits supported
  - [ ] Clear error messages for limit exceeded

- [ ] **Multiple Controllers**
  - [ ] Controllers separated by access level
  - [ ] Admin-only endpoints properly guarded
  - [ ] User-facing endpoints with module/permission guards
  - [ ] Statistics endpoints with role-based access
  - [ ] All controllers registered in module

- [ ] **Environment Variables**
  - [ ] All required env vars documented in `.env.example`
  - [ ] Encryption keys are 32+ characters
  - [ ] Sensitive env vars not committed to repo
  - [ ] Startup validation for required env vars

---

> **Next:** [Module Configuration & Patterns](./15-module-configuration.md)
