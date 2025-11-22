# Architecture Guide

**Version**: 1.0
**Last Updated**: November 2025
**Framework**: NestJS + Nx Monorepo
**Database**: PostgreSQL + TypeORM

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Entity Model](#entity-model)
4. [RBAC System](#rbac-system)
5. [Module System](#module-system)
6. [Security](#security)

---

## System Overview

### Architecture

```
┌─────────────────────────────────┐
│   Frontend (React 19)           │
│   apps/web                      │
└─────────────┬───────────────────┘
              │ REST API
              ↓
┌─────────────────────────────────┐
│   Backend (NestJS)              │
│   apps/api                      │
│   ├── Auth Module               │
│   ├── Admin Module              │
│   ├── Company Module            │
│   └── Business Modules          │
│       └── SimpleText            │
└─────────────┬───────────────────┘
              │ TypeORM
              ↓
┌─────────────────────────────────┐
│   Database (PostgreSQL)         │
│   Multi-tenant with isolation   │
└─────────────────────────────────┘
```

### Key Features

- **Multi-tenant**: Complete data isolation per company
- **Role-based Access**: 3-tier hierarchy (ADMIN, COMPANY_OWNER, EMPLOYEE)
- **Modular System**: Pluggable business modules
- **JWT Authentication**: Access + refresh token pattern
- **Monorepo**: Nx workspace with shared libraries

---

## Technology Stack

### Backend

| Category | Technology | Why Chosen |
|----------|-----------|------------|
| **Framework** | NestJS 11 | TypeScript-first, modular, enterprise-ready |
| **Monorepo** | Nx with @nx/nest | Best NestJS integration, generators |
| **Database** | PostgreSQL | ACID compliance, multi-tenant support |
| **ORM** | TypeORM | Official @nestjs/typeorm integration |
| **Auth** | @nestjs/jwt + passport | Official packages, standard JWT |
| **RBAC** | @casl/ability | NestJS recommended, flexible permissions |
| **Validation** | class-validator | Decorator-based, NestJS standard |
| **API Docs** | @nestjs/swagger | Auto-generated OpenAPI docs |
| **Security** | helmet, throttler | HTTP headers, rate limiting |

### Monorepo Structure

```
accounting/
├── apps/
│   ├── api/              # NestJS backend
│   └── web/              # React frontend
├── libs/
│   ├── auth/             # Shared auth library
│   ├── rbac/             # RBAC guards & services
│   ├── database/         # Database entities
│   └── modules/
│       └── simple-text/  # Business modules
├── migrations/           # Database migrations
└── nx.json               # Nx workspace config
```

---

## Entity Model

### Core Entities

**User**:
```typescript
{
  id: string              // UUID
  email: string           // Unique, lowercase
  password: string        // Bcrypt hashed
  firstName: string
  lastName: string
  role: UserRole          // ADMIN | COMPANY_OWNER | EMPLOYEE
  companyId: string | null // FK to Company
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Company**:
```typescript
{
  id: string              // UUID
  name: string
  ownerId: string         // FK to User
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Module**:
```typescript
{
  id: string              // UUID
  name: string
  slug: string            // Unique, e.g., 'simple-text'
  description: string | null
  isActive: boolean
  createdAt: Date
}
```

**CompanyModuleAccess** (Companies → Modules):
```typescript
{
  id: string              // UUID
  companyId: string       // FK to Company
  moduleId: string        // FK to Module
  isEnabled: boolean
  createdAt: Date

  // Unique constraint: (companyId, moduleId)
}
```

**UserModulePermission** (Employees → Modules):
```typescript
{
  id: string              // UUID
  userId: string          // FK to User
  moduleId: string        // FK to Module
  permissions: string[]   // ['read', 'write', 'delete']
  grantedById: string     // FK to User (who granted)
  createdAt: Date

  // Unique constraint: (userId, moduleId)
}
```

### Relationships

```
User (1) ──< (N) Company
User (1) ──< (N) UserModulePermission
Company (1) ──< (N) CompanyModuleAccess
Module (1) ──< (N) CompanyModuleAccess
Module (1) ──< (N) UserModulePermission
```

---

## RBAC System

### Role Hierarchy

| Role | Scope | Capabilities |
|------|-------|--------------|
| **ADMIN** | System-wide | Manage users, companies, modules |
| **COMPANY_OWNER** | Company-specific | Manage employees, grant permissions |
| **EMPLOYEE** | Module-specific | Access granted modules only |

### Authorization Flow

```
Request
  ↓
JwtAuthGuard → Validate token
  ↓
RolesGuard → Check user role
  ↓
ModuleAccessGuard → Check module access
  ↓
PermissionGuard → Check specific permission
  ↓
Allow/Deny
```

### Guards & Decorators

**Authentication**:
```typescript
@Public()                    // Skip JWT check
@UseGuards(JwtAuthGuard)     // Require JWT
@CurrentUser() user          // Extract user from request
```

**Authorization**:
```typescript
@Roles(UserRole.ADMIN)       // Require role
@RequireModule('simple-text') // Require module access
@RequirePermission('simple-text', 'write') // Require permission
```

### Permission Logic

**ADMIN**:
- Full access to users, companies, modules
- Cannot access business data (e.g., SimpleText)

**COMPANY_OWNER**:
- Full access to enabled modules
- Can manage employees
- Can grant permissions to employees

**EMPLOYEE**:
- Access based on granted permissions
- `read`: View data
- `write`: Create & update data
- `delete`: Delete data

---

## Module System

### Module Lifecycle

1. **Registration** (ADMIN):
   ```
   POST /admin/modules
   { name: "Simple Text", slug: "simple-text" }
   ```

2. **Company Access** (ADMIN):
   ```
   POST /admin/companies/{companyId}/modules/{moduleId}
   → CompanyModuleAccess.isEnabled = true
   ```

3. **Employee Permissions** (COMPANY_OWNER):
   ```
   POST /company/employees/{employeeId}/modules/{slug}
   { permissions: ['read', 'write'] }
   → UserModulePermission created
   ```

4. **Employee Usage**:
   ```
   GET /modules/simple-text
   → Filtered by companyId
   → Requires 'read' permission
   ```

### Implemented Modules

**SimpleText** (`simple-text`):
- Location: `libs/modules/simple-text/`
- Features: CRUD operations for text notes
- Permissions: read, write, delete
- Multi-tenant: Isolated by companyId

### Creating New Modules

See `DEVELOPER_HANDBOOK.md` for step-by-step guide

---

## Security

### Authentication

**JWT Tokens**:
- Access token: 1 hour expiry
- Refresh token: 7 days expiry
- Signed with secret key

**Password Security**:
- Bcrypt hashing with salt
- Minimum 6 characters
- Case-sensitive

### Authorization

**Multi-layered**:
1. Token validation (JwtAuthGuard)
2. Role checking (RolesGuard)
3. Module access (ModuleAccessGuard)
4. Permission checking (PermissionGuard)

**Data Isolation**:
- All business data filtered by companyId
- Guards verify ownership before access
- Database-level constraints

### HTTP Security

**Helmet Headers**:
- XSS protection
- MIME sniffing prevention
- Frame denial

**Rate Limiting**:
- @nestjs/throttler
- Configurable limits per endpoint
- IP-based throttling

**CORS**:
- Configurable allowed origins
- Credentials support for JWT cookies

---

## API Structure

```
/ → Health check
/api/docs → Swagger UI

/auth/* → Public authentication
/admin/* → Admin management (ADMIN only)
/company/* → Company management (COMPANY_OWNER)
/modules/* → Business modules (permission-based)
```

**Total**: 47 REST endpoints

---

## Related Documentation

**Detailed References**:
- Full architecture: `duplicated/architecture/ARCHITECTURE.md`
- Technology decisions: `duplicated/architecture/TECH_STACK_RESEARCH.md`
- API reference: `API_DOCUMENTATION.md`
- Module development: `DEVELOPER_HANDBOOK.md`

**Quick Links**:
- Entity details: See ARCHITECTURE.md
- RBAC service methods: See ARCHITECTURE.md
- Module creation: See DEVELOPER_HANDBOOK.md
- API endpoints: See API_DOCUMENTATION.md

---

**Version**: 1.0
**Status**: Production
**Last Updated**: November 2025
