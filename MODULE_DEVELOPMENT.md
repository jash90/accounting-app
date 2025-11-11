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

```bash
# 1. Generate library
nx generate @nx/node:library tasks --directory=libs/modules/tasks

# 2. Create entity in libs/common/src/lib/entities/task.entity.ts
# 3. Create DTOs in libs/modules/tasks/src/lib/dto/
# 4. Create service in libs/modules/tasks/src/lib/services/
# 5. Create controller in libs/modules/tasks/src/lib/controllers/
# 6. Create module in libs/modules/tasks/src/lib/tasks.module.ts
# 7. Register in AppModule
# 8. Generate migration
npm run migration:generate -- apps/api/src/migrations/AddTaskEntity

# 9. Run migration
npm run migration:run

# 10. Update seeder
# 11. Test with different user roles
```

**Key Files to Create/Modify**:
- ✅ Entity: `libs/common/src/lib/entities/task.entity.ts`
- ✅ DTOs: `libs/modules/tasks/src/lib/dto/*.dto.ts`
- ✅ Service: `libs/modules/tasks/src/lib/services/task.service.ts`
- ✅ Controller: `libs/modules/tasks/src/lib/controllers/task.controller.ts`
- ✅ Module: `libs/modules/tasks/src/lib/tasks.module.ts`
- ✅ Update: `apps/api/src/app/app.module.ts`
- ✅ Update: `apps/api/typeorm.config.ts`
- ✅ Update: `libs/common/src/lib/entities/company.entity.ts`
- ✅ Update: `apps/api/src/seeders/seeder.service.ts`
- ✅ Update: `apps/api/src/main.ts`

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
  id: string;

  // Business fields
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

  // Multi-tenant: Company relationship (REQUIRED)
  @Column()
  companyId: string;

  @ManyToOne(() => Company, (company) => company.tasks, {
    onDelete: 'CASCADE',  // When company deleted, all tasks deleted
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // Audit trail: Creator (REQUIRED)
  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Task assignment (OPTIONAL)
  @Column({ nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  // Timestamps (AUTO-GENERATED)
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Key Points**:
- ✅ UUID primary key for security
- ✅ `companyId` for multi-tenant isolation
- ✅ `createdById` for audit trail
- ✅ Enums for type safety (status, priority)
- ✅ CASCADE delete when company is deleted
- ✅ Nullable fields where appropriate
- ✅ Automatic timestamps

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

// Simplified user info in response
class UserInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
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

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate: Date | null;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'User who created the task' })
  createdBy: UserInfo;

  @ApiPropertyOptional({ description: 'User assigned to the task' })
  assignee: UserInfo | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
```

**Key Points**:
- ✅ Complete API response structure
- ✅ Nested user info (creator, assignee)
- ✅ Swagger documentation for all fields

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
import { Task, User, UserRole } from '@accounting/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Find all tasks for user's company
   * - ADMIN cannot access business data
   * - Filtered by companyId
   * - Ordered by createdAt descending
   */
  async findAll(user: User): Promise<Task[]> {
    // Block ADMIN from accessing business data
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

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
   * - Verifies task belongs to user's company
   * - Returns 404 if not found
   * - Returns 403 if different company
   */
  async findOne(id: string, user: User): Promise<Task> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignee', 'company'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Multi-tenant isolation check
    if (user.companyId !== task.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return task;
  }

  /**
   * Create new task
   * - Auto-assigns companyId from user
   * - Auto-assigns createdById from user
   * - Validates assignee belongs to same company
   */
  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    // If assigneeId provided, validate they exist and belong to same company
    if (createTaskDto.assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: createTaskDto.assigneeId },
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

    // Create task with automatic company/user association
    const task = this.taskRepository.create({
      ...createTaskDto,
      companyId: user.companyId,  // Auto-set from authenticated user
      createdById: user.id,       // Auto-set from authenticated user
      // dueDate is automatically converted from string to Date by TypeORM
    });

    const savedTask = await this.taskRepository.save(task);

    // Return with relations
    return this.findOne(savedTask.id, user);
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
- ✅ Repository injection with `@InjectRepository()`
- ✅ Multi-tenant filtering by `companyId`
- ✅ ADMIN restriction on business data
- ✅ Ownership verification before modify/delete
- ✅ Automatic company/user association
- ✅ Assignee validation (same company)
- ✅ Proper error handling with NestJS exceptions
- ✅ Relations loaded for complete data
- ✅ Additional helper methods (findByStatus, findAssignedToUser)

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
import { Task, User } from '@accounting/common';
import { RBACModule } from '@accounting/rbac';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    // Register entities for this module
    TypeOrmModule.forFeature([Task, User]),

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
- ✅ Import `RBACModule` for authorization
- ✅ Register controller and service
- ✅ Export service if other modules need it

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

#### Step 19: Add Swagger Tag

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

**Key Points**:
- ✅ Swagger documentation grouped by tag
- ✅ Accessible at `http://localhost:3000/api/docs`

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

## Complete Code Examples

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

### Testing Checklist

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
  - [ ] Cannot access business data
  - [ ] Can manage module metadata
  - [ ] Can grant module to companies

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
