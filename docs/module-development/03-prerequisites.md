# Prerequisites

> [← Back to Index](./README.md) | [← Previous: Quick Start](./02-quick-start.md)

## Required Knowledge

- TypeScript/JavaScript
- NestJS basics
- TypeORM
- REST API concepts
- Basic understanding of RBAC

## Tools & Environment

- Node.js 18+
- npm or yarn
- PostgreSQL
- NestJS CLI
- Nx CLI

## Understanding the Project Structure

```
accounting/
├── apps/
│   └── api/                    # Main application
│       ├── src/
│       │   ├── app/            # AppModule
│       │   ├── admin/          # Admin management
│       │   ├── company/        # Company management
│       │   ├── seeders/        # Database seeders
│       │   └── main.ts         # Bootstrap
│       └── typeorm.config.ts   # TypeORM config
├── libs/
│   ├── auth/                   # Authentication library
│   ├── rbac/                   # RBAC library
│   ├── common/                 # Shared entities & enums
│   │   └── entities/           # All database entities
│   └── modules/                # Business modules
│       ├── simple-text/        # Example module
│       └── tasks/              # Example module (used throughout this guide)
└── package.json
```

---

> **Next:** [Architecture Overview](./04-architecture.md)
