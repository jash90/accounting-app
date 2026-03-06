# RBAC Multi-tenant SaaS Platform

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)
![Bun](https://img.shields.io/badge/Bun-1.1-F9F1E1?style=flat-square&logo=bun)
![Nx](https://img.shields.io/badge/Nx-22-143055?style=flat-square&logo=nx)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Enterprise-grade multi-tenant SaaS platform with fine-grained RBAC**

[Getting Started](#-getting-started) •
[Documentation](#-documentation) •
[API Reference](#api-documentation) •
[Architecture](#-architecture)

</div>

---

## Overview

A full-stack multi-tenant SaaS application featuring Role-Based Access Control (RBAC), modular business features, and complete tenant isolation. Built with NestJS backend, React frontend, and managed as an Nx monorepo.

### Why This Stack?

- **Type Safety End-to-End** — TypeScript across the entire codebase
- **Modular Architecture** — Pluggable business modules with independent permissions
- **Enterprise Security** — JWT auth, refresh tokens, CASL authorization, tenant isolation
- **Modern DX** — Hot reload, path aliases, shared libraries, unified tooling

---

## ✨ Key Features

| Feature                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| 🔐 **Authentication**    | JWT with secure refresh token rotation            |
| 👥 **Multi-tenancy**     | Complete data isolation between companies         |
| 🛡️ **RBAC**              | Three-tier roles with granular module permissions |
| 🤖 **AI Integration**    | Claude/OpenAI agent for intelligent assistance    |
| 📧 **Email Client**      | IMAP/SMTP integration for email management        |
| 👤 **Client Management** | CRM-style client tracking and history             |
| ✅ **Task Management**   | Tasks with assignments and notifications          |
| ⏱️ **Time Tracking**     | Billable hours and project time logging           |
| 💰 **Settlements**       | Payroll calculations and monthly summaries        |
| 📄 **Documents**         | Template-based document generation (PDF/DOCX)     |
| 📊 **Offers**            | Sales offers tracking with templates              |
| 🔔 **Notifications**     | Push and email notifications with preferences     |
| 📁 **File Uploads**      | S3-compatible file storage                        |
| 📖 **API Docs**          | Auto-generated Swagger/OpenAPI documentation      |

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%" valign="top">

### Backend

| Technology | Version | Purpose               |
| ---------- | ------- | --------------------- |
| NestJS     | 11      | Application framework |
| TypeORM    | 0.3     | Database ORM          |
| PostgreSQL | 15+     | Primary database      |
| JWT        | -       | Token authentication  |
| CASL       | 6       | Authorization         |
| Swagger    | -       | API documentation     |

</td>
<td width="50%" valign="top">

### Frontend

| Technology     | Version | Purpose           |
| -------------- | ------- | ----------------- |
| React          | 19      | UI library        |
| Vite           | 7       | Build tool        |
| React Router   | 7       | Routing           |
| TanStack Query | 5       | Server state      |
| Tailwind CSS   | 4       | Styling           |
| shadcn/ui      | -       | Component library |

</td>
</tr>
</table>

### Testing & Tooling

- **Nx 22** — Monorepo management, caching, and task orchestration
- **Bun Test** — Fast frontend unit testing
- **Jest** — Backend unit testing
- **Playwright** — End-to-end browser testing

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Bun** 1.1+ (package manager & runtime)
- **PostgreSQL** 15+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd accounting

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
bun run migration:run

# Seed with demo data
bun run seed

# Start development servers
bun run dev
```

### Default Credentials

After seeding, use these credentials to log in:

| Role          | Email               | Password          |
| ------------- | ------------------- | ----------------- |
| Admin         | `admin@system.com`  | `Admin123456!`    |
| Company Owner | `owner@acme.com`    | `Owner123456!`    |
| Employee      | `employee@acme.com` | `Employee123456!` |

### Available URLs

| Service      | URL                            |
| ------------ | ------------------------------ |
| Frontend     | http://localhost:4200          |
| Backend API  | http://localhost:3000          |
| Swagger Docs | http://localhost:3000/api/docs |

---

## 🏗️ Architecture

### Project Structure

```
accounting/
├── apps/
│   ├── api/                    # NestJS backend (port 3000)
│   ├── api-e2e/                # Backend E2E tests
│   ├── web/                    # React frontend (port 4200)
│   └── web-e2e/                # Frontend E2E tests (Playwright)
├── libs/
│   ├── auth/                   # @accounting/auth - JWT authentication
│   ├── rbac/                   # @accounting/rbac - RBAC system
│   ├── common/                 # @accounting/common - Shared entities
│   ├── email/                  # Email handling utilities
│   ├── infrastructure/         # Infrastructure utilities
│   └── modules/
│       ├── ai-agent/           # Claude/OpenAI integration
│       ├── clients/            # Client management
│       ├── documents/          # Document templates and generation
│       ├── email-client/       # IMAP/SMTP email client
│       ├── notifications/      # Push/email notifications
│       ├── offers/             # Sales offers tracking
│       ├── settlements/        # Payroll settlements
│       ├── tasks/              # Task management
│       └── time-tracking/      # Time tracking
└── docs/                       # Documentation
```

### Authorization Flow

```
Request → JWT Guard → Role Check → Module Access → Permission Check → Controller
```

1. **JwtAuthGuard** — Validates JWT token, attaches user to request
2. **ModuleAccessGuard** — Verifies company has module enabled via `@RequireModule()`
3. **PermissionGuard** — Validates user permissions via `@RequirePermission()`
4. **Controller** — Executes business logic with tenant-scoped data

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN                                                          │
│  └─ System-level access: companies, modules, system config      │
│     └─ Cannot access business data (tenant isolation)           │
├─────────────────────────────────────────────────────────────────┤
│  COMPANY_OWNER                                                  │
│  └─ Company-level access: employees, module permissions         │
│     └─ Full access to company's business data                   │
├─────────────────────────────────────────────────────────────────┤
│  EMPLOYEE                                                       │
│  └─ Limited access: only assigned module permissions            │
│     └─ Scoped to own company's data                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Commands

<details>
<summary><strong>Development</strong></summary>

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `bun run dev`       | Start backend and frontend concurrently |
| `bun run serve`     | Start backend only (port 3000)          |
| `bun run serve:web` | Start frontend only (port 4200)         |
| `bun run seed`      | Seed database with test data            |

</details>

<details>
<summary><strong>Build</strong></summary>

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `bun run build`     | Build backend for production  |
| `bun run build:web` | Build frontend for production |

</details>

<details>
<summary><strong>Testing</strong></summary>

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `bun test`                 | Run backend unit tests (Jest) |
| `bun run test:web`         | Run frontend unit tests (Bun) |
| `bun run test:e2e`         | Run E2E tests (Playwright)    |
| `bun run test:integration` | Run integration tests         |

</details>

<details>
<summary><strong>Database</strong></summary>

| Command                      | Description                            |
| ---------------------------- | -------------------------------------- |
| `bun run migration:generate` | Generate migration from entity changes |
| `bun run migration:run`      | Run pending migrations                 |
| `bun run migration:revert`   | Revert last migration                  |

</details>

<details>
<summary><strong>Code Quality</strong></summary>

| Command            | Description   |
| ------------------ | ------------- |
| `bun run lint`     | Lint backend  |
| `bun run lint:web` | Lint frontend |

</details>

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory (see `.env.example`):

<details>
<summary><strong>View all environment variables</strong></summary>

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=accounting_db

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:4200

# AI (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
IMAP_HOST=imap.example.com
IMAP_PORT=993

# S3 Storage (optional)
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

</details>

### Path Aliases

TypeScript path aliases configured in `tsconfig.base.json`:

| Alias                   | Location         | Description               |
| ----------------------- | ---------------- | ------------------------- |
| `@accounting/auth`      | `libs/auth`      | Authentication library    |
| `@accounting/rbac`      | `libs/rbac`      | RBAC system               |
| `@accounting/common`    | `libs/common`    | Shared entities and enums |
| `@accounting/modules/*` | `libs/modules/*` | Business modules          |
| `@/*`                   | `apps/web/src/*` | Frontend source root      |

---

## 📚 Documentation

| Guide                                            | Description                              |
| ------------------------------------------------ | ---------------------------------------- |
| [Architecture Guide](docs/ARCHITECTURE_GUIDE.md) | System architecture and design decisions |
| [Frontend Guide](docs/FRONTEND_GUIDE.md)         | React frontend development patterns      |
| [API Documentation](docs/API_DOCUMENTATION.md)   | Backend API reference                    |
| [Module Development](docs/MODULE_DEVELOPMENT.md) | Creating new business modules            |
| [Design System](docs/DESIGN_SYSTEM.md)           | UI components and styling guide          |
| [Developer Handbook](docs/DEVELOPER_HANDBOOK.md) | Development workflows and best practices |

### API Documentation

Interactive Swagger UI available at **http://localhost:3000/api/docs** when the backend is running.

---

## 🧑‍💻 Development

### Creating a New Business Module

```bash
# 1. Generate library structure
bunx nx g @nx/nest:library modules/my-module --directory=libs

# 2. Create entity, service, and controller
# 3. Register entity in apps/api/typeorm.config.ts
# 4. Add module entry via admin API or seeder
# 5. Grant module access to companies

# See docs/MODULE_DEVELOPMENT.md for detailed guide
```

### Protected Endpoint Pattern

```typescript
@Controller('items')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('my-module')
export class ItemsController {
  @Get()
  @RequirePermission(Permission.READ)
  async findAll(@CurrentUser() user: User) {
    // Data automatically scoped to user.companyId
  }
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ using NestJS, React, Bun, and Nx**

</div>
