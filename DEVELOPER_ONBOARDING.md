# Developer Onboarding Guide - Getting Started

## Table of Contents

1. [Welcome](#welcome)
2. [Prerequisites](#prerequisites)
3. [Quick Start (30 minutes)](#quick-start-30-minutes)
4. [Project Overview](#project-overview)
5. [Development Workflow](#development-workflow)
6. [First Day Tasks](#first-day-tasks)
7. [Week 1 Goals](#week-1-goals)
8. [Common Workflows](#common-workflows)
9. [Troubleshooting](#troubleshooting)
10. [Resources & Support](#resources--support)

---

## Welcome

Welcome to the Accounting RBAC System development team! 🎉

This guide will help you get up and running quickly and become productive in your first week.

### What We're Building

A **multi-tenant accounting system** with role-based access control:
- **Backend**: NestJS API with 47 REST endpoints
- **Frontend**: React + TypeScript SPA
- **3 User Roles**: ADMIN, COMPANY_OWNER, EMPLOYEE
- **Module System**: Pluggable business features
- **Multi-Tenant**: Complete data isolation per company

### Team Structure

- **Backend Team**: NestJS, TypeORM, PostgreSQL
- **Frontend Team**: React, TypeScript, Tailwind CSS
- **DevOps**: Deployment, CI/CD, monitoring
- **QA**: Testing, quality assurance

---

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| **Node.js** | 18+ | https://nodejs.org/ |
| **npm** | 9+ | Comes with Node.js |
| **Git** | Latest | https://git-scm.com/ |
| **PostgreSQL** | 14+ | https://www.postgresql.org/ |
| **VS Code** | Latest | https://code.visualstudio.com/ (recommended) |

### VS Code Extensions (Recommended)

```bash
# Install via VS Code or command line:
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension nrwl.angular-console  # Nx extension
code --install-extension ms-vscode.vscode-typescript-next
```

### Check Your Setup

```bash
# Verify installations
node --version    # Should show v18+
npm --version     # Should show v9+
git --version     # Should show git version
psql --version    # Should show PostgreSQL 14+

# Verify command availability
nx --version      # Will be installed via npm install
```

---

## Quick Start (30 minutes)

### Step 1: Clone Repository (2 min)

```bash
# Clone from GitHub
git clone https://github.com/your-org/accounting.git
cd accounting

# Or if using SSH
git clone git@github.com:your-org/accounting.git
cd accounting
```

### Step 2: Install Dependencies (5 min)

```bash
# Install all dependencies (backend + frontend)
npm install

# This installs dependencies for:
# - Backend API (apps/api)
# - Frontend Web (apps/web)
# - All shared libraries (libs/*)
```

### Step 3: Database Setup (5 min)

```bash
# Start PostgreSQL (if not running)
# macOS (Homebrew):
brew services start postgresql@14

# Linux (systemctl):
sudo systemctl start postgresql

# Create database
createdb accounting

# Or via psql:
psql -U postgres
CREATE DATABASE accounting;
\q
```

### Step 4: Environment Configuration (3 min)

```bash
# Backend environment
cp apps/api/.env.example apps/api/.env.local

# Edit apps/api/.env.local with your database credentials:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=accounting

JWT_SECRET=your_random_secret_here_min_32_chars
JWT_REFRESH_SECRET=another_random_secret_here_min_32_chars

# Frontend environment (if web app exists)
cp apps/web/.env.example apps/web/.env.local

# Edit apps/web/.env.local:
VITE_API_BASE_URL=http://localhost:3000
```

### Step 5: Run Database Migrations (3 min)

```bash
# Run migrations to create tables
npm run migration:run

# Seed initial data (admin user, modules)
npm run seed
```

**Default Admin Credentials** (created by seeder):
- Email: `admin@system.com`
- Password: `admin123`

### Step 6: Start Development Servers (2 min)

```bash
# Terminal 1: Start backend API
nx serve api
# API will run on http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs

# Terminal 2: Start frontend (if implemented)
nx serve web
# Frontend will run on http://localhost:4200
```

### Step 7: Verify Setup (5 min)

**Backend**:
```bash
# Test health check
curl http://localhost:3000
# Should return: {"message":"Hello API"}

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"admin123"}'
# Should return access_token and refresh_token

# Open Swagger documentation
open http://localhost:3000/api/docs
```

**Frontend** (if implemented):
```bash
# Open in browser
open http://localhost:4200

# Login with admin credentials
# Email: admin@system.com
# Password: admin123
```

### ✅ You're Ready!

If all steps completed successfully, you're ready to start developing!

---

## Project Overview

### Repository Structure

```
accounting/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── app/          # AppModule
│   │   │   ├── admin/        # Admin controllers
│   │   │   ├── company/      # Company controllers
│   │   │   └── main.ts       # Entry point
│   │   └── typeorm.config.ts
│   └── web/                  # React frontend (if exists)
│       └── src/
│           ├── app/          # Routes, App.tsx
│           ├── pages/        # Page components
│           ├── components/   # UI components
│           └── lib/          # API, hooks, utils
├── libs/
│   ├── auth/                 # Authentication library
│   ├── rbac/                 # RBAC library
│   ├── common/               # Shared entities
│   └── modules/              # Business modules
│       └── simple-text/
├── docs/                     # Documentation (optional)
├── package.json
├── nx.json                   # Nx configuration
└── tsconfig.base.json
```

### Technology Stack

**Backend**:
- NestJS 11 (Node.js framework)
- TypeORM (ORM)
- PostgreSQL (Database)
- JWT (Authentication)
- Swagger (API docs)

**Frontend**:
- React 18 (UI framework)
- TypeScript (Type safety)
- Tailwind CSS + shadcn/ui (Styling)
- TanStack Query (State management)
- Vite (Build tool)

**Monorepo**:
- Nx (Build system, task orchestration)

### Key Concepts

**Multi-Tenant**: Each company's data is completely isolated
**RBAC**: Role-Based Access Control with 3 roles and granular permissions
**Modules**: Pluggable business features (like "simple-text")
**JWT**: Stateless authentication with access + refresh tokens

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin master

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes

# 4. Run linter
nx lint api          # Backend
nx lint web          # Frontend

# 5. Run tests
nx test api
nx test web

# 6. Commit changes
git add .
git commit -m "feat: your feature description"

# 7. Push to remote
git push origin feature/your-feature-name

# 8. Create Pull Request on GitHub
```

### Common Nx Commands

```bash
# Serve applications
nx serve api           # Start backend API
nx serve web           # Start frontend

# Run tests
nx test api            # Backend tests
nx test web            # Frontend tests
nx e2e web-e2e         # E2E tests

# Build
nx build api           # Build backend
nx build web           # Build frontend

# Lint
nx lint api
nx lint web

# Run migrations
npm run migration:generate -- apps/api/src/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Seed database
npm run seed

# View dependency graph
nx graph
```

---

## First Day Tasks

### Task 1: Fix a Typo (30 min)

**Objective**: Make your first contribution by fixing a simple typo

**Steps**:
1. Find a typo in any `.md` file or code comment
2. Create branch: `git checkout -b fix/typo-in-readme`
3. Fix the typo
4. Commit: `git commit -m "docs: fix typo in README"`
5. Push and create PR
6. Wait for review

**Learning**: Git workflow, PR process

---

### Task 2: Add Field to User Table (2 hours)

**Objective**: Add `phoneNumber` field to User entity

**Backend**:
```typescript
// 1. Update libs/common/src/lib/entities/user.entity.ts
@Column({ nullable: true })
phoneNumber: string | null;

// 2. Update DTOs
// apps/api/src/admin/dto/create-user.dto.ts
@IsOptional()
@IsPhoneNumber()
phoneNumber?: string;

// 3. Generate migration
npm run migration:generate -- apps/api/src/migrations/AddPhoneNumberToUser

// 4. Run migration
npm run migration:run

// 5. Test with Swagger
# POST /admin/users with phoneNumber field
```

**Frontend** (if exists):
```typescript
// 1. Update types/entities.ts
interface User {
  // ...
  phoneNumber: string | null;
}

// 2. Update validation
export const createUserSchema = z.object({
  // ...
  phoneNumber: z.string().optional(),
});

// 3. Update form component
<FormField
  name="phoneNumber"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Phone Number</FormLabel>
      <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
      <FormMessage />
    </FormItem>
  )}
/>

// 4. Test in browser
```

**Learning**: Entity modification, migrations, DTO updates, form updates

---

### Task 3: Create Simple Component (1 hour)

**Objective**: Create a UserBadge component

**File**: `apps/web/src/components/common/user-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { User } from '@/types/entities';

interface UserBadgeProps {
  user: User;
  showRole?: boolean;
}

export function UserBadge({ user, showRole = false }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">
        {user.firstName} {user.lastName}
      </span>
      {showRole && (
        <Badge variant={
          user.role === 'ADMIN' ? 'destructive' :
          user.role === 'COMPANY_OWNER' ? 'default' :
          'secondary'
        }>
          {user.role}
        </Badge>
      )}
    </div>
  );
}
```

**Usage**:
```tsx
import { UserBadge } from '@/components/common/user-badge';

<UserBadge user={user} showRole />
```

**Learning**: Component creation, TypeScript props, Tailwind styling

---

## Week 1 Goals

### By End of Week 1

- ✅ **Environment Setup**: All tools installed and working
- ✅ **Project Understanding**: Familiar with repository structure
- ✅ **First PR Merged**: At least one contribution merged
- ✅ **Backend Basics**: Can create simple endpoint
- ✅ **Frontend Basics**: Can create simple component (if frontend dev)
- ✅ **Testing**: Can run and write basic tests
- ✅ **Documentation**: Read all relevant docs

### Recommended Learning Path

**Day 1**: Setup, read documentation, explore codebase
**Day 2**: Complete Task 1 (typo fix), understand Git workflow
**Day 3**: Complete Task 2 (add field), understand migrations
**Day 4**: Complete Task 3 (component), understand React patterns
**Day 5**: Shadow senior developer, pair programming

---

## Common Workflows

### Creating a New Backend Endpoint

**Follow**: `MODULE_DEVELOPMENT.md`

**Quick Steps**:
1. Create DTO in `dto/` folder
2. Add method to service
3. Add endpoint to controller with guards
4. Test with Swagger

**Example**: Add `GET /admin/users/active` endpoint

```typescript
// 1. Service method
async findAllActive(): Promise<User[]> {
  return this.userRepository.find({
    where: { isActive: true },
  });
}

// 2. Controller endpoint
@Get('active')
@Roles(UserRole.ADMIN)
@ApiOperation({ summary: 'Get all active users' })
async findAllActive() {
  return this.userService.findAllActive();
}

// 3. Test in Swagger
# Navigate to http://localhost:3000/api/docs
# Try the new endpoint
```

---

### Creating a New Frontend Page

**Follow**: `FRONTEND_IMPLEMENTATION_PLAN.md`

**Quick Steps**:
1. Create page component in `pages/`
2. Add route in `app/routes.tsx`
3. Create hook if needed
4. Use components from design system

**Example**: Add Settings Page

```typescript
// 1. Create pages/settings/settings-page.tsx
export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences" />
      <Card>
        <CardContent>
          Settings content here
        </CardContent>
      </Card>
    </div>
  );
}

// 2. Add route
<Route path="/settings" element={<SettingsPage />} />

// 3. Add navigation link
<Link to="/settings">Settings</Link>
```

---

### Adding Form Validation

**Follow**: `API_INTEGRATION_GUIDE.md`

**Quick Steps**:
1. Create Zod schema in `lib/validation/schemas.ts`
2. Use with React Hook Form
3. Display errors with FormMessage

**Example**:

```typescript
// 1. Zod schema
export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  darkMode: z.boolean(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// 2. Form component
const form = useForm<SettingsFormData>({
  resolver: zodResolver(settingsSchema),
  defaultValues: {
    emailNotifications: true,
    darkMode: false,
  },
});

// 3. Form fields
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="emailNotifications"
      render={({ field }) => (
        <FormItem className="flex items-center gap-2">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel>Email notifications</FormLabel>
        </FormItem>
      )}
    />
    <Button type="submit">Save</Button>
  </form>
</Form>
```

---

### Integrating New API Endpoint

**Follow**: `API_INTEGRATION_GUIDE.md`

**Steps**:
1. Create API function in `lib/api/endpoints/`
2. Create hook in `lib/hooks/`
3. Use hook in component

**Example**: Integrate `GET /admin/users/active`

```typescript
// 1. API function (lib/api/endpoints/users.ts)
export const usersApi = {
  // ... existing methods
  getActive: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/admin/users/active');
    return data;
  },
};

// 2. Hook (lib/hooks/use-users.ts)
export const useActiveUsers = () => {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: usersApi.getActive,
  });
};

// 3. Component usage
const { data: activeUsers, isLoading } = useActiveUsers();
```

---

## Troubleshooting

### Common Issues

#### "Cannot connect to database"

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL
brew services start postgresql@14     # macOS
sudo systemctl start postgresql       # Linux

# Verify credentials in .env.local match your PostgreSQL setup
```

---

#### "Port 3000 already in use"

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port in .env.local
PORT=3001
```

---

#### "Module not found: @accounting/..."

**Error**:
```
Error: Cannot find module '@accounting/common'
```

**Solution**:
```bash
# Clear Nx cache
nx reset

# Rebuild
nx build common
nx build auth
nx build rbac

# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

#### "Migration already executed"

**Error**:
```
QueryFailedError: relation "users" already exists
```

**Solution**:
```bash
# Check migration status
npm run migration:show

# If migrations are out of sync, revert and re-run
npm run migration:revert
npm run migration:run
```

---

#### JWT Token Expired

**Error in Swagger**:
```
401 Unauthorized
```

**Solution**:
```bash
# Re-login to get new token
POST /auth/login

# Update token in Swagger "Authorize" button
# Copy new access_token and paste with "Bearer " prefix
```

---

### Getting Help

**Documentation**:
1. **ARCHITECTURE.md** - System architecture
2. **API_ENDPOINTS.md** - API reference
3. **MODULE_DEVELOPMENT.md** - Backend development
4. **FRONTEND_IMPLEMENTATION_PLAN.md** - Frontend development
5. **COMPONENT_DESIGN_SYSTEM.md** - UI components
6. **API_INTEGRATION_GUIDE.md** - API integration
7. **This document** - Getting started

**Team Contacts**:
- **Tech Lead**: [Name] - Architecture questions
- **Backend Lead**: [Name] - API, database questions
- **Frontend Lead**: [Name] - React, UI questions
- **DevOps**: [Name] - Deployment, infrastructure

**Communication**:
- **Slack**: #accounting-dev (general), #accounting-help (questions)
- **GitHub**: Issues for bugs, Discussions for questions
- **Meetings**: Daily standup 10 AM, Weekly planning Monday 2 PM

---

## Resources & Support

### Essential Documentation

**Internal Docs** (in repository):
- ARCHITECTURE.md
- API_ENDPOINTS.md
- MODULE_DEVELOPMENT.md
- IMPLEMENTATION_PATTERNS.md
- FRONTEND_IMPLEMENTATION_PLAN.md
- COMPONENT_DESIGN_SYSTEM.md
- API_INTEGRATION_GUIDE.md
- DEPLOYMENT_GUIDE.md

**External Docs**:
- NestJS: https://docs.nestjs.com/
- TypeORM: https://typeorm.io/
- React: https://react.dev/
- TanStack Query: https://tanstack.com/query/latest
- Tailwind CSS: https://tailwindcss.com/
- shadcn/ui: https://ui.shadcn.com/
- Nx: https://nx.dev/

### Learning Resources

**Backend (NestJS)**:
- Official NestJS Course: https://courses.nestjs.com/
- TypeORM Guide: https://typeorm.io/
- RBAC Patterns: See ARCHITECTURE.md

**Frontend (React)**:
- React Beta Docs: https://react.dev/
- TanStack Query Crash Course: https://ui.dev/c/react-query
- Tailwind CSS Tutorial: https://tailwindcss.com/docs

**TypeScript**:
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- TypeScript Deep Dive: https://basarat.gitbook.io/typescript/

### Code Review Guidelines

**Before Creating PR**:
- [ ] Code follows existing patterns
- [ ] No console.log statements
- [ ] TypeScript has no errors
- [ ] Linter passes (`nx lint`)
- [ ] Tests pass (`nx test`)
- [ ] Documentation updated if needed

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

---

## FAQ

### Q: Where do I find examples of how to do X?

**A**: Check these docs in order:
1. **IMPLEMENTATION_PATTERNS.md** - Code examples
2. **Existing code** - libs/modules/simple-text/ for reference
3. **Ask senior developer** - Don't spend >30min stuck

### Q: How do I test my changes?

**A**:
- **Backend**: Use Swagger UI (`/api/docs`)
- **Frontend**: Run dev server and use browser
- **Automated**: Run `nx test`
- **E2E**: Run `nx e2e web-e2e`

### Q: What's the deployment process?

**A**: See **DEPLOYMENT_GUIDE.md** for complete guide

### Q: How do permissions work?

**A**: See **ARCHITECTURE.md** section "RBAC System"

- ADMIN: Full system access (no business data)
- COMPANY_OWNER: Full access to enabled modules
- EMPLOYEE: Granular permissions (read/write/delete)

### Q: Can I use a different database?

**A**: PostgreSQL is required. TypeORM supports other databases, but migrations may differ.

### Q: How do I add a new module?

**A**: Follow complete guide in **MODULE_DEVELOPMENT.md**

---

## Congratulations!

You're now ready to contribute to the Accounting RBAC System! 🎉

### Next Steps

1. ✅ Complete your first day tasks
2. 📚 Read architecture documentation
3. 💻 Start working on assigned tickets
4. 🤝 Participate in team meetings
5. 📈 Track your progress

### Remember

- **Ask questions** - Better to ask than spend hours stuck
- **Follow patterns** - Check existing code for examples
- **Test your changes** - Write tests, use Swagger
- **Document** - Update docs when you change functionality
- **Communicate** - Keep team updated on progress

Welcome aboard! 🚀

---

## Related Documentation

**Full Documentation Suite**:

**Backend**:
1. ARCHITECTURE.md - System architecture
2. API_ENDPOINTS.md - API reference (47 endpoints)
3. MODULE_DEVELOPMENT.md - Backend module tutorial
4. IMPLEMENTATION_PATTERNS.md - Backend code patterns

**Frontend**:
5. FRONTEND_IMPLEMENTATION_PLAN.md - Frontend architecture
6. COMPONENT_DESIGN_SYSTEM.md - UI component catalog
7. API_INTEGRATION_GUIDE.md - API integration patterns

**Process**:
8. DEVELOPER_ONBOARDING.md (this document) - Getting started
9. DEPLOYMENT_GUIDE.md - Production deployment

---

**Version**: 1.0
**Last Updated**: January 2024
**Target Audience**: New developers joining the team
