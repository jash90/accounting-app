# Developer Handbook

**Version**: 1.0
**Last Updated**: November 2025
**Target Audience**: Developers & DevOps

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [Code Patterns](#code-patterns)
4. [Testing](#testing)
5. [Creating Modules](#creating-modules)
6. [Deployment](#deployment)

---

## Quick Start

### Setup (30 minutes)

**Prerequisites**:
- Node.js 20+
- npm 9+
- PostgreSQL 14+
- Git

**Installation**:
```bash
# 1. Clone repository
git clone https://github.com/your-org/accounting.git
cd accounting

# 2. Install dependencies
npm install

# 3. Setup database
createdb accounting

# 4. Configure environment
cp apps/api/.env.example apps/api/.env.local
# Edit .env.local with your database credentials

# 5. Run migrations
npm run migration:run

# 6. Seed database
npm run seed

# 7. Start servers
npm run serve        # Backend (port 3000)
npm run serve:web    # Frontend (port 4200)
```

**Verify**:
```bash
# Test backend
curl http://localhost:3000
curl http://localhost:3000/api/docs  # Swagger

# Test frontend
open http://localhost:4200

# Login: admin@system.com / admin123
```

---

## Development Workflow

### Common Commands

```bash
# Development
nx serve api           # Backend with hot reload
nx serve web           # Frontend with HMR

# Testing
nx test api            # Backend unit tests
nx test web            # Frontend unit tests
nx test:e2e            # E2E tests with Playwright

# Code Quality
nx lint api
nx lint web
nx typecheck:web       # TypeScript check

# Database
npm run migration:generate -- apps/api/src/migrations/MigrationName
npm run migration:run
npm run migration:revert
npm run seed

# Build
nx build api --configuration=production
nx build web --configuration=production
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes

# 3. Run tests
nx test api && nx test web

# 4. Commit
git add .
git commit -m "feat: your feature description"

# 5. Push and create PR
git push origin feature/your-feature
```

---

## Code Patterns

### Multi-Tenant Service Pattern

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(Entity)
    private repository: Repository<Entity>,
  ) {}

  // Always filter by companyId
  async findAll(user: User): Promise<Entity[]> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access business data');
    }

    if (!user.companyId) return [];

    return this.repository.find({
      where: { companyId: user.companyId },
      order: { createdAt: 'DESC' },
    });
  }

  // Verify ownership
  async findOne(id: string, user: User): Promise<Entity> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (entity.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    return entity;
  }

  // Auto-assign company
  async create(createDto: CreateDto, user: User): Promise<Entity> {
    if (!user.companyId) {
      throw new ForbiddenException('User not associated with company');
    }

    const entity = this.repository.create({
      ...createDto,
      companyId: user.companyId,
      createdById: user.id,
    });

    return this.repository.save(entity);
  }
}
```

**Key Points**:
- Always filter by `companyId`
- Never trust `companyId` from request
- Block ADMIN from business data
- Verify ownership before update/delete

### Controller with Guards

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RequireModule, RequirePermission } from '@accounting/rbac';

@Controller('modules/entity')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('module-slug')
export class EntityController {
  constructor(private service: EntityService) {}

  @Get()
  @RequirePermission('module-slug', 'read')
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user);
  }

  @Post()
  @RequirePermission('module-slug', 'write')
  create(@Body() dto: CreateDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }
}
```

### DTO with Validation

```typescript
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty({ description: 'Entity title', example: 'My Entity' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

export class UpdateEntityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;  // Allow null to clear
}
```

### Frontend API Integration

```typescript
// 1. API function (lib/api/endpoints/entity.ts)
export const entityApi = {
  getAll: async (): Promise<Entity[]> => {
    const { data } = await apiClient.get<Entity[]>('/api/entity');
    return data;
  },

  create: async (dto: CreateDto): Promise<Entity> => {
    const { data } = await apiClient.post<Entity>('/api/entity', dto);
    return data;
  },
};

// 2. React Hook (lib/hooks/use-entity.ts)
export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: entityApi.getAll,
  });
};

export const useCreateEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: entityApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entity created');
    },
  });
};

// 3. Component
function EntitiesList() {
  const { data: entities, isPending } = useEntities();
  const createEntity = useCreateEntity();

  if (isPending) return <LoadingSpinner />;

  return <DataTable data={entities} />;
}
```

---

## Testing

### Unit Tests (Vitest)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('useEntities returns data', async () => {
  const { result } = renderHook(() => useEntities(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.data).toBeDefined();
});
```

### E2E Tests (Playwright)

**Status**: 127+ tests ready, waiting for frontend pages

```bash
# Run E2E tests
npm run test:e2e

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report
```

### MSW API Mocking

```typescript
// lib/api/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/entities', () => {
    return HttpResponse.json([
      { id: '1', title: 'Entity 1' },
    ]);
  }),
];
```

---

## Creating Modules

### Quick Reference

**Full guide**: `duplicated/guides/MODULE_DEVELOPMENT.md`

**Steps**:
1. Generate library: `nx generate @nx/node:library module-name`
2. Create entity in `libs/common/src/lib/entities/`
3. Create DTOs with validation
4. Create service with multi-tenant logic
5. Create controller with guards
6. Create NestJS module
7. Register in AppModule
8. Generate migration
9. Add to seeder

**Entity Template**:
```typescript
@Entity('entities')
@Index(['companyId'])
export class Entity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  companyId!: string | null;  // Nullable for System Admin

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

---

## Deployment

### Quick Deploy

**Heroku**:
```bash
heroku create accounting-api
heroku addons:create heroku-postgresql
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
git push heroku master
heroku run npm run migration:run
```

**Vercel (Frontend)**:
```bash
vercel --prod
```

### Production Checklist

**Security**:
- [ ] HTTPS enforced
- [ ] Strong JWT secrets (64+ chars)
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Security headers (Helmet)
- [ ] Secrets not committed

**Performance**:
- [ ] Bundle size < 500KB
- [ ] Database queries optimized
- [ ] Caching enabled
- [ ] CDN configured

**Monitoring**:
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database backups automated
- [ ] Logs configured

---

## Related Documentation

**Complete References**:
- Onboarding: `duplicated/guides/DEVELOPER_ONBOARDING.md`
- Deployment: `duplicated/guides/DEPLOYMENT_GUIDE.md`
- Module Development: `duplicated/guides/MODULE_DEVELOPMENT.md`
- Code Patterns: `duplicated/guides/IMPLEMENTATION_PATTERNS.md`
- Testing Report: `duplicated/guides/TEST_IMPLEMENTATION_REPORT.md`

**Other Guides**:
- Frontend: `FRONTEND_GUIDE.md`
- API: `API_DOCUMENTATION.md`
- Architecture: `ARCHITECTURE_GUIDE.md`
- Design: `DESIGN_SYSTEM.md`

---

**Version**: 1.0
**Status**: Production Ready
**Last Updated**: November 2025
