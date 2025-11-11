# Architecture Documentation

## System Overview

The RBAC system is built using NestJS in an Nx monorepo architecture. It implements a multi-tenant system where companies can have multiple employees with different permission levels.

## Entity Relationships

```
User (1) ──< (N) Company
User (1) ──< (N) UserModulePermission
Company (1) ──< (N) CompanyModuleAccess
Module (1) ──< (N) CompanyModuleAccess
Module (1) ──< (N) UserModulePermission
Company (1) ──< (N) SimpleText
User (1) ──< (N) SimpleText (createdBy)
```

## Entity Details

### User Entity
```typescript
{
  id: string (UUID, PK)
  email: string (unique, lowercase)
  password: string (bcrypt hashed)
  firstName: string
  lastName: string
  role: UserRole (enum: ADMIN | COMPANY_OWNER | EMPLOYEE)
  companyId: string | null (FK to Company)
  isActive: boolean (default: true)
  createdAt: Date
  updatedAt: Date
}
```

### Company Entity
```typescript
{
  id: string (UUID, PK)
  name: string
  ownerId: string (FK to User)
  isActive: boolean (default: true)
  createdAt: Date
  updatedAt: Date
}
```

### Module Entity
```typescript
{
  id: string (UUID, PK)
  name: string
  slug: string (unique, kebab-case)
  description: string | null
  isActive: boolean (default: true)
  createdAt: Date
}
```

### CompanyModuleAccess Entity
```typescript
{
  id: string (UUID, PK)
  companyId: string (FK to Company)
  moduleId: string (FK to Module)
  isEnabled: boolean (default: false)
  createdAt: Date

  Constraints:
  - Unique: (companyId, moduleId)
  - Cascade: ON DELETE CASCADE
}
```

### UserModulePermission Entity
```typescript
{
  id: string (UUID, PK)
  userId: string (FK to User)
  moduleId: string (FK to Module)
  permissions: string[] (simple-array: ['read', 'write', 'delete'])
  grantedById: string (FK to User)
  createdAt: Date

  Constraints:
  - Unique: (userId, moduleId)
  - Cascade: ON DELETE CASCADE
}
```

### SimpleText Entity
```typescript
{
  id: string (UUID, PK)
  companyId: string (FK to Company)
  content: text (max 5000 chars)
  createdById: string (FK to User)
  createdAt: Date
  updatedAt: Date

  Constraints:
  - Cascade: ON DELETE CASCADE (when company deleted)
}
```

## Authorization Flow

### 1. Authentication
- User logs in with email/password
- System validates credentials and generates JWT tokens
- Access token contains: userId, email, role, companyId

### 2. Authorization Decision Tree

```
Request → JwtAuthGuard
  ↓
Is endpoint @Public()?
  Yes → Allow
  No → Validate JWT token
    ↓
Is token valid?
  No → 401 Unauthorized
  Yes → Extract user from token
    ↓
Is @Roles() required?
  Yes → Check user role matches
    No → 403 Forbidden
    Yes → Continue
  ↓
Is @RequireModule() required?
  Yes → Check module access
    ADMIN → Always allowed (but no business data)
    COMPANY_OWNER → Check CompanyModuleAccess
    EMPLOYEE → Check CompanyModuleAccess + UserModulePermission
  ↓
Is @RequirePermission() required?
  Yes → Check specific permission
    ADMIN → Always allowed (but no business data)
    COMPANY_OWNER → Full access to enabled modules
    EMPLOYEE → Check UserModulePermission array
  ↓
Allow request
```

## Guard Execution Order

Guards are executed in a specific order to ensure proper authorization:

1. **JwtAuthGuard** (Authentication)
   - Applied: Globally or at controller level
   - Purpose: Validates JWT token and extracts user
   - Skip: Use `@Public()` decorator
   - Result: Attaches `user` object to request

2. **RolesGuard** (Role-Based Authorization)
   - Applied: Via `@Roles()` decorator
   - Purpose: Verifies user has required role
   - Check: User role matches decorator requirements
   - Result: 403 if role doesn't match

3. **OwnerOrAdminGuard** (Ownership Verification)
   - Applied: On company-specific endpoints
   - Purpose: Ensures COMPANY_OWNER operates on own company
   - Check: `user.companyId === targetCompanyId` OR user is ADMIN
   - Result: 403 if not owner and not admin

4. **ModuleAccessGuard** (Module Access Check)
   - Applied: Via `@RequireModule('slug')` decorator
   - Purpose: Verifies user can access module
   - Check: Calls `RBACService.canAccessModule()`
   - Logic:
     - ADMIN: Always true
     - COMPANY_OWNER: `CompanyModuleAccess.isEnabled = true`
     - EMPLOYEE: Company access + `UserModulePermission` exists
   - Result: 403 if no access

5. **PermissionGuard** (Permission Check)
   - Applied: Via `@RequirePermission('slug', 'permission')` decorator
   - Purpose: Verifies specific permission (read/write/delete)
   - Check: Calls `RBACService.hasPermission()`
   - Logic:
     - ADMIN: Always true (except business data)
     - COMPANY_OWNER: Always true for enabled modules
     - EMPLOYEE: Check `UserModulePermission.permissions` array
   - Result: 403 if permission not granted

**Typical Guard Combination**:
```typescript
@Controller('modules/simple-text')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('simple-text')
export class SimpleTextController {
  @Get()
  @RequirePermission('simple-text', 'read')
  findAll(@CurrentUser() user: User) { ... }
}
```

## Permission System

### Permission Types
- `read`: View data
- `write`: Create and update data
- `delete`: Delete data

### Role Permissions

**ADMIN**:
- Can manage all users, companies, and modules
- Cannot access business module data (e.g., SimpleText)
- Can enable/disable modules for companies

**COMPANY_OWNER**:
- Can manage employees in their company
- Has full access (read, write, delete) to all enabled modules
- Can grant/revoke module access to employees
- Cannot grant access to modules not enabled for their company

**EMPLOYEE**:
- Can access modules based on granted permissions
- Permissions are granular (read, write, delete)
- Can only see data from their company

## Additional Decorators

Beyond the core guards, the system provides several utility decorators:

### @CurrentUser()
**Purpose**: Extract authenticated user from request
**Location**: `libs/auth/src/lib/decorators/current-user.decorator.ts`
**Usage**:
```typescript
@Get()
findAll(@CurrentUser() user: User) {
  // user object contains: id, email, role, companyId
}
```

### @Public()
**Purpose**: Skip JWT authentication for public endpoints
**Location**: `libs/auth/src/lib/decorators/public.decorator.ts`
**Usage**:
```typescript
@Public()
@Post('/auth/login')
login(@Body() credentials: LoginDto) {
  // No JWT required
}
```

### @Roles(...roles)
**Purpose**: Require specific user role(s)
**Location**: `libs/auth/src/lib/decorators/roles.decorator.ts`
**Usage**:
```typescript
@Roles(UserRole.ADMIN)
@Get('/admin/users')
getAllUsers() {
  // Only ADMIN can access
}

@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
@Get('/company/employees')
getEmployees() {
  // COMPANY_OWNER or ADMIN can access
}
```

### @RequireModule(slug)
**Purpose**: Require access to specific module
**Location**: `libs/rbac/src/lib/decorators/require-module.decorator.ts`
**Usage**:
```typescript
@RequireModule('simple-text')
export class SimpleTextController {
  // All endpoints require simple-text module access
}
```

### @RequirePermission(module, permission)
**Purpose**: Require specific permission on module
**Location**: `libs/rbac/src/lib/decorators/require-permission.decorator.ts`
**Usage**:
```typescript
@RequirePermission('simple-text', 'write')
@Post()
create(@Body() dto: CreateDto) {
  // Requires write permission on simple-text module
}
```

### @OwnerOrAdmin()
**Purpose**: Allow only company owner or system admin
**Location**: `libs/rbac/src/lib/decorators/owner-or-admin.decorator.ts`
**Usage**:
```typescript
@OwnerOrAdmin()
@Patch('/company/employees/:id')
updateEmployee(@Param('id') id: string) {
  // Only company owner or ADMIN can update
}
```

## Module System

Modules are business features that can be enabled/disabled per company:

1. **Module Registration**: Admin creates modules in the system
2. **Company Access**: Admin enables modules for companies
3. **Employee Permissions**: Company owner grants permissions to employees

Example flow:
1. Admin creates "simple-text" module
2. Admin enables "simple-text" for Company A
3. Company A owner grants "read, write" permissions to Employee 1
4. Employee 1 can now read and write SimpleText entries

## RBACService Methods

The RBACService provides core authorization logic:

### canAccessModule(userId, moduleSlug)
**Purpose**: Check if user can access a module
**Returns**: `Promise<boolean>`
**Logic**:
- **ADMIN**: Always returns `true`
- **COMPANY_OWNER**: Checks if `CompanyModuleAccess.isEnabled = true`
- **EMPLOYEE**: Checks company access AND `UserModulePermission` exists

**Usage**:
```typescript
const hasAccess = await this.rbacService.canAccessModule(user.id, 'simple-text');
if (!hasAccess) {
  throw new ForbiddenException('No access to module');
}
```

### hasPermission(userId, moduleSlug, permission)
**Purpose**: Check if user has specific permission on module
**Parameters**:
- `permission`: 'read' | 'write' | 'delete'
**Returns**: `Promise<boolean>`
**Logic**:
- **ADMIN**: Always `true` (except business data)
- **COMPANY_OWNER**: `true` if module enabled for company
- **EMPLOYEE**: Checks if permission exists in `UserModulePermission.permissions[]`

**Usage**:
```typescript
const canWrite = await this.rbacService.hasPermission(
  user.id,
  'simple-text',
  'write'
);
```

### grantModuleAccess(granterId, targetId, moduleSlug, permissions)
**Purpose**: Grant module access to user or company
**Behavior**:
- **ADMIN → Company**: Creates/updates `CompanyModuleAccess`
- **COMPANY_OWNER → Employee**: Creates/updates `UserModulePermission`
**Validation**: Granter must have access to module

**Usage**:
```typescript
await this.rbacService.grantModuleAccess(
  ownerId,
  employeeId,
  'simple-text',
  ['read', 'write']
);
```

### revokeModuleAccess(granterId, targetId, moduleSlug)
**Purpose**: Revoke module access
**Behavior**:
- **ADMIN → Company**: Sets `CompanyModuleAccess.isEnabled = false`
- **COMPANY_OWNER → Employee**: Deletes `UserModulePermission` record
**Cascade**: Company-level revocation removes all employee permissions

**Usage**:
```typescript
await this.rbacService.revokeModuleAccess(ownerId, employeeId, 'simple-text');
```

### getAvailableModules(userId)
**Purpose**: Get list of modules available to user
**Returns**: `Promise<Module[]>`
**Logic**:
- **ADMIN**: All active modules
- **COMPANY_OWNER/EMPLOYEE**: Modules where `CompanyModuleAccess.isEnabled = true`

**Usage**:
```typescript
const modules = await this.rbacService.getAvailableModules(user.id);
```

## Module Status

### Implemented Modules
- ✅ **SimpleText** (`simple-text`)
  - Location: `libs/modules/simple-text/`
  - Purpose: Basic text management for accounting notes
  - Permissions: read, write, delete
  - Status: Fully implemented and tested

### Tutorial/Example Modules
- 📚 **Tasks** (tutorial only)
  - Location: Documented in `MODULE_DEVELOPMENT.md`
  - Purpose: Complete example for creating new modules
  - Status: **Not implemented** - serves as development guide
  - Note: Follow this pattern to create new business modules

### Creating New Modules
To add a new business module:
1. Follow the step-by-step guide in `MODULE_DEVELOPMENT.md`
2. Use SimpleText as a reference implementation
3. Ensure multi-tenant support with `companyId` filtering
4. Implement proper RBAC integration
5. Register module in database via seeder

## Data Isolation

All business data is isolated by `companyId`:
- Users can only access data from their company
- Guards verify company ownership before data access
- Database queries filter by `companyId`

## Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Signed with secret, expiration times
3. **CORS**: Configurable origins
4. **Helmet**: HTTP security headers
5. **Validation**: class-validator on all DTOs
6. **Guards**: Multiple layers of authorization checks

## API Structure

```
/auth/*              - Authentication endpoints (public)
/admin/*             - Admin management (ADMIN only)
/company/*           - Company management (COMPANY_OWNER only)
/modules/*           - Business modules (permission-based)
```

## Swagger Configuration

Interactive API documentation is available via Swagger/OpenAPI:

**Endpoint**: `http://localhost:3000/api/docs`

### Configuration
- **Location**: `apps/api/src/main.ts`
- **Title**: Accounting API
- **Version**: 1.0
- **Authentication**: JWT Bearer token

### API Tags
- **Health**: Health check endpoints
- **Auth**: Authentication endpoints (login, register, refresh)
- **Admin**: Admin management endpoints (users, companies, modules)
- **Company**: Company management endpoints (employees, permissions)
- **simple-text**: SimpleText module endpoints

### Authentication in Swagger
1. Click "Authorize" button in Swagger UI
2. Enter JWT token in format: `Bearer <your_token>`
3. Token will be included in all subsequent requests
4. Obtain token via `/auth/login` or `/auth/register`

### Adding Module to Swagger
When creating a new module:
```typescript
// In main.ts
const config = new DocumentBuilder()
  // ...
  .addTag('my-module', 'My Module endpoints description')
  .build();

// In controller
@ApiTags('my-module')
@Controller('modules/my-module')
export class MyModuleController { ... }
```

### Response Documentation
All endpoints are documented with:
- Request body schemas (DTOs)
- Response schemas
- HTTP status codes
- Error responses
- Example values

## Testing Strategy

1. **Unit Tests**: Services, guards, and utilities
2. **E2E Tests**: Full request/response cycles with different roles
3. **Test Data**: Seeded database with known test users

## Deployment Considerations

1. **Environment Variables**: All secrets in environment
2. **Database Migrations**: TypeORM migrations for schema changes
3. **Health Checks**: `/` endpoint for health monitoring
4. **Logging**: Structured logging for production
5. **Error Handling**: Proper HTTP status codes and error messages

---

## Related Documentation

This document is part of a comprehensive documentation suite:

- **ARCHITECTURE.md** (this document) - System architecture and design
- **API_ENDPOINTS.md** - Complete API endpoint reference with examples
- **MODULE_DEVELOPMENT.md** - Step-by-step guide for creating new modules
- **IMPLEMENTATION_PATTERNS.md** - Code patterns and best practices
- **README.md** - Project overview and setup instructions

### Quick Navigation

**For Developers**:
- 📖 Understanding the system → Start with ARCHITECTURE.md
- 🔧 Creating a new module → Follow MODULE_DEVELOPMENT.md
- 💻 Looking for code examples → Check IMPLEMENTATION_PATTERNS.md
- 📚 API reference needed → Use API_ENDPOINTS.md

**For API Users**:
- 📊 Complete API documentation → API_ENDPOINTS.md
- 🔐 Authentication guide → API_ENDPOINTS.md (Authentication section)
- 🧪 Testing the API → API_ENDPOINTS.md (Common Workflows section)

