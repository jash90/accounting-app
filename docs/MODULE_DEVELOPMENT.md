# Module Development Guide - Complete Tutorial

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start (TL;DR)](#quick-start-tldr)
3. [Prerequisites](#prerequisites)
4. [Architecture Overview](#architecture-overview)
5. [Step-by-Step Tutorial](#step-by-step-tutorial)
6. [Complete Code Examples](#complete-code-examples)
7. [Common Patterns](#common-patterns)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)
11. [Advanced Topics](#advanced-topics)
12. [Reference](#reference)
13. [Final Checklist](#final-checklist)
14. [Additional Topics](#additional-topics)
    - [Navigation Integration](#navigation-integration)
    - [MSW Mock Handlers](#msw-mock-handlers)
    - [React 19 & TanStack Query v5 Patterns](#react-19--tanstack-query-v5-patterns)
    - [Permission-Based UI Rendering](#permission-based-ui-rendering)
    - [Accessibility Best Practices](#accessibility-best-practices)
    - [Environment Configuration](#environment-configuration)
    - [Error Handling Patterns](#error-handling-patterns)

---

## Introduction

This comprehensive guide walks you through creating a new business module in the Accounting API system. We'll build a **Tasks Module** as a complete example, demonstrating all patterns, integrations, and best practices.

### What You'll Learn

- Creating entities with multi-tenant support
- Implementing CRUD operations with proper authorization
- Integrating with the RBAC system
- Database migrations
- Module registration and configuration
- Testing your module

### Example Module: Tasks

We'll build a task management module that allows:
- Companies to manage their tasks
- Assigning tasks to employees
- Setting priorities, due dates, and statuses
- Complete multi-tenant data isolation

### Estimated Time

**2-4 hours** for first-time implementation
**1-2 hours** for experienced developers

---

## Quick Start (TL;DR)

For experienced developers, here's the condensed version:

**Backend Setup:**
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

**Frontend Setup:**
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
```

**Key Files to Create/Modify**:

**Backend:**
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

**Frontend:**
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

---

## Prerequisites

### Required Knowledge

- TypeScript/JavaScript
- NestJS basics
- TypeORM
- REST API concepts
- Basic understanding of RBAC

### Tools & Environment

- Node.js 18+
- npm or yarn
- PostgreSQL
- NestJS CLI
- Nx CLI

### Understanding the Project Structure

```
accounting/
├── apps/
│   └── api/                    # Main application
│       ├── src/
│       │   ├── app/            # AppModule
│       │   ├── admin/          # Admin management
│       │   ├── company/        # Company management
│       │   ├── seeders/        # Database seeders
│       │   └── main.ts         # Bootstrap
│       └── typeorm.config.ts   # TypeORM config
├── libs/
│   ├── auth/                   # Authentication library
│   ├── rbac/                   # RBAC library
│   ├── common/                 # Shared entities & enums
│   │   └── entities/           # All database entities
│   └── modules/                # Business modules
│       ├── simple-text/        # Example module
│       └── tasks/              # Our new module (to be created)
└── package.json
```

---

## Architecture Overview

### Multi-Tenant Architecture

Every business module must support multi-tenancy:

```
Company A                    Company B
   ├── User 1                   ├── User 1
   ├── User 2                   ├── User 2
   ├── Task 1                   ├── Task 1
   ├── Task 2                   ├── Task 2
   └── Task 3                   └── Task 3

Data is isolated by companyId - Company A cannot access Company B's data
```

### RBAC System

Three-tier authorization:

```
ADMIN
  └─ System administration
  └─ Cannot access business data

COMPANY_OWNER
  └─ Full access to company modules
  └─ Grants permissions to employees

EMPLOYEE
  └─ Access based on granted permissions
  └─ Permissions: read, write, delete
```

### System Admin Company Pattern

**Special Pattern for ADMIN Users**:

```
ADMIN User Flow:
  ├─ Creates entries in "System Admin" company
  ├─ Views only System Admin company data
  ├─ Isolated from regular business companies
  └─ Used for system-wide configuration/testing

Implementation:
  ├─ companyId: nullable in entity (string | null)
  ├─ Company relation: nullable: true
  ├─ Service: getSystemCompany() helper method
  └─ Query: filter by system company ID for ADMINs
```

**Key Differences from Regular Business Data**:
- ✅ ADMINs CAN create/view/modify data (in System Admin company only)
- ✅ `companyId` is nullable to support system-level entries
- ✅ Service must inject `Company` repository to find system company
- ✅ System company has special flag: `isSystemCompany: true`

### Module Components

```
┌─────────────┐
│ Controller  │  HTTP layer, Guards, Validation
└──────┬──────┘
       │
┌──────▼──────┐
│  Service    │  Business logic, Data access
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │  TypeORM, Database queries
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │  PostgreSQL
└─────────────┘
```

---

## Step-by-Step Tutorial

### Phase 1: Preparation

#### Step 1: Analyze Requirements

**Business Requirements for Tasks Module**:
- ✅ Create, read, update, delete tasks
- ✅ Assign tasks to employees
- ✅ Set priority (low, medium, high, urgent)
- ✅ Set due dates
- ✅ Track status (todo, in_progress, done, cancelled)
- ✅ Multi-company support
- ✅ Audit trail (who created, when)

**Data Model**:
```
Task
  - id (UUID)
  - title (string, required)
  - description (text, optional)
  - status (enum)
  - priority (enum)
  - dueDate (date, optional)
  - companyId (FK to Company)
  - createdById (FK to User)
  - assigneeId (FK to User, optional)
  - createdAt (timestamp)
  - updatedAt (timestamp)
```

**Permissions**:
- `read`: View tasks
- `write`: Create and update tasks
- `delete`: Delete tasks

---

### Phase 2: Project Structure

#### Step 2: Generate Nx Library

```bash
# Navigate to project root
cd /Users/bartlomiejzimny/Projects/accounting

# Generate library with Nx
nx generate @nx/node:library tasks \
  --directory=libs/modules/tasks \
  --publishable=false \
  --importPath=@accounting/modules/tasks
```

This creates:
```
libs/modules/tasks/
├── project.json
├── README.md
├── tsconfig.json
├── tsconfig.lib.json
└── src/
    ├── index.ts
    └── lib/
```

#### Step 3: Create Module Structure

Create the following directory structure manually:

```bash
mkdir -p libs/modules/tasks/src/lib/controllers
mkdir -p libs/modules/tasks/src/lib/services
mkdir -p libs/modules/tasks/src/lib/dto
```

Final structure:
```
libs/modules/tasks/
└── src/
    ├── index.ts
    └── lib/
        ├── controllers/
        │   └── task.controller.ts         (to be created)
        ├── services/
        │   └── task.service.ts            (to be created)
        ├── dto/
        │   ├── create-task.dto.ts         (to be created)
        │   ├── update-task.dto.ts         (to be created)
        │   └── task-response.dto.ts       (to be created)
        └── tasks.module.ts                (to be created)
```

---

### Phase 3: Data Layer (Entity)

#### Step 4: Create Task Entity

Create file: `libs/common/src/lib/entities/task.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

// Enums for type safety
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')  // Table name in database
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;  // TypeScript non-null assertion

  // Business fields
  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate!: Date | null;

  // Multi-tenant: Company relationship
  // Note: nullable to support System Admin company pattern
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.tasks, {
    nullable: true,  // Important: allows null for system-level entries
    onDelete: 'CASCADE',  // When company deleted, all tasks deleted
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // Audit trail: Creator (REQUIRED)
  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  // Task assignment (OPTIONAL)
  @Column({ nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigneeId' })
  assignee!: User | null;

  // Timestamps (AUTO-GENERATED)
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

**Key Points**:
- ✅ UUID primary key for security
- ✅ TypeScript non-null assertions (`!`) for all fields
- ✅ `companyId` nullable to support System Admin company pattern
- ✅ `nullable: true` in Company relation decorator
- ✅ `createdById` for audit trail
- ✅ Enums for type safety (status, priority)
- ✅ CASCADE delete when company is deleted
- ✅ Nullable fields where appropriate (description, dueDate, assigneeId, companyId)
- ✅ Automatic timestamps

**Important**: The `!` (non-null assertion) tells TypeScript that these fields will be initialized by TypeORM decorators, even though they're not explicitly set in the constructor.

#### Step 5: Export Entity from Common Library

Update `libs/common/src/index.ts`:

```typescript
// Existing exports...
export * from './lib/entities/user.entity';
export * from './lib/entities/company.entity';
export * from './lib/entities/module.entity';
export * from './lib/entities/company-module-access.entity';
export * from './lib/entities/user-module-permission.entity';
export * from './lib/entities/simple-text.entity';

// Add new entity export
export * from './lib/entities/task.entity';
export { TaskStatus, TaskPriority } from './lib/entities/task.entity';  // Export enums
```

#### Step 6: Update Company Entity

Add relationship in `libs/common/src/lib/entities/company.entity.ts`:

```typescript
import { Task } from './task.entity';  // Add import

@Entity('companies')
export class Company {
  // ... existing fields ...

  // Add relationship
  @OneToMany(() => Task, (task) => task.company)
  tasks: Task[];

  // ... rest of entity ...
}
```

---

### Phase 4: DTOs (Data Transfer Objects)

#### Step 7: CreateTaskDto

Create file: `libs/modules/tasks/src/lib/dto/create-task.dto.ts`

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@accounting/common';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Complete Q1 financial report',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    example: 'Prepare and review all financial statements for Q1 2024',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Due date (ISO 8601 format)',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'User ID to assign task to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
```

**Key Points**:
- ✅ All validation decorators from class-validator
- ✅ Swagger documentation for API docs
- ✅ Optional fields marked with `?` and `@IsOptional()`
- ✅ Enums for type safety
- ✅ Min/max length constraints
- ✅ UUID validation for assigneeId

#### Step 8: UpdateTaskDto

Create file: `libs/modules/tasks/src/lib/dto/update-task.dto.ts`

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@accounting/common';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task title',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Due date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;  // Allow null to clear due date

  @ApiPropertyOptional({
    description: 'User ID to assign task to',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;  // Allow null to unassign
}
```

**Key Points**:
- ✅ All fields optional (partial update pattern)
- ✅ Same validation rules as CreateDto
- ✅ Allow `null` for fields that can be cleared

#### Step 9: TaskResponseDto

Create file: `libs/modules/tasks/src/lib/dto/task-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@accounting/common';

// Nested type: Simplified user info in response
class UserBasicInfoDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;
}

// Nested type: Company info for System Admin Company pattern
class CompanyBasicInfoDto {
  @ApiProperty({ description: 'Company ID' })
  id: string;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiProperty({ description: 'Is this the System Admin company' })
  isSystemCompany: boolean;
}

export class TaskResponseDto {
  @ApiProperty({
    description: 'Task ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, description: 'Task status' })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, description: 'Task priority' })
  priority: TaskPriority;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate: Date | null;

  @ApiPropertyOptional({ description: 'Company ID (nullable for System Admin entries)' })
  companyId: string | null;

  @ApiPropertyOptional({
    description: 'Company details (includes isSystemCompany for UI logic)',
    type: CompanyBasicInfoDto,
  })
  company: CompanyBasicInfoDto | null;

  @ApiProperty({
    description: 'User who created the task',
    type: UserBasicInfoDto,
  })
  createdBy: UserBasicInfoDto;

  @ApiPropertyOptional({
    description: 'User assigned to the task',
    type: UserBasicInfoDto,
  })
  assignee: UserBasicInfoDto | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
```

**Key Points**:
- ✅ Complete API response structure
- ✅ Nested types for related entities (UserBasicInfoDto, CompanyBasicInfoDto)
- ✅ Include `company` object with `isSystemCompany` flag for frontend UI logic
- ✅ `companyId` nullable to support System Admin Company pattern
- ✅ Swagger documentation for all fields including nested types
- ✅ Use `type: ` parameter in @ApiProperty for nested objects

**Pattern**: Create separate classes for nested data structures instead of inline interfaces. This provides better Swagger documentation and type reusability across multiple DTOs.

---

### Phase 5: Service Layer (Business Logic)

#### Step 10: TaskService Implementation

Create file: `libs/modules/tasks/src/lib/services/task.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, User, UserRole, Company } from '@accounting/common';  // Include Company for System Company pattern
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,  // Required for System Company pattern
  ) {}

  /**
   * Helper: Get System Admin company
   * Used for ADMIN user data isolation
   */
  private async getSystemCompany(): Promise<Company> {
    const systemCompany = await this.companyRepository.findOne({
      where: { isSystemCompany: true },
    });

    if (!systemCompany) {
      throw new Error('System Admin company not found. Please run migrations.');
    }

    return systemCompany;
  }

  /**
   * Find all tasks for user's company
   * - ADMIN can view System Admin company data only
   * - Company users see their company's data
   * - Filtered by companyId
   * - Ordered by createdAt descending
   */
  async findAll(user: User): Promise<Task[]> {
    // ADMIN users can view System Admin company records
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      return this.taskRepository.find({
        where: { companyId: systemCompany.id },
        relations: ['createdBy', 'assignee', 'company'],
        order: { createdAt: 'DESC' },
      });
    }

    // Company users see their company's records
    if (!user.companyId) {
      return [];
    }

    return this.taskRepository.find({
      where: { companyId: user.companyId },
      relations: ['createdBy', 'assignee', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one task by ID
   * - Verifies task belongs to user's company (or System Admin company for ADMINs)
   * - Returns 404 if not found
   * - Returns 403 if different company
   */
  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignee', 'company'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Multi-tenant isolation check
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      if (task.companyId !== systemCompany.id) {
        throw new ForbiddenException('Access denied to this resource');
      }
    } else {
      if (user.companyId !== task.companyId) {
        throw new ForbiddenException('Access denied to this resource');
      }
    }

    return task;
  }

  /**
   * Create new task
   * - Auto-assigns companyId (user's company or System Admin company for ADMINs)
   * - Auto-assigns createdById from user
   * - Validates assignee belongs to same company
   * - Returns entity with all relations loaded
   */
  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    // Determine target company (System Admin company for ADMINs, user's company for others)
    let targetCompanyId: string;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      targetCompanyId = systemCompany.id;
    } else {
      if (!user.companyId) {
        throw new ForbiddenException('User is not associated with a company');
      }
      targetCompanyId = user.companyId;
    }

    // If assigneeId provided, validate they exist and belong to same company
    if (createTaskDto.assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: createTaskDto.assigneeId },
      });

      if (!assignee) {
        throw new BadRequestException('Assignee user not found');
      }

      if (assignee.companyId !== targetCompanyId) {
        throw new ForbiddenException(
          'Cannot assign task to user from different company',
        );
      }
    }

    // Create task with automatic company/user association
    const task = this.taskRepository.create({
      ...createTaskDto,
      companyId: targetCompanyId,  // Auto-set from authenticated user or System Company
      createdById: user.id,        // Auto-set from authenticated user
      // dueDate is automatically converted from string to Date by TypeORM
    });

    const savedTask = await this.taskRepository.save(task);

    // Reload with relations for consistent response structure
    return this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: ['createdBy', 'assignee', 'company'],
    }) as Promise<Task>;
  }

  /**
   * Update task
   * - Verifies ownership (same company)
   * - Validates assignee if changed
   * - Partial update supported
   */
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ): Promise<Task> {
    // Verify ownership and get existing task
    const task = await this.findOne(id, user);

    // If assigneeId is being changed, validate new assignee
    if (
      updateTaskDto.assigneeId !== undefined &&
      updateTaskDto.assigneeId !== null
    ) {
      const assignee = await this.userRepository.findOne({
        where: { id: updateTaskDto.assigneeId },
      });

      if (!assignee) {
        throw new BadRequestException('Assignee user not found');
      }

      if (assignee.companyId !== user.companyId) {
        throw new ForbiddenException(
          'Cannot assign task to user from different company',
        );
      }
    }

    // Apply updates
    Object.assign(task, updateTaskDto);

    const savedTask = await this.taskRepository.save(task);

    // Return with relations
    return this.findOne(savedTask.id, user);
  }

  /**
   * Delete task
   * - Verifies ownership (same company)
   * - Hard delete from database
   */
  async remove(id: string, user: User): Promise<void> {
    // Verify ownership
    const task = await this.findOne(id, user);

    await this.taskRepository.remove(task);
  }

  /**
   * Get tasks by status (useful for filtering)
   */
  async findByStatus(status: string, user: User): Promise<Task[]> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

    if (!user.companyId) {
      return [];
    }

    return this.taskRepository.find({
      where: {
        companyId: user.companyId,
        status: status as any,
      },
      relations: ['createdBy', 'assignee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get tasks assigned to specific user
   */
  async findAssignedToUser(userId: string, user: User): Promise<Task[]> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

    if (!user.companyId) {
      return [];
    }

    return this.taskRepository.find({
      where: {
        companyId: user.companyId,
        assigneeId: userId,
      },
      relations: ['createdBy', 'assignee'],
      order: { dueDate: 'ASC', priority: 'DESC' },
    });
  }
}
```

**Key Points**:
- ✅ Repository injection with `@InjectRepository()` (including `Company` for System Company pattern)
- ✅ Multi-tenant filtering by `companyId`
- ✅ **System Admin Company Pattern**: ADMINs work with System Company data
- ✅ `getSystemCompany()` helper method for ADMIN data isolation
- ✅ Different data access logic for ADMIN vs Company users
- ✅ Ownership verification before modify/delete
- ✅ Automatic company/user association (user's company or System Company)
- ✅ Reload entity with relations after save for consistent responses
- ✅ Assignee validation (same company)
- ✅ Proper error handling with NestJS exceptions
- ✅ Relations loaded for complete data
- ✅ Additional helper methods (findByStatus, findAssignedToUser)

**Important Note**: When implementing System Admin Company pattern, you must:
1. Import `Company` entity in addition to your main entity
2. Inject `Company` repository in service constructor
3. Create `getSystemCompany()` helper method
4. Check `user.role === UserRole.ADMIN` in all CRUD methods
5. Use System Company ID for ADMIN operations

---

### Phase 6: Controller Layer (HTTP Endpoints)

#### Step 11: TaskController Implementation

Create file: `libs/modules/tasks/src/lib/controllers/task.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '@accounting/auth';
import {
  RequireModule,
  RequirePermission,
  ModuleAccessGuard,
  PermissionGuard,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskResponseDto } from '../dto/task-response.dto';

@ApiTags('tasks')                              // Swagger tag
@ApiBearerAuth('JWT-auth')                     // Requires JWT
@Controller('modules/tasks')                    // Route: /modules/tasks
@UseGuards(ModuleAccessGuard, PermissionGuard) // Apply authorization guards
@RequireModule('tasks')                         // Require module access
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * GET /modules/tasks
   * List all tasks for user's company
   */
  @Get()
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get all tasks for user company' })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
    type: [TaskResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'No module access or no read permission',
  })
  async findAll(@CurrentUser() user: User): Promise<Task[]> {
    return this.taskService.findAll(user);
  }

  /**
   * GET /modules/tasks/status/:status
   * Get tasks filtered by status
   */
  @Get('status/:status')
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get tasks by status' })
  @ApiParam({
    name: 'status',
    enum: ['todo', 'in_progress', 'done', 'cancelled'],
  })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  async findByStatus(
    @Param('status') status: string,
    @CurrentUser() user: User,
  ): Promise<Task[]> {
    return this.taskService.findByStatus(status, user);
  }

  /**
   * GET /modules/tasks/assigned/:userId
   * Get tasks assigned to specific user
   */
  @Get('assigned/:userId')
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get tasks assigned to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  async findAssignedToUser(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ): Promise<Task[]> {
    return this.taskService.findAssignedToUser(userId, user);
  }

  /**
   * GET /modules/tasks/:id
   * Get single task by ID
   */
  @Get(':id')
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Task details',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.findOne(id, user);
  }

  /**
   * POST /modules/tasks
   * Create new task
   */
  @Post()
  @RequirePermission('tasks', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or assignee not found',
  })
  @ApiResponse({ status: 403, description: 'No write permission' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.create(createTaskDto, user);
  }

  /**
   * PATCH /modules/tasks/:id
   * Update existing task
   */
  @Patch(':id')
  @RequirePermission('tasks', 'write')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.update(id, updateTaskDto, user);
  }

  /**
   * DELETE /modules/tasks/:id
   * Delete task
   */
  @Delete(':id')
  @RequirePermission('tasks', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'No delete permission' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.taskService.remove(id, user);
  }
}
```

**Key Points**:
- ✅ `@Controller()` with route prefix
- ✅ Guards applied at class level
- ✅ `@RequireModule()` for module access
- ✅ `@RequirePermission()` per endpoint
- ✅ `@CurrentUser()` to extract authenticated user
- ✅ Complete Swagger documentation
- ✅ HTTP status codes with `@HttpCode()`
- ✅ Additional filter endpoints (status, assignee)

---

### Phase 7: Module Configuration

#### Step 12: TaskModule

Create file: `libs/modules/tasks/src/lib/tasks.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, User, Company } from '@accounting/common';  // Include Company for System Admin pattern
import { RBACModule } from '@accounting/rbac';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    // Register entities for this module
    // Important: Include Company when using System Admin Company pattern
    TypeOrmModule.forFeature([Task, User, Company]),

    // Import RBAC module for guards and decorators
    RBACModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],  // Export if needed by other modules
})
export class TasksModule {}
```

**Key Points**:
- ✅ Import `TypeOrmModule.forFeature()` with required entities
- ✅ **Include `Company` entity** when service needs System Admin Company pattern
- ✅ Import `RBACModule` for authorization
- ✅ Register controller and service
- ✅ Export service if other modules need it

**When to include Company entity**:
- ✅ Module implements System Admin Company pattern
- ✅ Service needs to query for system company (`getSystemCompany()`)
- ✅ ADMIN users need access to module data
- ❌ Not needed if module is strictly for company users only

#### Step 13: Public Exports

Update `libs/modules/tasks/src/index.ts`:

```typescript
// Module
export * from './lib/tasks.module';

// Service
export * from './lib/services/task.service';

// Controller
export * from './lib/controllers/task.controller';

// DTOs
export * from './lib/dto/create-task.dto';
export * from './lib/dto/update-task.dto';
export * from './lib/dto/task-response.dto';
```

**Key Points**:
- ✅ Export all public APIs
- ✅ Allows importing from `@accounting/modules/tasks`

---

### Phase 8: Application Integration

#### Step 14: Register in AppModule

Update `apps/api/src/app/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
  SimpleText,
  Task,  // Add Task entity
} from '@accounting/common';
import { AuthModule } from '@accounting/auth';
import { RBACModule } from '@accounting/rbac';
import { SimpleTextModule } from '@accounting/modules/simple-text';
import { TasksModule } from '@accounting/modules/tasks';  // Import TasksModule
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'accounting',
        entities: [
          User,
          Company,
          ModuleEntity,
          CompanyModuleAccess,
          UserModulePermission,
          SimpleText,
          Task,  // Register Task entity
        ],
        synchronize: false,  // Use migrations in production
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    AuthModule,
    RBACModule,
    SimpleTextModule,
    TasksModule,  // Import TasksModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Key Points**:
- ✅ Import `TasksModule`
- ✅ Add `Task` entity to TypeORM entities array
- ✅ Module will be automatically registered

#### Step 15: Register in TypeORM Config

Update `apps/api/typeorm.config.ts`:

```typescript
import { DataSource } from 'typeorm';
import {
  User,
  Company,
  Module,
  CompanyModuleAccess,
  UserModulePermission,
  SimpleText,
  Task,  // Import Task entity
} from '@accounting/common';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'accounting',
  entities: [
    User,
    Company,
    Module,
    CompanyModuleAccess,
    UserModulePermission,
    SimpleText,
    Task,  // Add Task entity
  ],
  migrations: ['apps/api/src/migrations/*.ts'],
  synchronize: false,
});
```

**Key Points**:
- ✅ Import and register `Task` entity
- ✅ Required for migrations to work

---

### Phase 9: Database Migration

#### Step 16: Generate Migration

```bash
# Make sure your database is running
# PostgreSQL should be accessible

# Generate migration
npm run migration:generate -- apps/api/src/migrations/AddTaskEntity
```

This generates a migration file in `apps/api/src/migrations/` with content similar to:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskEntity1234567890123 implements MigrationInterface {
  name = 'AddTaskEntity1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."tasks_status_enum" AS ENUM(
        'todo',
        'in_progress',
        'done',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."tasks_priority_enum" AS ENUM(
        'low',
        'medium',
        'high',
        'urgent'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo',
        "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium',
        "dueDate" date,
        "companyId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "assigneeId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_companyId"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_createdById"
      FOREIGN KEY ("createdById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_assigneeId"
      FOREIGN KEY ("assigneeId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_companyId" ON "tasks" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_status" ON "tasks" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_assigneeId" ON "tasks" ("assigneeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_assigneeId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_companyId"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assigneeId"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_createdById"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_companyId"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
```

**Key Points**:
- ✅ Enum types created for status and priority
- ✅ Table with all columns
- ✅ Foreign key constraints
- ✅ CASCADE delete on company
- ✅ Indexes for performance
- ✅ Down migration for rollback

#### Step 17: Review and Run Migration

Review the generated migration, then run:

```bash
# Run migration
npm run migration:run

# Verify in database
psql -U postgres -d accounting -c "\d tasks"
```

If something went wrong, rollback:

```bash
# Revert last migration
npm run migration:revert
```

---

### Phase 10: Module Metadata

#### Step 18: Update Seeder

Update `apps/api/src/seeders/seeder.service.ts`:

```typescript
private async seedModules() {
  console.log('Seeding modules...');

  const modules = [
    {
      name: 'Simple Text',
      slug: 'simple-text',
      description: 'Basic text management module for accounting notes',
      isActive: true,
    },
    {
      name: 'Tasks',  // Add new module
      slug: 'tasks',
      description: 'Task management module for tracking company work items',
      isActive: true,
    },
    // Add more modules here...
  ];

  for (const moduleData of modules) {
    const existingModule = await this.moduleRepository.findOne({
      where: { slug: moduleData.slug },
    });

    if (!existingModule) {
      const module = this.moduleRepository.create(moduleData);
      await this.moduleRepository.save(module);
      console.log(`✅ Module created: ${moduleData.name}`);
    } else {
      console.log(`⏭️  Module already exists: ${moduleData.name}`);
    }
  }
}
```

Run seeder:

```bash
npm run seed
```

**Key Points**:
- ✅ Module registered in database
- ✅ Can be assigned to companies by admin
- ✅ Slug matches decorator in controller

#### Step 19: Add Swagger Tag and Enhanced Documentation

Update `apps/api/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Accounting API')
  .setDescription('Multi-tenant accounting system with RBAC')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('Health', 'Health check endpoints')
  .addTag('Auth', 'Authentication endpoints')
  .addTag('Admin', 'Admin management endpoints')
  .addTag('Company', 'Company management endpoints')
  .addTag('simple-text', 'Simple Text module endpoints')
  .addTag('tasks', 'Tasks module endpoints')  // Add new tag
  .build();
```

**Comprehensive Swagger Decorators Pattern**:

In your controller methods, use these decorators for complete API documentation:

```typescript
@Get(':id')
@RequirePermission('tasks', 'read')
@ApiOperation({
  summary: 'Get task by ID',  // Short description
  description: 'Retrieve a single task by its ID. Task must belong to user\'s company (or System Admin company for ADMINs).',  // Detailed description
})
@ApiParam({
  name: 'id',
  description: 'Task ID (UUID format)',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
@ApiOkResponse({
  description: 'Task found and returned successfully',
  type: TaskResponseDto,
})
@ApiNotFoundResponse({
  description: 'Task not found',
  schema: {
    example: {
      statusCode: 404,
      message: 'Task with ID xyz not found',
      error: 'Not Found',
    },
  },
})
@ApiForbiddenResponse({
  description: 'Access denied - task belongs to different company',
})
@ApiUnauthorizedResponse({
  description: 'User not authenticated or token invalid',
})
async findOne(@Param('id') id: string, @CurrentUser() user: User) {
  return this.taskService.findOne(id, user);
}

@Post()
@RequirePermission('tasks', 'write')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({
  summary: 'Create new task',
  description: 'Create a new task for the authenticated user\'s company. ADMIN users create tasks in System Admin company.',
})
@ApiBody({
  type: CreateTaskDto,
  description: 'Task data to create',
  examples: {
    basic: {
      summary: 'Basic task',
      value: {
        title: 'Complete financial report',
        priority: 'high',
      },
    },
    detailed: {
      summary: 'Detailed task with all fields',
      value: {
        title: 'Review Q1 invoices',
        description: 'Check all invoices from Q1 2024',
        status: 'todo',
        priority: 'medium',
        dueDate: '2024-03-31',
        assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      },
    },
  },
})
@ApiCreatedResponse({
  description: 'Task created successfully',
  type: TaskResponseDto,
})
@ApiBadRequestResponse({
  description: 'Validation error or assignee not found',
})
@ApiForbiddenResponse({
  description: 'No write permission or assignee from different company',
})
async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: User) {
  return this.taskService.create(createTaskDto, user);
}

@Delete(':id')
@RequirePermission('tasks', 'delete')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({
  summary: 'Delete task',
  description: 'Permanently delete a task. Cannot be undone.',
})
@ApiParam({
  name: 'id',
  description: 'Task ID to delete',
})
@ApiNoContentResponse({
  description: 'Task deleted successfully (no content returned)',
})
@ApiNotFoundResponse({
  description: 'Task not found',
})
@ApiForbiddenResponse({
  description: 'No delete permission or task belongs to different company',
})
async remove(@Param('id') id: string, @CurrentUser() user: User) {
  return this.taskService.remove(id, user);
}
```

**Complete Swagger Decorator Reference**:

**Operation Documentation**:
- `@ApiOperation({ summary, description })` - ALWAYS include both summary AND description
- `@ApiTags('module-name')` - Group endpoints by module

**Request Documentation**:
- `@ApiParam({ name, description, example })` - URL parameters
- `@ApiQuery({ name, description, required })` - Query parameters
- `@ApiBody({ type, description, examples })` - Request body with examples

**Response Documentation**:
- `@ApiOkResponse({ description, type })` - 200 OK responses
- `@ApiCreatedResponse({ description, type })` - 201 Created responses
- `@ApiNoContentResponse({ description })` - 204 No Content responses
- `@ApiNotFoundResponse({ description })` - 404 Not Found responses
- `@ApiBadRequestResponse({ description })` - 400 Bad Request responses
- `@ApiForbiddenResponse({ description })` - 403 Forbidden responses
- `@ApiUnauthorizedResponse({ description })` - 401 Unauthorized responses

**Security**:
- `@ApiBearerAuth('JWT-auth')` - Require JWT authentication

**Key Points**:
- ✅ Every endpoint should have @ApiOperation with summary AND description
- ✅ Document all possible response codes
- ✅ Provide examples in @ApiBody for better developer experience
- ✅ Use schema examples for error responses
- ✅ Swagger documentation grouped by tag
- ✅ Accessible at `http://localhost:3000/api/docs`

**Testing Swagger**:
1. Start API: `npm run dev`
2. Open browser: `http://localhost:3000/api/docs`
3. Use "Authorize" button to add JWT token
4. Test endpoints directly from Swagger UI

---

### Phase 11: RBAC Setup

#### Step 20: Admin Grants Module to Company

```bash
# Get module ID
GET /admin/modules
# Find "tasks" module, copy its ID

# Grant to company
POST /admin/companies/{companyId}/modules/{tasksModuleId}
Authorization: Bearer <admin_token>

# Verify
GET /admin/companies/{companyId}/modules
```

#### Step 21: Company Owner Grants Permissions

```bash
# Owner can now see the module
GET /company/modules
Authorization: Bearer <owner_token>

# Grant full access to employee
POST /company/employees/{employeeId}/modules/tasks
Authorization: Bearer <owner_token>
{
  "permissions": ["read", "write", "delete"]
}

# Grant read-only to another employee
POST /company/employees/{employee2Id}/modules/tasks
Authorization: Bearer <owner_token>
{
  "permissions": ["read"]
}
```

---

### Phase 12: Testing

#### Step 22: Manual Testing Workflow

**Test 1: Company Owner - Full Access**

```bash
# Login as company owner
POST /auth/login
{
  "email": "owner@company.com",
  "password": "password123"
}
# Save access_token

# Create task
POST /modules/tasks
Authorization: Bearer <owner_token>
{
  "title": "Complete financial report",
  "description": "Q1 2024 financial report",
  "priority": "high",
  "dueDate": "2024-03-31",
  "status": "todo"
}
# Returns: 201 Created, task object

# List all tasks
GET /modules/tasks
Authorization: Bearer <owner_token>
# Returns: 200 OK, array of tasks

# Update task
PATCH /modules/tasks/{taskId}
Authorization: Bearer <owner_token>
{
  "status": "in_progress"
}
# Returns: 200 OK, updated task

# Delete task
DELETE /modules/tasks/{taskId}
Authorization: Bearer <owner_token>
# Returns: 204 No Content
```

**Test 2: Employee - Read-Only**

```bash
# Login as employee with read permission
POST /auth/login
{
  "email": "employee@company.com",
  "password": "password123"
}

# Can read
GET /modules/tasks
Authorization: Bearer <employee_token>
# Returns: 200 OK

# Cannot create
POST /modules/tasks
Authorization: Bearer <employee_token>
{
  "title": "Test task"
}
# Returns: 403 Forbidden - No write permission
```

**Test 3: Multi-Tenant Isolation**

```bash
# Company A creates task
POST /modules/tasks
Authorization: Bearer <companyA_owner_token>
{
  "title": "Company A Task"
}
# Returns: taskId_A

# Company B tries to access Company A's task
GET /modules/tasks/{taskId_A}
Authorization: Bearer <companyB_owner_token>
# Returns: 403 Forbidden - Access denied
```

**Test 4: Admin Restriction**

```bash
# Admin tries to access tasks
GET /modules/tasks
Authorization: Bearer <admin_token>
# Returns: 403 Forbidden - Admins cannot access business data
```

#### Step 23: Automated Testing (Optional)

Create `libs/modules/tasks/src/lib/services/task.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { Task, User, UserRole } from '@accounting/common';
import { ForbiddenException } from '@nestjs/common';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;

  const mockTaskRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all tasks for company', async () => {
      const user = {
        id: '1',
        role: UserRole.COMPANY_OWNER,
        companyId: 'company1',
      } as User;

      const tasks = [
        { id: '1', title: 'Task 1', companyId: 'company1' },
        { id: '2', title: 'Task 2', companyId: 'company1' },
      ];

      mockTaskRepository.find.mockResolvedValue(tasks);

      const result = await service.findAll(user);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.find).toHaveBeenCalledWith({
        where: { companyId: 'company1' },
        relations: ['createdBy', 'assignee', 'company'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw ForbiddenException for ADMIN', async () => {
      const adminUser = {
        id: '1',
        role: UserRole.ADMIN,
      } as User;

      await expect(service.findAll(adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // Add more tests...
});
```

Run tests:

```bash
nx test tasks
```

---

### Phase 13: Frontend Implementation

Now that the backend is complete, let's build the frontend to interact with our Task API.

#### Step 24: Frontend Directory Structure

Create the following structure in the `web/src` directory:

```bash
web/src/
├── pages/
│   └── modules/
│       └── tasks/
│           └── task-list.tsx          # Main page component
├── components/
│   └── forms/
│       └── task-form-dialog.tsx       # Create/Edit dialog
├── lib/
│   ├── api/
│   │   ├── endpoints/
│   │   │   └── tasks.ts               # API client methods
│   │   └── query-client.ts            # Query keys
│   ├── hooks/
│   │   └── use-tasks.ts               # React Query hooks
│   └── validation/
│       └── schemas.ts                  # Zod validation schemas
└── types/
    ├── dtos.ts                         # Frontend DTOs
    └── entities.ts                     # Entity types
```

---

#### Step 25: Frontend DTOs

Create file: `web/src/types/dtos.ts`

Add Task DTOs to match backend:

```typescript
// Create Task DTO
export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;  // ISO 8601 date string
  assigneeId?: string;
}

// Update Task DTO
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assigneeId?: string | null;
}

// Task Response DTO
export interface TaskResponseDto {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date | null;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    isSystemCompany: boolean;
  } | null;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignee: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Points**:
- ✅ Match backend DTO structure exactly
- ✅ Include `company` object with `isSystemCompany` for UI logic
- ✅ Use TypeScript types for type safety
- ✅ Date as `Date` type in response, `string` in create/update

---

#### Step 26: Zod Validation Schemas

Create/update file: `web/src/lib/validation/schemas.ts`

```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),

  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),

  status: z.enum(['todo', 'in_progress', 'done', 'cancelled'])
    .optional(),

  priority: z.enum(['low', 'medium', 'high', 'urgent'])
    .optional(),

  dueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),

  assigneeId: z.string()
    .uuid('Invalid user ID')
    .optional(),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string()
    .min(1)
    .max(200)
    .optional(),

  description: z.string()
    .max(5000)
    .optional(),

  status: z.enum(['todo', 'in_progress', 'done', 'cancelled'])
    .optional(),

  priority: z.enum(['low', 'medium', 'high', 'urgent'])
    .optional(),

  dueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),

  assigneeId: z.string()
    .uuid()
    .nullable()
    .optional(),
});

export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
```

**Key Points**:
- ✅ Validation rules match backend DTOs
- ✅ Use `z.infer<>` for TypeScript type generation
- ✅ Client-side validation before API calls
- ✅ Clear error messages for users

---

#### Step 27: API Client

Create file: `web/src/lib/api/endpoints/tasks.ts`

```typescript
import { apiClient } from '../client';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from '@/types/dtos';

export const tasksApi = {
  /**
   * Get all tasks for user's company
   */
  getAll: async (): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.get<TaskResponseDto[]>('/api/modules/tasks');
    return data;
  },

  /**
   * Get single task by ID
   */
  getById: async (id: string): Promise<TaskResponseDto> => {
    const { data } = await apiClient.get<TaskResponseDto>(`/api/modules/tasks/${id}`);
    return data;
  },

  /**
   * Get tasks by status
   */
  getByStatus: async (status: string): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.get<TaskResponseDto[]>(
      `/api/modules/tasks/status/${status}`
    );
    return data;
  },

  /**
   * Get tasks assigned to user
   */
  getAssignedToUser: async (userId: string): Promise<TaskResponseDto[]> => {
    const { data } = await apiClient.get<TaskResponseDto[]>(
      `/api/modules/tasks/assigned/${userId}`
    );
    return data;
  },

  /**
   * Create new task
   */
  create: async (taskData: CreateTaskDto): Promise<TaskResponseDto> => {
    const { data } = await apiClient.post<TaskResponseDto>(
      '/api/modules/tasks',
      taskData
    );
    return data;
  },

  /**
   * Update existing task
   */
  update: async (id: string, taskData: UpdateTaskDto): Promise<TaskResponseDto> => {
    const { data } = await apiClient.patch<TaskResponseDto>(
      `/api/modules/tasks/${id}`,
      taskData
    );
    return data;
  },

  /**
   * Delete task
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/modules/tasks/${id}`);
  },
};
```

**Key Points**:
- ✅ Use centralized `apiClient` (axios instance with auth)
- ✅ Type all requests and responses
- ✅ Match backend endpoints exactly
- ✅ Use `/api/` prefix (configured in proxy)
- ✅ Return typed data from API calls

---

#### Step 28: Query Keys Configuration

Update file: `web/src/lib/api/query-client.ts`

Add task query keys:

```typescript
export const queryKeys = {
  // ... existing keys ...

  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.tasks.lists(), { filters }] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    byStatus: (status: string) => [...queryKeys.tasks.all, 'status', status] as const,
    assignedTo: (userId: string) => [...queryKeys.tasks.all, 'assigned', userId] as const,
  },
};
```

**Key Points**:
- ✅ Hierarchical query key structure
- ✅ Type-safe with `as const`
- ✅ Enables granular cache invalidation
- ✅ Supports filtering and detail views

---

#### Step 29: React Query Hooks

Create file: `web/src/lib/hooks/use-tasks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/endpoints/tasks';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';
import { CreateTaskDto, UpdateTaskDto } from '@/types/dtos';

/**
 * Get all tasks
 */
export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: tasksApi.getAll,
  });
}

/**
 * Get single task by ID
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,  // Only fetch if ID exists
  });
}

/**
 * Get tasks by status
 */
export function useTasksByStatus(status: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byStatus(status),
    queryFn: () => tasksApi.getByStatus(status),
    enabled: !!status,
  });
}

/**
 * Create new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskData: CreateTaskDto) => tasksApi.create(taskData),
    onSuccess: () => {
      // Invalidate and refetch tasks list
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
      tasksApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and specific task
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });

      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });
}
```

**Key Points**:
- ✅ Separate hook for each operation
- ✅ Automatic cache invalidation on mutations
- ✅ Toast notifications for user feedback
- ✅ Error handling with meaningful messages
- ✅ Type-safe with DTOs

---

#### Step 30: Page Component

Create file: `web/src/pages/modules/tasks/task-list.tsx`

```typescript
import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { TaskFormDialog } from '@/components/forms/task-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTasks, useDeleteTask } from '@/lib/hooks/use-tasks';
import { TaskResponseDto } from '@/types/dtos';
import { format } from 'date-fns';

export function TaskListPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponseDto | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useTasks();
  const deleteTask = useDeleteTask();

  const columns: ColumnDef<TaskResponseDto>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={`badge badge-${status}`}>
            {status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.original.dueDate;
        return date ? format(new Date(date), 'PPP') : '—';
      },
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => {
        const assignee = row.original.assignee;
        return assignee ? `${assignee.firstName} ${assignee.lastName}` : '—';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingTask(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeletingTaskId(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (deletingTaskId) {
      await deleteTask.mutateAsync(deletingTaskId);
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Tasks"
        description="Manage your tasks"
        action={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create Task
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={tasks || []}
        isLoading={isLoading}
      />

      {/* Create Dialog */}
      <TaskFormDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Edit Dialog */}
      <TaskFormDialog
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
```

**Key Points**:
- ✅ Use existing UI components (DataTable, Button, etc.)
- ✅ State management for dialogs
- ✅ Column definitions with custom cells
- ✅ Action handlers for CRUD operations
- ✅ Loading states

---

#### Step 31: Form Dialog Component

Create file: `web/src/components/forms/task-form-dialog.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form';
import { useCreateTask, useUpdateTask } from '@/lib/hooks/use-tasks';
import { createTaskSchema, CreateTaskFormData } from '@/lib/validation/schemas';
import { TaskResponseDto } from '@/types/dtos';

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task?: TaskResponseDto | null;
}

export function TaskFormDialog({ open, onClose, task }: TaskFormDialogProps) {
  const isEditing = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      assigneeId: task?.assignee?.id || '',
    },
  });

  const onSubmit = async (data: CreateTaskFormData) => {
    if (isEditing && task) {
      await updateTask.mutateAsync({ id: task.id, data });
    } else {
      await createTask.mutateAsync(data);
    }
    onClose();
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="title"
            label="Title"
            error={form.formState.errors.title}
          >
            <Input {...form.register('title')} />
          </FormField>

          <FormField
            name="description"
            label="Description"
            error={form.formState.errors.description}
          >
            <Textarea {...form.register('description')} />
          </FormField>

          <FormField
            name="status"
            label="Status"
            error={form.formState.errors.status}
          >
            <Select {...form.register('status')}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </FormField>

          <FormField
            name="priority"
            label="Priority"
            error={form.formState.errors.priority}
          >
            <Select {...form.register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </FormField>

          <FormField
            name="dueDate"
            label="Due Date"
            error={form.formState.errors.dueDate}
          >
            <Input type="date" {...form.register('dueDate')} />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Points**:
- ✅ React Hook Form for form state
- ✅ Zod validation with zodResolver
- ✅ Support both create and edit modes
- ✅ Form fields match DTO structure
- ✅ Loading states during submission

---

#### Step 32: Routing Setup

Update file: `web/src/app/routes.tsx`

Add routes for different user roles:

```typescript
// For ADMIN users
<Route path="admin" element={<AdminLayout />}>
  <Route path="modules/tasks" element={<TaskListPage />} />
</Route>

// For COMPANY_OWNER users
<Route path="company" element={<CompanyLayout />}>
  <Route path="modules/tasks" element={<TaskListPage />} />
</Route>

// For EMPLOYEE users (and also accessible to COMPANY_OWNER)
<Route path="modules" element={<ModulesLayout />}>
  <Route path="tasks" element={<TaskListPage />} />
</Route>
```

**Key Points**:
- ✅ Same component used across different routes
- ✅ Different URL patterns for different roles
- ✅ Consistent user experience regardless of role

---

### Phase 13 Summary

**Frontend Architecture**:
```
User Interaction
       ↓
   Page Component (task-list.tsx)
       ↓
   React Query Hooks (use-tasks.ts)
       ↓
   API Client (tasks.ts)
       ↓
   Backend API (/api/modules/tasks)
```

**Key Files Created**:
- ✅ `web/src/types/dtos.ts` - TypeScript types matching backend
- ✅ `web/src/lib/validation/schemas.ts` - Zod validation schemas
- ✅ `web/src/lib/api/endpoints/tasks.ts` - API client methods
- ✅ `web/src/lib/api/query-client.ts` - Query keys (updated)
- ✅ `web/src/lib/hooks/use-tasks.ts` - React Query hooks
- ✅ `web/src/pages/modules/tasks/task-list.tsx` - Page component
- ✅ `web/src/components/forms/task-form-dialog.tsx` - Form dialog
- ✅ `web/src/app/routes.tsx` - Routing (updated)

**Testing Frontend**:
1. Start backend: `npm run dev` (in api project)
2. Start frontend: `npm run dev` (in web project)
3. Login with different roles to test access
4. Test CRUD operations through UI
5. Verify data isolation between companies

---

## Complete Code Examples

### System Admin Company Pattern

Complete implementation pattern for modules that support ADMIN users with System Company isolation.

#### Helper Method

```typescript
/**
 * Get System Admin company
 * Used for ADMIN user data isolation
 */
private async getSystemCompany(): Promise<Company> {
  const systemCompany = await this.companyRepository.findOne({
    where: { isSystemCompany: true },
  });

  if (!systemCompany) {
    throw new Error('System Admin company not found. Please run migrations.');
  }

  return systemCompany;
}
```

#### Find All with ADMIN/Company Logic

```typescript
async findAll(user: User): Promise<YourEntity[]> {
  // ADMIN users can view System Admin company records
  if (user.role === UserRole.ADMIN) {
    const systemCompany = await this.getSystemCompany();
    return this.repository.find({
      where: { companyId: systemCompany.id },
      relations: ['createdBy', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  // Company users see their company's records
  if (!user.companyId) {
    return [];
  }

  return this.repository.find({
    where: { companyId: user.companyId },
    relations: ['createdBy', 'company'],
    order: { createdAt: 'DESC' },
  });
}
```

#### Find One with Multi-Tenant Isolation

```typescript
async findOne(id: string, user: User): Promise<YourEntity> {
  const entity = await this.repository.findOne({
    where: { id },
    relations: ['createdBy', 'company'],
  });

  if (!entity) {
    throw new NotFoundException(`Entity with ID ${id} not found`);
  }

  // Multi-tenant isolation check
  if (user.role === UserRole.ADMIN) {
    const systemCompany = await this.getSystemCompany();
    if (entity.companyId !== systemCompany.id) {
      throw new ForbiddenException('Access denied to this resource');
    }
  } else {
    if (user.companyId !== entity.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }
  }

  return entity;
}
```

#### Create with Company Assignment

```typescript
async create(createDto: CreateDto, user: User): Promise<YourEntity> {
  // Determine target company (System Admin company for ADMINs, user's company for others)
  let targetCompanyId: string;

  if (user.role === UserRole.ADMIN) {
    const systemCompany = await this.getSystemCompany();
    targetCompanyId = systemCompany.id;
  } else {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    targetCompanyId = user.companyId;
  }

  // Create entity with automatic company/user association
  const entity = this.repository.create({
    ...createDto,
    companyId: targetCompanyId,  // Auto-set from authenticated user or System Company
    createdById: user.id,        // Auto-set from authenticated user
  });

  const savedEntity = await this.repository.save(entity);

  // Reload with relations for consistent response structure
  return this.repository.findOne({
    where: { id: savedEntity.id },
    relations: ['createdBy', 'company'],
  }) as Promise<YourEntity>;
}
```

#### Required Changes for System Company Pattern

**1. Entity (`libs/common/src/lib/entities/your-entity.entity.ts`)**:
```typescript
@Column({ nullable: true })  // Make nullable
companyId!: string | null;

@ManyToOne(() => Company, (company) => company.yourEntities, {
  nullable: true,  // Add nullable: true
  onDelete: 'CASCADE',
})
@JoinColumn({ name: 'companyId' })
company!: Company | null;
```

**2. Service Imports**:
```typescript
import { Company } from '@accounting/common';  // Add Company import

constructor(
  @InjectRepository(YourEntity)
  private repository: Repository<YourEntity>,
  @InjectRepository(Company)  // Add Company repository
  private companyRepository: Repository<Company>,
) {}
```

**3. Module (`libs/modules/your-module/src/lib/your-module.module.ts`)**:
```typescript
TypeOrmModule.forFeature([YourEntity, User, Company]),  // Include Company
```

**4. Response DTO**:
```typescript
class CompanyBasicInfoDto {
  id: string;
  name: string;
  isSystemCompany: boolean;  // Important for UI logic
}

export class YourResponseDto {
  companyId: string | null;
  company: CompanyBasicInfoDto | null;
  // ... other fields
}
```

---

### Entity with All Features

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['companyId'])           // Index for filtering by company
@Index(['status'])              // Index for filtering by status
@Index(['assigneeId'])          // Index for filtering by assignee
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  // Multi-tenant
  @Column()
  companyId: string;

  @ManyToOne(() => Company, (company) => company.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // Audit trail
  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Assignment
  @Column({ nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Common Patterns

### Different Field Types

```typescript
// String
@Column()
name: string;

// Text (long content)
@Column({ type: 'text' })
description: string;

// Number/Integer
@Column({ type: 'int' })
count: number;

// Decimal/Float
@Column({ type: 'decimal', precision: 10, scale: 2 })
amount: number;

// Boolean
@Column({ default: false })
isCompleted: boolean;

// Date only
@Column({ type: 'date' })
dueDate: Date;

// DateTime
@Column({ type: 'timestamp' })
completedAt: Date;

// Enum
@Column({ type: 'enum', enum: Status })
status: Status;

// JSON
@Column({ type: 'jsonb' })
metadata: Record<string, any>;

// Array of strings
@Column({ type: 'simple-array' })
tags: string[];

// Nullable
@Column({ nullable: true })
optionalField: string | null;

// With default
@Column({ default: 'default value' })
fieldWithDefault: string;
```

### Relationships

```typescript
// One-to-Many (Company has many Tasks)
@Entity('companies')
export class Company {
  @OneToMany(() => Task, (task) => task.company)
  tasks: Task[];
}

// Many-to-One (Task belongs to Company)
@Entity('tasks')
export class Task {
  @ManyToOne(() => Company, (company) => company.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;
}

// One-to-One
@OneToOne(() => Profile)
@JoinColumn()
profile: Profile;

// Many-to-Many
@ManyToMany(() => Tag)
@JoinTable()
tags: Tag[];
```

### Custom Validators

```typescript
import { registerDecorator, ValidationOptions } from 'class-validator';

// Custom validator: future date
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return value && new Date(value) > new Date();
        },
        defaultMessage() {
          return 'Date must be in the future';
        },
      },
    });
  };
}

// Usage in DTO
export class CreateTaskDto {
  @IsFutureDate()
  @IsDateString()
  dueDate: string;
}
```

---

## Testing Guide

### Unit Testing Service

```typescript
describe('TaskService', () => {
  let service: TaskService;
  let repository: Repository<Task>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TaskService);
    repository = module.get(getRepositoryToken(Task));
  });

  it('should find all tasks', async () => {
    const tasks = [{ id: '1', title: 'Test' }];
    jest.spyOn(repository, 'find').mockResolvedValue(tasks as any);

    const result = await service.findAll(mockUser);
    expect(result).toEqual(tasks);
  });
});
```

### E2E Testing Controller

```typescript
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    token = response.body.access_token;
  });

  it('/modules/tasks (GET)', () => {
    return request(app.getHttpServer())
      .get('/modules/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/modules/tasks (POST)', () => {
    return request(app.getHttpServer())
      .post('/modules/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Task',
        priority: 'high',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('Test Task');
      });
  });
});
```

---

## Troubleshooting

### Common Errors

#### "Entity not found in connection"

**Error**:
```
EntityMetadataNotFoundError: No metadata for "Task" was found
```

**Solution**:
1. Ensure entity is exported from `libs/common/src/index.ts`
2. Ensure entity is added to TypeORM entities array in `app.module.ts`
3. Ensure entity is added to `typeorm.config.ts`

#### "Cannot find module '@accounting/modules/tasks'"

**Error**:
```
Error: Cannot find module '@accounting/modules/tasks'
```

**Solution**:
1. Ensure `tsconfig.base.json` has path mapping:
```json
{
  "paths": {
    "@accounting/modules/tasks": ["libs/modules/tasks/src/index.ts"]
  }
}
```
2. Run `nx reset` to clear cache
3. Restart TypeScript server in your IDE

#### Migration Generation Fails

**Error**:
```
Error: No changes in database schema were found
```

**Solution**:
1. Ensure entity is registered in `typeorm.config.ts`
2. Check database connection
3. Verify entity has `@Entity()` decorator
4. Run `npm run build` before generating migration

#### "Access denied to module: tasks"

**Error**:
```
403 Forbidden - Access denied to module: tasks
```

**Solution**:
1. Verify module is registered in database (check seeder)
2. Admin must grant module to company
3. Company owner must grant permissions to employee
4. Check module slug matches decorator: `@RequireModule('tasks')`

#### "Admins do not have access to business module data"

**Error**:
```
403 Forbidden - Admins do not have access to business module data
```

**Solution**:
This is expected behavior. ADMIN role cannot access business data directly. Use COMPANY_OWNER or EMPLOYEE account for testing business modules.

---

## Best Practices

### Code Organization

✅ **DO**:
- One class per file
- Clear file naming (kebab-case)
- Consistent directory structure
- Export through index.ts

❌ **DON'T**:
- Multiple classes in one file
- Inconsistent naming
- Deep nesting (>3 levels)
- Direct imports (bypass index.ts)

### Security

✅ **DO**:
- Always filter by `companyId`
- Verify ownership before modify/delete
- Use validation decorators
- Block ADMIN from business data
- Use parameterized queries (TypeORM does this)

❌ **DON'T**:
- Trust user input without validation
- Skip ownership checks
- Use string concatenation in queries
- Allow cross-company access

### Performance

✅ **DO**:
- Add indexes on frequently queried columns
- Use pagination for large datasets
- Load relations selectively
- Use `@Index()` decorator

❌ **DON'T**:
- Load all data without pagination
- Load unnecessary relations
- Create N+1 query problems
- Forget indexes on foreign keys

### Error Handling

✅ **DO**:
- Use NestJS exceptions
- Provide clear error messages
- Log errors appropriately
- Return proper HTTP status codes

❌ **DON'T**:
- Use generic `throw new Error()`
- Expose sensitive information in errors
- Swallow errors silently
- Return 200 OK on errors

---

## Advanced Topics

### Soft Deletes

```typescript
@Entity('tasks')
export class Task {
  @Column({ default: true })
  isActive: boolean;

  @DeleteDateColumn()
  deletedAt: Date | null;
}

// In service
async remove(id: string, user: User): Promise<void> {
  const task = await this.findOne(id, user);
  task.isActive = false;
  await this.taskRepository.save(task);
  // Or use softRemove:
  // await this.taskRepository.softRemove(task);
}
```

### Pagination

```typescript
// DTO
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Service
async findAll(
  user: User,
  paginationDto: PaginationDto,
): Promise<{ data: Task[]; total: number; page: number; limit: number }> {
  const { page = 1, limit = 20 } = paginationDto;
  const skip = (page - 1) * limit;

  const [data, total] = await this.taskRepository.findAndCount({
    where: { companyId: user.companyId },
    relations: ['createdBy', 'assignee'],
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });

  return {
    data,
    total,
    page,
    limit,
  };
}
```

### Filtering and Sorting

```typescript
// DTO
export class FilterTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'dueDate', 'priority', 'status'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

// Service
async findAll(user: User, filterDto: FilterTasksDto): Promise<Task[]> {
  const query = this.taskRepository
    .createQueryBuilder('task')
    .leftJoinAndSelect('task.createdBy', 'createdBy')
    .leftJoinAndSelect('task.assignee', 'assignee')
    .where('task.companyId = :companyId', { companyId: user.companyId });

  if (filterDto.status) {
    query.andWhere('task.status = :status', { status: filterDto.status });
  }

  if (filterDto.priority) {
    query.andWhere('task.priority = :priority', {
      priority: filterDto.priority,
    });
  }

  if (filterDto.assigneeId) {
    query.andWhere('task.assigneeId = :assigneeId', {
      assigneeId: filterDto.assigneeId,
    });
  }

  const sortBy = filterDto.sortBy || 'createdAt';
  const sortOrder = filterDto.sortOrder || 'DESC';
  query.orderBy(`task.${sortBy}`, sortOrder);

  return query.getMany();
}
```

### File Uploads

```typescript
// Install dependencies
npm install @nestjs/platform-express multer @types/multer

// Controller
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: User,
) {
  // Process file
  return { filename: file.filename, size: file.size };
}
```

---

## Reference

### TypeORM Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Entity()` | Mark class as entity |
| `@PrimaryGeneratedColumn()` | Primary key |
| `@Column()` | Database column |
| `@CreateDateColumn()` | Auto-set creation time |
| `@UpdateDateColumn()` | Auto-update modification time |
| `@DeleteDateColumn()` | Soft delete timestamp |
| `@ManyToOne()` | Many-to-one relation |
| `@OneToMany()` | One-to-many relation |
| `@OneToOne()` | One-to-one relation |
| `@ManyToMany()` | Many-to-many relation |
| `@JoinColumn()` | Specify FK column |
| `@JoinTable()` | For many-to-many |
| `@Index()` | Create index |
| `@Unique()` | Unique constraint |

### class-validator Decorators

| Decorator | Purpose |
|-----------|---------|
| `@IsString()` | Validate string |
| `@IsNumber()` | Validate number |
| `@IsBoolean()` | Validate boolean |
| `@IsDate()` | Validate date |
| `@IsEnum()` | Validate enum |
| `@IsUUID()` | Validate UUID |
| `@IsEmail()` | Validate email |
| `@IsUrl()` | Validate URL |
| `@IsOptional()` | Field is optional |
| `@MinLength()` | Min string length |
| `@MaxLength()` | Max string length |
| `@Min()` | Min number value |
| `@Max()` | Max number value |
| `@IsDateString()` | ISO date string |
| `@IsArray()` | Validate array |
| `@ArrayMinSize()` | Min array size |
| `@ArrayMaxSize()` | Max array size |

### NestJS HTTP Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Controller()` | Define controller |
| `@Get()` | GET endpoint |
| `@Post()` | POST endpoint |
| `@Patch()` | PATCH endpoint |
| `@Put()` | PUT endpoint |
| `@Delete()` | DELETE endpoint |
| `@Body()` | Request body |
| `@Param()` | URL parameter |
| `@Query()` | Query string |
| `@Headers()` | Request headers |
| `@Req()` | Full request object |
| `@Res()` | Response object |
| `@HttpCode()` | Set status code |
| `@UseGuards()` | Apply guards |
| `@UseInterceptors()` | Apply interceptors |

### Custom Decorators (RBAC)

| Decorator | Purpose |
|-----------|---------|
| `@CurrentUser()` | Get authenticated user |
| `@RequireModule('slug')` | Require module access |
| `@RequirePermission('slug', 'permission')` | Require specific permission |
| `@Roles(...)` | Require user role |
| `@Public()` | Skip authentication |

### Swagger Decorators

| Decorator | Purpose |
|-----------|---------|
| `@ApiTags()` | Group endpoints |
| `@ApiOperation()` | Endpoint description |
| `@ApiResponse()` | Response documentation |
| `@ApiProperty()` | Property documentation |
| `@ApiPropertyOptional()` | Optional property |
| `@ApiBearerAuth()` | Require JWT |
| `@ApiParam()` | URL parameter doc |
| `@ApiQuery()` | Query parameter doc |
| `@ApiBody()` | Request body doc |

---

## Final Checklist

Before considering your module complete, verify all steps:

### Development Checklist

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

### Backend Testing Checklist

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

### Frontend Testing Checklist

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

### Integration Checklist

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

### Documentation Checklist

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

---

## Conclusion

Congratulations! You've successfully created a new business module with:

✅ Multi-tenant data isolation
✅ RBAC integration
✅ Complete CRUD operations
✅ Database migration
✅ Comprehensive validation
✅ Swagger documentation
✅ Security best practices

### Next Steps

1. **Add more features**: Search, filtering, pagination
2. **Optimize performance**: Add indexes, caching
3. **Write tests**: Unit tests, E2E tests
4. **Monitor**: Add logging, metrics
5. **Document**: Update README, API docs

---

## Additional Topics

The following sections cover additional integration points that are essential for a production-ready module.

### Navigation Integration

After creating your module, add it to the sidebar navigation for each user role.

**Step 33: Update Sidebar Navigation**

Update the navigation configuration to include your new module.

**File**: `web/src/components/layouts/sidebar-nav.tsx` (or similar)

```typescript
// Navigation items for different roles
const adminNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/admin/modules/tasks',
    icon: CheckSquare,
  },
];

const companyNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/company/modules/tasks',
    icon: CheckSquare,
  },
];

const employeeNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/modules/tasks',
    icon: CheckSquare,
  },
];
```

**Key Points**:
- ✅ Add navigation item for each user role
- ✅ Use consistent icons from Lucide React
- ✅ Match URLs to route configuration
- ✅ Consider module permissions for conditional rendering

**Conditional Navigation Based on Permissions**:

```typescript
// Only show module if user has access
const { data: modules } = useCompanyModules();

const navItems = useMemo(() => {
  const items = [...baseNavItems];

  // Add Tasks if module is enabled
  if (modules?.some(m => m.module.slug === 'tasks')) {
    items.push({
      title: 'Tasks',
      href: '/modules/tasks',
      icon: CheckSquare,
    });
  }

  return items;
}, [modules]);
```

---

### MSW Mock Handlers

Create mock handlers for development and testing. This enables frontend development without a running backend.

**Step 34: Create MSW Handlers**

Create file: `web/src/lib/api/mocks/tasks-handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

// Mock data
const mockTasks = [
  {
    id: '1',
    title: 'Complete Q1 Report',
    description: 'Prepare financial statements for Q1',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2024-03-31',
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Acme Corp',
      isSystemCompany: false,
    },
    createdBy: {
      id: 'user-1',
      email: 'owner@acme.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    assignee: {
      id: 'user-2',
      email: 'employee@acme.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
];

export const tasksHandlers = [
  // GET /api/modules/tasks - List all tasks
  http.get('/api/modules/tasks', () => {
    return HttpResponse.json(mockTasks);
  }),

  // GET /api/modules/tasks/:id - Get single task
  http.get('/api/modules/tasks/:id', ({ params }) => {
    const task = mockTasks.find(t => t.id === params.id);

    if (!task) {
      return HttpResponse.json(
        { message: 'Task not found', statusCode: 404 },
        { status: 404 }
      );
    }

    return HttpResponse.json(task);
  }),

  // POST /api/modules/tasks - Create task
  http.post('/api/modules/tasks', async ({ request }) => {
    const body = await request.json();

    const newTask = {
      id: `task-${Date.now()}`,
      ...body,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      companyId: 'company-1',
      company: {
        id: 'company-1',
        name: 'Acme Corp',
        isSystemCompany: false,
      },
      createdBy: {
        id: 'user-1',
        email: 'owner@acme.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(newTask, { status: 201 });
  }),

  // PATCH /api/modules/tasks/:id - Update task
  http.patch('/api/modules/tasks/:id', async ({ params, request }) => {
    const body = await request.json();
    const task = mockTasks.find(t => t.id === params.id);

    if (!task) {
      return HttpResponse.json(
        { message: 'Task not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const updatedTask = {
      ...task,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(updatedTask);
  }),

  // DELETE /api/modules/tasks/:id - Delete task
  http.delete('/api/modules/tasks/:id', ({ params }) => {
    const taskIndex = mockTasks.findIndex(t => t.id === params.id);

    if (taskIndex === -1) {
      return HttpResponse.json(
        { message: 'Task not found', statusCode: 404 },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/modules/tasks/status/:status - Filter by status
  http.get('/api/modules/tasks/status/:status', ({ params }) => {
    const filtered = mockTasks.filter(t => t.status === params.status);
    return HttpResponse.json(filtered);
  }),
];
```

**Step 35: Register Handlers**

Update file: `web/src/lib/api/mocks/handlers.ts`

```typescript
import { tasksHandlers } from './tasks-handlers';

export const handlers = [
  // ... existing handlers
  ...tasksHandlers,
];
```

**Key Points**:
- ✅ Mock all endpoints your module uses
- ✅ Return realistic data structures matching backend DTOs
- ✅ Include error scenarios (404, 403, 400)
- ✅ Same mocks work for dev mode, unit tests, and E2E tests

---

### React 19 & TanStack Query v5 Patterns

Use modern React patterns for optimal performance.

**Step 36: Update Hooks for TanStack Query v5**

The hooks shown earlier use TanStack Query v5 patterns. Key differences from v4:

```typescript
// ✅ TanStack Query v5 Patterns

// 1. Use `isPending` instead of `isLoading`
const { data, isPending } = useQuery({ ... });  // v5
// const { data, isLoading } = useQuery({ ... });  // v4 (deprecated)

// 2. Use `queryOptions` for reusable queries
import { queryOptions } from '@tanstack/react-query';

export const tasksQueryOptions = () => queryOptions({
  queryKey: queryKeys.tasks.all,
  queryFn: tasksApi.getAll,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Use in component
const { data } = useQuery(tasksQueryOptions());

// 3. Use Suspense-ready patterns (optional)
import { useSuspenseQuery } from '@tanstack/react-query';

function TaskList() {
  // This will suspend the component until data is ready
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions());

  // No need to check isPending - data is guaranteed
  return <DataTable data={tasks} />;
}

// Wrap with Suspense boundary
<Suspense fallback={<LoadingSpinner />}>
  <TaskList />
</Suspense>
```

**React 19 Patterns** (from FRONTEND_GUIDE.md):

```typescript
// React 19 auto-memoization - no need for manual optimization
// Before (React 18) - Manual optimization required
const MemoizedTask = React.memo(({ task }) => {
  const formatted = useMemo(() => formatTask(task), [task]);
  return <div>{formatted.title}</div>;
});

// After (React 19) - Compiler auto-optimizes
function Task({ task }) {
  const formatted = formatTask(task); // Auto-memoized
  return <div>{formatted.title}</div>;
}
```

---

### Permission-Based UI Rendering

Control UI elements based on user permissions.

**Step 37: Implement Permission Checks**

```typescript
// Hook to check module permissions
export function useTaskPermissions() {
  const { user } = useAuthContext();
  const { data: permissions } = useEmployeeModules(user?.id);

  const taskPermissions = permissions?.find(
    p => p.module.slug === 'tasks'
  )?.permissions || [];

  // Company owners have full access
  if (user?.role === 'COMPANY_OWNER') {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
    };
  }

  return {
    canRead: taskPermissions.includes('read'),
    canWrite: taskPermissions.includes('write'),
    canDelete: taskPermissions.includes('delete'),
  };
}

// Usage in component
function TaskListPage() {
  const { canRead, canWrite, canDelete } = useTaskPermissions();
  const { data: tasks, isPending } = useTasks();

  if (!canRead) {
    return <UnauthorizedMessage />;
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        action={
          canWrite && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Task
            </Button>
          )
        }
      />

      <DataTable
        columns={getColumns({ canWrite, canDelete })}
        data={tasks}
      />
    </div>
  );
}

// Dynamic columns based on permissions
function getColumns({ canWrite, canDelete }) {
  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'priority', header: 'Priority' },
  ];

  // Only add actions column if user has edit/delete permissions
  if (canWrite || canDelete) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          )}
        </div>
      ),
    });
  }

  return columns;
}
```

---

### Accessibility Best Practices

Ensure your module UI is accessible (WCAG 2.1 AA compliant).

**Step 38: Accessibility Implementation**

From DESIGN_SYSTEM.md, apply these accessibility patterns:

```typescript
// 1. Icon buttons must have aria-labels
<Button
  variant="ghost"
  size="sm"
  aria-label="Edit task"
  onClick={() => setEditingTask(task)}
>
  <Edit className="h-4 w-4" />
</Button>

<Button
  variant="ghost"
  size="sm"
  aria-label="Delete task"
  onClick={() => setDeletingTaskId(task.id)}
>
  <Trash2 className="h-4 w-4" />
</Button>

// 2. Form labels must be associated with inputs
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="task-title">Title</FormLabel>
      <FormControl>
        <Input
          id="task-title"
          aria-describedby="task-title-error"
          {...field}
        />
      </FormControl>
      <FormMessage id="task-title-error" />
    </FormItem>
  )}
/>

// 3. Status badges with proper contrast
<Badge
  variant={statusVariants[task.status]}
  className="font-medium"
>
  {task.status.replace('_', ' ')}
</Badge>

// 4. Focus visible for keyboard navigation
<Button
  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  Submit
</Button>

// 5. Loading states announced to screen readers
{isPending && (
  <div role="status" aria-live="polite">
    <LoadingSpinner />
    <span className="sr-only">Loading tasks...</span>
  </div>
)}

// 6. Empty state announcements
{tasks.length === 0 && (
  <div role="status" aria-live="polite" className="text-center py-8">
    <p className="text-muted-foreground">No tasks found</p>
    <Button onClick={() => setIsCreateDialogOpen(true)}>
      Create your first task
    </Button>
  </div>
)}
```

**Accessibility Checklist for Modules**:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order follows logical reading order
- [ ] Color contrast meets 4.5:1 ratio (AA standard)
- [ ] Icon-only buttons have `aria-label`
- [ ] Form fields have associated labels
- [ ] Error messages are linked via `aria-describedby`
- [ ] Loading/status changes announced via `aria-live`
- [ ] Tables have proper headers (`<th>` with `scope`)

---

### Environment Configuration

For module-specific configuration, use environment variables.

**Step 39: Module Configuration (Optional)**

If your module needs specific configuration:

**Backend** (`apps/api/.env`):

```env
# Task Module Configuration
TASKS_DEFAULT_DUE_DAYS=7
TASKS_MAX_ATTACHMENTS=10
TASKS_ENABLE_NOTIFICATIONS=true
```

**Service Implementation**:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TaskService {
  private readonly defaultDueDays: number;

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private configService: ConfigService,
  ) {
    this.defaultDueDays = this.configService.get<number>(
      'TASKS_DEFAULT_DUE_DAYS',
      7
    );
  }

  async create(createDto: CreateTaskDto, user: User): Promise<Task> {
    // Use default due date if not provided
    const dueDate = createDto.dueDate
      ? new Date(createDto.dueDate)
      : addDays(new Date(), this.defaultDueDays);

    // ... rest of creation logic
  }
}
```

**Frontend** (`web/.env`):

```env
# Module feature flags
VITE_ENABLE_TASK_NOTIFICATIONS=true
VITE_TASK_POLL_INTERVAL=30000
```

**Frontend Usage**:

```typescript
// Access via import.meta.env
const enableNotifications = import.meta.env.VITE_ENABLE_TASK_NOTIFICATIONS === 'true';
const pollInterval = Number(import.meta.env.VITE_TASK_POLL_INTERVAL) || 30000;

// In React Query
const { data } = useQuery({
  queryKey: queryKeys.tasks.all,
  queryFn: tasksApi.getAll,
  refetchInterval: pollInterval,
});
```

---

### Error Handling Patterns

Implement comprehensive error handling across the module.

**Step 40: Error Handling**

**API Client Error Handling**:

```typescript
// lib/api/error-handler.ts
import { AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';

interface ApiError {
  message: string | string[];
  statusCode: number;
  error?: string;
}

export function handleApiError(error: AxiosError<ApiError>) {
  const apiError = error.response?.data;

  // Format error message
  const message = Array.isArray(apiError?.message)
    ? apiError.message.join(', ')
    : apiError?.message || 'An unexpected error occurred';

  // Show toast notification
  toast({
    title: getErrorTitle(error.response?.status),
    description: message,
    variant: 'destructive',
  });

  // Log for debugging
  console.error('[API Error]', {
    status: error.response?.status,
    message,
    url: error.config?.url,
  });
}

function getErrorTitle(status?: number): string {
  switch (status) {
    case 400: return 'Validation Error';
    case 401: return 'Authentication Required';
    case 403: return 'Access Denied';
    case 404: return 'Not Found';
    case 500: return 'Server Error';
    default: return 'Error';
  }
}
```

**Usage in Mutations**:

```typescript
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskDto) => tasksApi.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: handleApiError,
  });
}
```

**Backend Error Response Consistency**:

```typescript
// Ensure consistent error responses
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Related Documentation

This guide is part of a comprehensive documentation suite:

- **ARCHITECTURE.md** - System architecture and design
- **API_ENDPOINTS.md** - Complete API endpoint reference
- **MODULE_DEVELOPMENT.md** (this document) - Step-by-step module creation guide
- **IMPLEMENTATION_PATTERNS.md** - Code patterns and best practices

### Quick Navigation

**Creating a New Module**:
1. 📖 **Understand system** → ARCHITECTURE.md
2. 🔧 **Follow this tutorial** → MODULE_DEVELOPMENT.md (this document)
3. 💻 **Copy code patterns** → IMPLEMENTATION_PATTERNS.md
4. 🧪 **Test with API** → API_ENDPOINTS.md

**Getting Help**:
- Need architecture overview? → ARCHITECTURE.md
- Need code examples? → IMPLEMENTATION_PATTERNS.md
- Need API details? → API_ENDPOINTS.md
- Stuck on a step? → Reference `simple-text` module in `libs/modules/simple-text/`

### Support

- **Documentation**: See related docs above
- **Examples**: Reference `simple-text` module for working code
- **Issues**: Create issues in project repository
- **Questions**: Contact development team

**Happy Coding!** 🚀
