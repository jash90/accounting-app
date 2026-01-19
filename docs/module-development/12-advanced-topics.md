# Advanced Topics

> [← Back to Index](./README.md) | [← Previous: Best Practices](./11-best-practices.md)

This section covers advanced implementation patterns for building sophisticated modules.

---

## Soft Deletes

Implement soft deletes to preserve data history while marking records as deleted.

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

---

## Pagination

Implement pagination to efficiently handle large datasets.

### Pagination DTO

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
```

### Service Implementation

```typescript
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

---

## Filtering and Sorting

Implement dynamic filtering and sorting for flexible data queries.

### Filter DTO

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
```

### Service Implementation with Query Builder

```typescript
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

---

## File Uploads

Handle file uploads in your modules using NestJS interceptors.

### Installation

```bash
npm install @nestjs/platform-express multer @types/multer
```

### Controller Implementation

```typescript
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

> **Next:** [Reference](./13-reference.md)
