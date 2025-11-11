# RBAC Multi-tenant Backend

Backend API with Role-Based Access Control (RBAC) system for multi-tenant SaaS applications.

## Description

This project implements a comprehensive RBAC system using NestJS in an Nx monorepo. It supports three user roles (ADMIN, COMPANY_OWNER, EMPLOYEE) with fine-grained permission management and modular architecture.

## Technologies

- **Nx Monorepo** - Workspace management and code sharing
- **NestJS** - Progressive Node.js framework
- **TypeORM** - TypeScript ORM for PostgreSQL
- **PostgreSQL** - Relational database
- **JWT Authentication** - Token-based authentication
- **Swagger/OpenAPI** - API documentation
- **CASL** - Authorization library

## Structure of Roles

- **ADMIN**: System administrator who manages users, companies, and module assignments. Does not have access to business data.
- **COMPANY_OWNER**: Company owner who manages employees and grants module access. Has full access to enabled modules.
- **EMPLOYEE**: Employee with permissions granted by company owner. Access is limited to assigned modules and permissions.

## Installation

```bash
npm install
```

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

## Database Setup

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Setup

1. Create PostgreSQL database
2. Update `.env` with database credentials
3. Run migrations (when available) or use `synchronize: true` in development

## Running the Application

### Development

```bash
npm run serve
```

The API will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
```

## Database Seeding

Seed the database with test data:

```bash
npm run seed
```

This creates:
- 1 Admin user (admin@system.com / Admin123!)
- 2 Companies with owners and employees
- 3 Modules (simple-text, tasks, reports)
- Module assignments and permissions
- Sample data

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

## API Documentation

Swagger UI is available at:
- **URL**: `http://localhost:3000/api/docs`

All endpoints are documented with request/response examples and authentication requirements.

## Project Structure

```
workspace/
├── apps/
│   └── api/                    # Main NestJS application
│       ├── src/
│       │   ├── admin/          # Admin module
│       │   ├── company/        # Company module
│       │   ├── seeders/        # Database seeders
│       │   └── app/            # App module
│       └── project.json
├── libs/
│   ├── auth/                   # Authentication library
│   ├── rbac/                   # RBAC system library
│   ├── common/                 # Shared entities and enums
│   └── modules/
│       └── simple-text/        # Simple Text business module
└── nx.json
```

## Key Features

- ✅ JWT Authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Module-based permissions
- ✅ Multi-tenant data isolation
- ✅ Swagger API documentation
- ✅ Database migrations support
- ✅ Comprehensive test coverage

## License

MIT

