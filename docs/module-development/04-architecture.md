# Architecture Overview

> [← Back to Index](./README.md) | [← Previous: Prerequisites](./03-prerequisites.md)

## Multi-Tenant Architecture

Every business module must support multi-tenancy:

```
Company A                    Company B
   ├── User 1                   ├── User 1
   ├── User 2                   ├── User 2
   ├── Task 1                   ├── Task 1
   ├── Task 2                   ├── Task 2
   └── Task 3                   └── Task 3

Data is isolated by companyId - Company A cannot access Company B's data
```

## RBAC System

Three-tier authorization:

```
ADMIN
  └─ System administration
  └─ Cannot access business data

COMPANY_OWNER
  └─ Full access to company modules
  └─ Grants permissions to employees

EMPLOYEE
  └─ Access based on granted permissions
  └─ Permissions: read, write, delete
```

## System Admin Company Pattern

**Special Pattern for ADMIN Users**:

```
ADMIN User Flow:
  ├─ Creates entries in "System Admin" company
  ├─ Views only System Admin company data
  ├─ Isolated from regular business companies
  └─ Used for system-wide configuration/testing

Implementation:
  ├─ companyId: nullable in entity (string | null)
  ├─ Company relation: nullable: true
  ├─ Service: getSystemCompany() helper method
  └─ Query: filter by system company ID for ADMINs
```

**Key Differences from Regular Business Data**:

- ✅ ADMINs CAN create/view/modify data (in System Admin company only)
- ✅ `companyId` is nullable to support system-level entries
- ✅ Service must inject `Company` repository to find system company
- ✅ System company has special flag: `isSystemCompany: true`

## Module Components

```
┌─────────────┐
│ Controller  │  HTTP layer, Guards, Validation
└──────┬──────┘
       │
┌──────▼──────┐
│  Service    │  Business logic, Data access
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │  TypeORM, Database queries
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │  PostgreSQL
└─────────────┘
```

## Complex Module Architecture (AI Agent Example)

For modules requiring external integrations, encryption, and multiple related entities:

```
┌─────────────────────────────────────────────────────────────┐
│                    Controllers Layer                         │
│  ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │ ConfigController│ │ConversationCtrl│ │TokenUsageCtrl  │   │
│  │   (ADMIN only)  │ │  (all users)  │ │ (role-based)   │   │
│  └────────┬────────┘ └──────┬───────┘ └────────┬────────┘   │
└───────────┼─────────────────┼──────────────────┼────────────┘
            │                 │                  │
┌───────────▼─────────────────▼──────────────────▼────────────┐
│                    Services Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ConfigService│ │ConversationSvc│ │TokenLimitSvc│           │
│  │(encryption) │ │   (chat)    │ │(rate limit) │            │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
│         │               │               │                    │
│  ┌──────▼──────────────▼───────────────▼──────┐             │
│  │           Shared Services                   │             │
│  │  ┌─────────────┐ ┌─────────────┐           │             │
│  │  │ RAGService  │ │SystemCompanySvc│         │             │
│  │  │(vectors)    │ │  (caching)  │           │             │
│  │  └─────────────┘ └─────────────┘           │             │
│  └─────────────────────────────────────────────┘             │
│                                                              │
│  ┌─────────────────────────────────────────────┐             │
│  │        Provider Abstraction Layer           │             │
│  │  ┌─────────────┐       ┌─────────────┐     │             │
│  │  │  OpenAI     │       │ OpenRouter  │     │             │
│  │  │  Provider   │       │  Provider   │     │             │
│  │  └──────┬──────┘       └──────┬──────┘     │             │
│  │         └────────┬────────────┘            │             │
│  │           Abstract AIProvider              │             │
│  └─────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│                    Entities Layer (6 entities)               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │AIConfiguration│ │AIConversation │ │  AIMessage    │      │
│  │(encrypted key)│ │(has messages) │ │(token counts) │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │  AIContext    │ │  TokenUsage   │ │  TokenLimit   │      │
│  │(vector embed) │ │(daily aggr.)  │ │(hierarchical) │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**When to Use Complex Architecture:**

- External API integrations (AI, payment, etc.)
- Multiple related entities with cascade relationships
- Sensitive data requiring encryption
- Rate limiting / usage tracking
- File upload and processing
- Vector search / similarity queries

---

> **Next:** [Step-by-Step Tutorial](./05-step-by-step-tutorial.md)
