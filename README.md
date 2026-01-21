# RBAC Multi-tenant SaaS Platform

Full-stack multi-tenant SaaS application with Role-Based Access Control (RBAC), built using NestJS backend and React frontend in an Nx monorepo.

## Tech Stack

### Backend
- **NestJS 11** - Progressive Node.js framework
- **TypeORM** - TypeScript ORM for PostgreSQL
- **PostgreSQL** - Relational database
- **JWT Authentication** - Token-based auth with refresh tokens
- **CASL** - Authorization library
- **Swagger/OpenAPI** - API documentation

### Frontend
- **React 19** - UI library with React Compiler
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **TanStack Query 5** - Server state management
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Radix UI component library
- **React Hook Form + Zod** - Form handling and validation

### Infrastructure
- **Nx 22** - Monorepo workspace management
- **Vitest** - Frontend unit testing
- **Jest** - Backend unit testing
- **Playwright** - E2E testing

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm run dev

# Backend only (API on port 3000)
npm run serve

# Frontend only (Web on port 4200)
npm run serve:web
```

## Project Structure

```
workspace/
├── apps/
│   ├── api/                    # NestJS backend (port 3000)
│   ├── api-e2e/                # Backend E2E tests
│   └── web/                    # React frontend (port 4200)
├── web-e2e/                    # Frontend E2E tests (Playwright)
├── libs/
│   ├── auth/                   # JWT authentication library
│   ├── rbac/                   # RBAC system library
│   ├── common/                 # Shared entities and enums
│   ├── email/                  # Email handling library
│   ├── infrastructure/         # Infrastructure utilities
│   └── modules/
│       ├── ai-agent/           # AI Agent module (Claude/OpenAI)
│       ├── clients/            # Client management module
│       ├── email-client/       # Email client module
│       ├── tasks/              # Task management module
│       └── time-tracking/      # Time tracking module
└── docs/                       # Documentation
```

## Role Hierarchy

| Role | Description |
|------|-------------|
| **ADMIN** | System administrator. Manages companies and modules. No business data access. |
| **COMPANY_OWNER** | Company administrator. Manages employees and grants module permissions. |
| **EMPLOYEE** | End user with permissions assigned by company owner. |

## Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend concurrently |
| `npm run serve` | Start backend only (port 3000) |
| `npm run serve:web` | Start frontend only (port 4200) |
| `npm run seed` | Seed database with test data |

### Build

| Command | Description |
|---------|-------------|
| `npm run build` | Build backend for production |
| `npm run build:web` | Build frontend for production |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run backend unit tests (Jest) |
| `npm run test:web` | Run frontend unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:integration` | Run integration tests |

### Database

| Command | Description |
|---------|-------------|
| `npm run migration:generate` | Generate migration from entity changes |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Lint backend |
| `npm run lint:web` | Lint frontend |

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=accounting_db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:4200
```

## Database Seeding

Seed the database with test data:

```bash
npm run seed
```

This creates:
- 1 Admin user (`admin@system.com` / `Admin123!`)
- 2 Companies with owners and employees
- Business modules with permissions
- Sample data for testing

## Key Features

- JWT Authentication with refresh tokens
- Role-based access control (RBAC)
- Module-based permissions system
- Multi-tenant data isolation
- AI Agent integration (Claude/OpenAI)
- Email client with IMAP/SMTP
- Client management system
- Task management with notifications
- Time tracking
- File uploads (S3)
- Swagger API documentation

## API Documentation

Swagger UI available at `http://localhost:3000/api/docs` when backend is running.

## Documentation

| Guide | Description |
|-------|-------------|
| [Frontend Guide](docs/FRONTEND_GUIDE.md) | React frontend development |
| [Architecture Guide](docs/ARCHITECTURE_GUIDE.md) | System architecture overview |
| [Design System](docs/DESIGN_SYSTEM.md) | UI components and styling |
| [Developer Handbook](docs/DEVELOPER_HANDBOOK.md) | Development workflows |
| [API Documentation](docs/API_DOCUMENTATION.md) | Backend API reference |
| [Module Development](docs/MODULE_DEVELOPMENT.md) | Creating new business modules |

## Path Aliases

TypeScript path aliases (from `tsconfig.base.json`):

| Alias | Path |
|-------|------|
| `@accounting/auth` | Authentication library |
| `@accounting/rbac` | RBAC system |
| `@accounting/common` | Shared entities and enums |
| `@accounting/modules/*` | Business modules |
| `@` | Frontend source root (`apps/web/src/`) |

## License

MIT
