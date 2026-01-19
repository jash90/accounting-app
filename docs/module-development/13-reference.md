# Reference

> [← Back to Index](./README.md) | [← Previous: Advanced Topics](./12-advanced-topics.md)

## TypeORM Decorators

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

## class-validator Decorators

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

## NestJS HTTP Decorators

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

## Custom Decorators (RBAC)

| Decorator | Purpose |
|-----------|---------|
| `@CurrentUser()` | Get authenticated user |
| `@RequireModule('slug')` | Require module access |
| `@RequirePermission('slug', 'permission')` | Require specific permission |
| `@Roles(...)` | Require user role |
| `@Public()` | Skip authentication |

## Swagger Decorators

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
| `@ApiConsumes()` | Accept content types (e.g., `multipart/form-data`) |

## Advanced TypeORM Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| `@Index(['col1', 'col2'])` | Composite index | `@Index(['companyId', 'date'])` |
| `@Index([...], { unique: true })` | Composite unique constraint | `@Index(['companyId', 'date'], { unique: true })` |
| `@Column({ type: 'jsonb' })` | Flexible JSON storage | `metadata: Record<string, unknown>` |
| `@Column({ type: 'vector', length: N })` | Vector embeddings (pgvector) | `embedding: number[]` |
| `cascade: true` | Cascade operations | `@OneToMany(..., { cascade: true })` |
| `onDelete: 'CASCADE'` | Delete children with parent | `@ManyToOne(..., { onDelete: 'CASCADE' })` |
| `onDelete: 'SET NULL'` | Nullify on parent delete | `@ManyToOne(..., { onDelete: 'SET NULL' })` |

## File Upload Decorators

| Decorator | Purpose |
|-----------|---------|
| `@UseInterceptors(FileInterceptor('field'))` | Single file upload |
| `@UseInterceptors(FilesInterceptor('field'))` | Multiple files upload |
| `@UploadedFile()` | Get uploaded file |
| `@UploadedFiles()` | Get multiple files |

## class-transformer Decorators (Responses)

| Decorator | Purpose |
|-----------|---------|
| `@Expose()` | Include field in serialization |
| `@Exclude()` | Exclude field from serialization |
| `@Transform()` | Transform value during serialization |
| `@Type()` | Specify nested type for transformation |

## NestJS Lifecycle Hooks

| Interface | Method | Use Case |
|-----------|--------|----------|
| `OnModuleInit` | `onModuleInit()` | Validate env vars, initialize providers |
| `OnModuleDestroy` | `onModuleDestroy()` | Cleanup resources, close connections |
| `OnApplicationShutdown` | `onApplicationShutdown()` | Graceful shutdown |

---

> **Next:** [Final Checklist](./14-checklist.md)
