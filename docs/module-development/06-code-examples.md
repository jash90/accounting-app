# Complete Code Examples

> [← Back to Index](./README.md) | [← Previous: Step-by-Step Tutorial](./05-step-by-step-tutorial.md)

This section provides complete, production-ready code examples that you can use as templates for your module implementations.

---

## System Admin Company Pattern

Complete implementation pattern for modules that support ADMIN users with System Company isolation.

### Helper Method

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

### Find All with ADMIN/Company Logic

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

### Find One with Multi-Tenant Isolation

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

### Create with Company Assignment

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

---

## Required Changes for System Company Pattern

### 1. Entity (`libs/common/src/lib/entities/your-entity.entity.ts`)

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

### 2. Service Imports

```typescript
import { Company } from '@accounting/common';  // Add Company import

constructor(
  @InjectRepository(YourEntity)
  private repository: Repository<YourEntity>,
  @InjectRepository(Company)  // Add Company repository
  private companyRepository: Repository<Company>,
) {}
```

### 3. Module (`libs/modules/your-module/src/lib/your-module.module.ts`)

```typescript
TypeOrmModule.forFeature([YourEntity, User, Company]),  // Include Company
```

### 4. Response DTO

```typescript
class CompanyBasicInfoDto {
  id: string;
  name: string;
  isSystemCompany: boolean; // Important for UI logic
}

export class YourResponseDto {
  companyId: string | null;
  company: CompanyBasicInfoDto | null;
  // ... other fields
}
```

---

## Entity with All Features

Complete entity example showcasing all common patterns including multi-tenancy, audit trail, enums, and proper indexing.

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
@Index(['companyId']) // Index for filtering by company
@Index(['status']) // Index for filtering by status
@Index(['assigneeId']) // Index for filtering by assignee
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

### Key Features Demonstrated

| Feature              | Implementation                           | Purpose                        |
| -------------------- | ---------------------------------------- | ------------------------------ |
| **UUID Primary Key** | `@PrimaryGeneratedColumn('uuid')`        | Unique, non-sequential IDs     |
| **Enum Columns**     | `type: 'enum', enum: TaskStatus`         | Type-safe status fields        |
| **Nullable Columns** | `nullable: true`                         | Optional fields with `null`    |
| **Multi-tenant**     | `companyId` + `@ManyToOne`               | Data isolation per company     |
| **Audit Trail**      | `createdById` + `@ManyToOne`             | Track who created records      |
| **Assignment**       | `assigneeId` + nullable relation         | Optional user assignment       |
| **Timestamps**       | `@CreateDateColumn`, `@UpdateDateColumn` | Automatic date tracking        |
| **Database Indexes** | `@Index(['companyId'])`                  | Query performance optimization |
| **Cascade Delete**   | `onDelete: 'CASCADE'`                    | Cleanup on parent deletion     |

---

> **Next:** [Common Patterns](./07-common-patterns.md)
