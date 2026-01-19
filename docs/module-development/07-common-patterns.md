# Common Patterns

> [← Back to Index](./README.md) | [← Previous: Code Examples](./06-code-examples.md)

This section covers common patterns used when developing modules in this codebase, including field types, indexes, relationships, and custom validators.

---

## Different Field Types

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

---

## Advanced Field Types (Complex Modules)

```typescript
// JSONB - Flexible structured data (PostgreSQL)
@Column({ type: 'jsonb', nullable: true })
metadata: Record<string, unknown> | null;

// JSONB with specific shape
@Column({ type: 'jsonb', nullable: true })
settings: {
  theme: string;
  notifications: boolean;
  preferences: Record<string, string>;
} | null;

// Vector embedding - For semantic search (requires pgvector extension)
// 1536 dimensions for OpenAI ada-002, 3072 for text-embedding-3-large
@Column({ type: 'vector', length: 1536, nullable: true })
embedding: number[] | null;

// Encrypted field pattern - Store encrypted data with IV prefix
// Format: "iv_hex:encrypted_hex"
@Column({ type: 'text' })
encryptedApiKey: string;

// Decimal with specific precision - For token counts, currency
@Column({ type: 'decimal', precision: 3, scale: 2, default: 0.8 })
warningThreshold: number;

// Big integer - For large counts
@Column({ type: 'bigint', default: 0 })
totalTokensUsed: string; // TypeORM returns bigint as string
```

---

## Advanced Indexes

```typescript
// Composite unique index - Enforce unique combinations
@Entity('token_usage')
@Index(['companyId', 'date'], { unique: true })
export class TokenUsage {
  // Only one record per company per day
}

// Composite index for common queries
@Entity('ai_contexts')
@Index(['companyId', 'isActive'])
export class AIContext {
  // Optimizes: WHERE companyId = ? AND isActive = true
}

// Partial index (raw SQL in migration)
// CREATE INDEX idx_active_configs ON ai_configurations (companyId) WHERE isActive = true;

// Vector index for similarity search (in migration)
// CREATE INDEX ai_contexts_embedding_idx ON ai_contexts
// USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Relationships

### One-to-Many

A Company has many Tasks:

```typescript
@Entity('companies')
export class Company {
  @OneToMany(() => Task, (task) => task.company)
  tasks: Task[];
}
```

### Many-to-One

A Task belongs to a Company:

```typescript
@Entity('tasks')
export class Task {
  @ManyToOne(() => Company, (company) => company.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;
}
```

### One-to-One

```typescript
@OneToOne(() => Profile)
@JoinColumn()
profile: Profile;
```

### Many-to-Many

```typescript
@ManyToMany(() => Tag)
@JoinTable()
tags: Tag[];
```

---

## Custom Validators

You can create custom validators using `class-validator` for specialized validation logic.

### Example: Future Date Validator

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

> **Next:** [Testing Guide](./08-testing.md)
