# Implementation Patterns - Code Examples and Best Practices

## Table of Contents

1. [Introduction](#introduction)
2. [Multi-Tenant Patterns](#multi-tenant-patterns)
3. [Entity Patterns](#entity-patterns)
4. [DTO Patterns](#dto-patterns)
5. [Service Layer Patterns](#service-layer-patterns)
6. [Controller Patterns](#controller-patterns)
7. [Guard Patterns](#guard-patterns)
8. [Authorization Patterns](#authorization-patterns)
9. [Database Query Patterns](#database-query-patterns)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Validation Patterns](#validation-patterns)
12. [Testing Patterns](#testing-patterns)
13. [Migration Patterns](#migration-patterns)

---

## Introduction

This document provides practical code examples and implementation patterns used throughout the accounting system. All patterns follow multi-tenant architecture principles and RBAC security model.

### How to Use This Document

- **Copy-Paste Ready**: All code examples can be copied directly
- **Pattern Name**: Each pattern has a descriptive name
- **Use Case**: When to use this pattern
- **Code Example**: Complete, working implementation
- **Explanation**: Key points and considerations

### Conventions

- TypeScript strict mode
- NestJS v11 patterns
- TypeORM entities
- class-validator decorators
- Swagger/OpenAPI documentation

---

## Multi-Tenant Patterns

### Pattern 1: Service-Level Filtering

**Use Case**: Finding all records for a company

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, User, UserRole } from '@accounting/common';

@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(Entity)
    private entityRepository: Repository<Entity>,
  ) {}

  async findAll(user: User): Promise<Entity[]> {
    // Block ADMIN from accessing business data
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admins do not have access to business module data',
      );
    }

    // Return empty array if user has no company
    if (!user.companyId) {
      return [];
    }

    // Filter by companyId - CRITICAL for multi-tenant isolation
    return this.entityRepository.find({
      where: { companyId: user.companyId },
      relations: ['createdBy', 'company'],
      order: { createdAt: 'DESC' },
    });
  }
}
```

**Key Points**:
- ✅ Always check `user.role === UserRole.ADMIN`
- ✅ Always filter by `companyId`
- ✅ Return empty array instead of throwing error for no company
- ✅ Load relations for complete data

---

### Pattern 2: Ownership Verification

**Use Case**: Ensuring user can only access their company's data

```typescript
async findOne(id: string, user: User): Promise<Entity> {
  // Block ADMIN
  if (user.role === UserRole.ADMIN) {
    throw new ForbiddenException(
      'Admins do not have access to business module data',
    );
  }

  // Find entity by ID
  const entity = await this.entityRepository.findOne({
    where: { id },
    relations: ['createdBy', 'company'],
  });

  // Check entity exists
  if (!entity) {
    throw new NotFoundException(`Entity with ID ${id} not found`);
  }

  // CRITICAL: Verify company ownership
  if (user.companyId !== entity.companyId) {
    throw new ForbiddenException('Access denied to this resource');
  }

  return entity;
}
```

**Key Points**:
- ✅ Check existence first (404)
- ✅ Check ownership second (403)
- ✅ Never reveal existence of other company's data
- ✅ Consistent error messages

---

### Pattern 3: Auto-Assignment on Create

**Use Case**: Automatically assigning company and creator

```typescript
async create(createDto: CreateDto, user: User): Promise<Entity> {
  // Block ADMIN
  if (user.role === UserRole.ADMIN) {
    throw new ForbiddenException(
      'Admins do not have access to business module data',
    );
  }

  // Verify user has company
  if (!user.companyId) {
    throw new ForbiddenException('User is not associated with a company');
  }

  // Create entity with auto-assignment
  const entity = this.entityRepository.create({
    ...createDto,
    companyId: user.companyId,  // Auto-assign from user
    createdById: user.id,       // Auto-assign from user
  });

  const savedEntity = await this.entityRepository.save(entity);

  // Return with relations
  return this.findOne(savedEntity.id, user);
}
```

**Key Points**:
- ✅ Never trust `companyId` from request body
- ✅ Always use `user.companyId` from JWT token
- ✅ Always set `createdById` for audit trail
- ✅ Return with relations for complete response

---

### Pattern 4: Update with Ownership Check

**Use Case**: Updating entity with security

```typescript
async update(
  id: string,
  updateDto: UpdateDto,
  user: User,
): Promise<Entity> {
  // Verify ownership (includes ADMIN check and company verification)
  const entity = await this.findOne(id, user);

  // Apply updates (partial update pattern)
  Object.assign(entity, updateDto);

  // Save and return with relations
  const savedEntity = await this.entityRepository.save(entity);
  return this.findOne(savedEntity.id, user);
}
```

**Key Points**:
- ✅ Reuse `findOne()` for ownership verification
- ✅ Use `Object.assign()` for partial updates
- ✅ Return fresh entity with relations

---

### Pattern 5: Delete with Ownership Check

**Use Case**: Deleting entity securely

```typescript
async remove(id: string, user: User): Promise<void> {
  // Verify ownership
  const entity = await this.findOne(id, user);

  // Hard delete
  await this.entityRepository.remove(entity);

  // For soft delete, use:
  // entity.isActive = false;
  // await this.entityRepository.save(entity);
}
```

**Key Points**:
- ✅ Reuse `findOne()` for ownership verification
- ✅ Choose hard delete or soft delete based on requirements
- ✅ Return void for 204 No Content

---

## Entity Patterns

### Pattern 6: Basic Entity with Multi-Tenant

**Use Case**: Standard business entity structure

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

@Entity('my_entities')  // Table name (snake_case)
@Index(['companyId'])   // Index for company filtering
export class MyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Business fields
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // REQUIRED: Multi-tenant field
  @Column()
  companyId: string;

  @ManyToOne(() => Company, (company) => company.myEntities, {
    onDelete: 'CASCADE',  // Delete when company deleted
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // REQUIRED: Audit trail
  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // REQUIRED: Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Key Points**:
- ✅ UUID primary key for security
- ✅ `companyId` + index for multi-tenant
- ✅ CASCADE delete on company
- ✅ `createdById` for audit
- ✅ Automatic timestamps

---

### Pattern 7: Entity with Enum

**Use Case**: Using enums for status/type fields

```typescript
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
@Index(['companyId'])
@Index(['status'])      // Index for filtering by status
@Index(['priority'])    // Index for filtering by priority
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  // Enum columns
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

  // Rest of entity...
}
```

**Key Points**:
- ✅ Export enums for use in DTOs
- ✅ Use enum type in column
- ✅ Set sensible defaults
- ✅ Index enums used for filtering

---

### Pattern 8: Entity with Optional Relationship

**Use Case**: Optional foreign key (nullable)

```typescript
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Required fields...

  // OPTIONAL: Assignee (can be null)
  @Column({ nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  // Rest of entity...
}
```

**Key Points**:
- ✅ Use `nullable: true` in column
- ✅ Type as `| null` in TypeScript
- ✅ Use `{ nullable: true }` in ManyToOne

---

### Pattern 9: Entity with JSON Column

**Use Case**: Storing flexible metadata

```typescript
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // JSON/JSONB column for flexible data
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Or with typed interface
  @Column({ type: 'jsonb', default: {} })
  settings: TaskSettings;
}

interface TaskSettings {
  notifications?: boolean;
  color?: string;
  tags?: string[];
  [key: string]: any;
}
```

**Key Points**:
- ✅ Use `jsonb` for PostgreSQL (better performance)
- ✅ Provide default value
- ✅ Type as `Record<string, any>` or interface

---

## DTO Patterns

### Pattern 10: Create DTO with Validation

**Use Case**: Validating create requests

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
  // Required field
  @ApiProperty({
    description: 'Task title',
    example: 'Complete financial report',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  // Optional string field
  @ApiPropertyOptional({
    description: 'Detailed description',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  // Optional enum field with default
  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  // Optional date field
  @ApiPropertyOptional({
    description: 'Due date (ISO 8601)',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Optional UUID field
  @ApiPropertyOptional({
    description: 'User ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
```

**Key Points**:
- ✅ Use `@ApiProperty()` for required fields
- ✅ Use `@ApiPropertyOptional()` for optional fields
- ✅ Provide examples for better docs
- ✅ Use appropriate validators
- ✅ Set length limits

---

### Pattern 11: Update DTO (Partial)

**Use Case**: Partial update with all fields optional

```typescript
import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  // Allow null to clear field
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}
```

**Key Points**:
- ✅ All fields optional with `?`
- ✅ All fields with `@IsOptional()`
- ✅ Allow `| null` for clearable fields
- ✅ Same validation rules as CreateDto

---

### Pattern 12: Filter DTO

**Use Case**: Filtering and searching

```typescript
import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@accounting/common';

export class FilterTasksDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Search in title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'dueDate', 'priority', 'status'],
  })
  @IsOptional()
  @IsEnum(['createdAt', 'dueDate', 'priority', 'status'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
```

**Key Points**:
- ✅ All filter fields optional
- ✅ Enums for controlled values
- ✅ Sort parameters for ordering

---

### Pattern 13: Pagination DTO

**Use Case**: Paginated list requests

```typescript
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)  // Transform string to number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**Key Points**:
- ✅ Use `@Type(() => Number)` for query params
- ✅ Set reasonable max limit
- ✅ Provide defaults

---

### Pattern 14: Response DTO

**Use Case**: Standardizing API responses

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@accounting/common';

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
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional()
  dueDate: Date | null;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ type: UserInfo })
  createdBy: UserInfo;

  @ApiPropertyOptional({ type: UserInfo })
  assignee: UserInfo | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

**Key Points**:
- ✅ Nested objects for relations
- ✅ Complete type information
- ✅ Used in controller @ApiResponse()

---

## Service Layer Patterns

### Pattern 15: Complete CRUD Service

**Use Case**: Full service implementation

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
import { CreateTaskDto, UpdateTaskDto } from '../dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Find all with filtering
  async findAll(user: User, filterDto?: FilterTasksDto): Promise<Task[]> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access business data');
    }

    if (!user.companyId) {
      return [];
    }

    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.companyId = :companyId', { companyId: user.companyId });

    // Apply filters
    if (filterDto?.status) {
      query.andWhere('task.status = :status', { status: filterDto.status });
    }

    if (filterDto?.priority) {
      query.andWhere('task.priority = :priority', { priority: filterDto.priority });
    }

    if (filterDto?.assigneeId) {
      query.andWhere('task.assigneeId = :assigneeId', { assigneeId: filterDto.assigneeId });
    }

    if (filterDto?.search) {
      query.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    // Apply sorting
    const sortBy = filterDto?.sortBy || 'createdAt';
    const sortOrder = filterDto?.sortOrder || 'DESC';
    query.orderBy(`task.${sortBy}`, sortOrder);

    return query.getMany();
  }

  // Find one with ownership check
  async findOne(id: string, user: User): Promise<Task> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access business data');
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignee', 'company'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (user.companyId !== task.companyId) {
      throw new ForbiddenException('Access denied');
    }

    return task;
  }

  // Create with validation
  async create(createDto: CreateTaskDto, user: User): Promise<Task> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access business data');
    }

    if (!user.companyId) {
      throw new ForbiddenException('User not associated with company');
    }

    // Validate assignee if provided
    if (createDto.assigneeId) {
      await this.validateAssignee(createDto.assigneeId, user.companyId);
    }

    const task = this.taskRepository.create({
      ...createDto,
      companyId: user.companyId,
      createdById: user.id,
    });

    const savedTask = await this.taskRepository.save(task);
    return this.findOne(savedTask.id, user);
  }

  // Update with ownership check
  async update(id: string, updateDto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    // Validate assignee if being changed
    if (updateDto.assigneeId !== undefined && updateDto.assigneeId !== null) {
      await this.validateAssignee(updateDto.assigneeId, user.companyId);
    }

    Object.assign(task, updateDto);
    const savedTask = await this.taskRepository.save(task);
    return this.findOne(savedTask.id, user);
  }

  // Delete with ownership check
  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);
    await this.taskRepository.remove(task);
  }

  // Helper method for validation
  private async validateAssignee(assigneeId: string, companyId: string): Promise<void> {
    const assignee = await this.userRepository.findOne({
      where: { id: assigneeId },
    });

    if (!assignee) {
      throw new BadRequestException('Assignee user not found');
    }

    if (assignee.companyId !== companyId) {
      throw new ForbiddenException('Cannot assign to user from different company');
    }
  }
}
```

**Key Points**:
- ✅ Consistent error handling
- ✅ Reuse findOne for ownership checks
- ✅ Helper methods for validation
- ✅ Query builder for complex queries

---

## Controller Patterns

### Pattern 16: Complete CRUD Controller

**Use Case**: Full REST API controller

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
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  FilterTasksDto,
} from '../dto';

@ApiTags('tasks')
@ApiBearerAuth('JWT-auth')
@Controller('modules/tasks')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get all tasks for company' })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  @ApiResponse({ status: 403, description: 'No access or permission' })
  async findAll(
    @CurrentUser() user: User,
    @Query() filterDto: FilterTasksDto,
  ): Promise<Task[]> {
    return this.taskService.findAll(user, filterDto);
  }

  @Get(':id')
  @RequirePermission('tasks', 'read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.findOne(id, user);
  }

  @Post()
  @RequirePermission('tasks', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'No write permission' })
  async create(
    @Body() createDto: CreateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.create(createDto, user);
  }

  @Patch(':id')
  @RequirePermission('tasks', 'write')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.taskService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequirePermission('tasks', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
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
- ✅ Guards at class level
- ✅ Permissions at method level
- ✅ Complete Swagger documentation
- ✅ HTTP status codes
- ✅ DTOs for validation

---

## Guard Patterns

### Pattern 17: Custom Guard

**Use Case**: Creating custom authorization guard

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get metadata from decorator
    const requiredValue = this.reflector.get<string>(
      'customMetadata',
      context.getHandler(),
    );

    if (!requiredValue) {
      return true; // No metadata, allow access
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Implement custom logic
    const hasAccess = await this.checkCustomLogic(user, requiredValue);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }

  private async checkCustomLogic(user: any, value: string): Promise<boolean> {
    // Your custom logic here
    return true;
  }
}
```

**Key Points**:
- ✅ Implement `CanActivate`
- ✅ Use Reflector for metadata
- ✅ Throw ForbiddenException on failure
- ✅ Return true on success

---

## Error Handling Patterns

### Pattern 18: Consistent Error Handling

**Use Case**: Standard error responses

```typescript
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

// Not Found (404)
throw new NotFoundException(`Entity with ID ${id} not found`);

// Forbidden (403) - Access Denied
throw new ForbiddenException('Access denied to this resource');

// Forbidden (403) - No Permission
throw new ForbiddenException('Insufficient permissions for this operation');

// Forbidden (403) - ADMIN Restriction
throw new ForbiddenException('Admins do not have access to business module data');

// Bad Request (400) - Validation
throw new BadRequestException('Invalid input data');

// Bad Request (400) - Business Rule
throw new BadRequestException('Cannot assign task to user from different company');

// Conflict (409) - Unique Constraint
throw new ConflictException('User with this email already exists');

// Unauthorized (401) - Invalid Credentials
throw new UnauthorizedException('Invalid credentials');
```

**Key Points**:
- ✅ Use appropriate exception type
- ✅ Provide clear error messages
- ✅ Don't expose sensitive information
- ✅ Be consistent across codebase

---

## Testing Patterns

### Pattern 19: Unit Test Setup

**Use Case**: Testing service methods

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { Task, User, UserRole } from '@accounting/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
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

  describe('findAll', () => {
    it('should return tasks for company', async () => {
      const user = {
        id: 'user1',
        role: UserRole.COMPANY_OWNER,
        companyId: 'company1',
      } as User;

      const tasks = [
        { id: 'task1', title: 'Task 1', companyId: 'company1' },
        { id: 'task2', title: 'Task 2', companyId: 'company1' },
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks as any);

      const result = await service.findAll(user);

      expect(result).toEqual(tasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { companyId: 'company1' },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw ForbiddenException for ADMIN', async () => {
      const adminUser = {
        id: 'admin1',
        role: UserRole.ADMIN,
      } as User;

      await expect(service.findAll(adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should return task if owned by user', async () => {
      const user = {
        id: 'user1',
        role: UserRole.EMPLOYEE,
        companyId: 'company1',
      } as User;

      const task = {
        id: 'task1',
        title: 'Task 1',
        companyId: 'company1',
      };

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(task as any);

      const result = await service.findOne('task1', user);

      expect(result).toEqual(task);
    });

    it('should throw NotFoundException if task not found', async () => {
      const user = {
        id: 'user1',
        role: UserRole.EMPLOYEE,
        companyId: 'company1',
      } as User;

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('task1', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for different company', async () => {
      const user = {
        id: 'user1',
        role: UserRole.EMPLOYEE,
        companyId: 'company1',
      } as User;

      const task = {
        id: 'task1',
        title: 'Task 1',
        companyId: 'company2', // Different company
      };

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(task as any);

      await expect(service.findOne('task1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
```

**Key Points**:
- ✅ Mock repositories
- ✅ Test happy paths
- ✅ Test error cases
- ✅ Test multi-tenant isolation

---

## Migration Patterns

### Pattern 20: Entity Migration

**Use Case**: Creating migration for new entity

```bash
# Generate migration
npm run migration:generate -- apps/api/src/migrations/AddTaskEntity
```

Generated migration:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskEntity1234567890123 implements MigrationInterface {
  name = 'AddTaskEntity1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
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

    // Create table
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

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_companyId"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_createdById"
      FOREIGN KEY ("createdById")
      REFERENCES "users"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_assigneeId"
      FOREIGN KEY ("assigneeId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Create indexes
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
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_assigneeId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_companyId"`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assigneeId"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_createdById"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_companyId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "tasks"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
```

**Key Points**:
- ✅ Create enums first
- ✅ Create table with all columns
- ✅ Add foreign key constraints
- ✅ Create indexes for performance
- ✅ Implement down migration

---

## Conclusion

This implementation patterns guide provides copy-paste ready code examples for all common scenarios in the accounting system. Use these patterns to ensure consistency, security, and maintainability across the codebase.

### Quick Reference

- **Multi-Tenant**: Always filter by `companyId`, block ADMIN from business data
- **Security**: Verify ownership before modify/delete operations
- **Validation**: Use class-validator decorators on DTOs
- **Authorization**: Use guards and permission decorators
- **Errors**: Use appropriate NestJS exceptions with clear messages
- **Testing**: Mock repositories, test happy and error paths
- **Migrations**: Always implement up and down migrations

### Additional Resources

- **ARCHITECTURE.md** - System architecture and design
- **API_ENDPOINTS.md** - Complete endpoint documentation with examples
- **MODULE_DEVELOPMENT.md** - Step-by-step guide for creating new modules
- **IMPLEMENTATION_PATTERNS.md** (this document) - Code patterns and best practices

### Quick Navigation

**Development Workflow**:
1. 📖 **Understand architecture** → ARCHITECTURE.md
2. 🔧 **Create new module** → MODULE_DEVELOPMENT.md
3. 💻 **Use code patterns** → IMPLEMENTATION_PATTERNS.md (this document)
4. 📊 **Test with API** → API_ENDPOINTS.md

**Problem Solving**:
- Need code example? → IMPLEMENTATION_PATTERNS.md (this document)
- Need to understand flow? → ARCHITECTURE.md
- Need API details? → API_ENDPOINTS.md
- Need to add feature? → MODULE_DEVELOPMENT.md

---

**Version**: 1.0
**Last Updated**: January 2024
**Maintainers**: Development Team
