# Gemini Context

This project is a full-stack **Nx Monorepo** RBAC Multi-tenant SaaS platform.

## Where to Find Rules

All coding rules, patterns, and constraints are in **`AGENTS.md`** (root). Read it fully before making changes.

- **`libs/AGENTS.md`** — shared library rules (exports, boundaries, utilities)
- **`apps/api/AGENTS.md`** — backend-specific rules (services, DTOs, guards)
- **`apps/web/AGENTS.md`** — frontend-specific rules (hooks, components, forms)
- **`CLAUDE.md`** — dev environment setup (portless URLs)

## Quick Reference

- **Package Manager**: Bun
- **Backend**: NestJS 11 + TypeORM + PostgreSQL (`apps/api`)
- **Frontend**: React 19 + Vite + TanStack Query + shadcn/ui (`apps/web`)
- **Landing**: Astro (`apps/landing`)
- **Monorepo**: Nx 22
- **Testing**: Bun Test (backend) + Vitest/Playwright (frontend)

## Dev URLs (Portless)

| Service | URL                                    |
| ------- | -------------------------------------- |
| API     | `http://api.accounting.localhost:1355` |
| Web     | `http://web.accounting.localhost:1355` |

## Key Commands

```bash
bun dev              # Start backend + frontend (requires portless)
bun run serve        # Backend only
bun run serve:web    # Frontend only
bun run test         # Backend tests (bun test)
bun run test:web     # Frontend tests (vitest)
bun run seed         # Seed test data
bun run lint         # Lint backend
bun run lint:web     # Lint frontend
```

## Critical Rules (Summary)

- **Multi-tenancy**: Always use `SystemCompanyService.getCompanyIdForUser(user)` — never `user.companyId` directly.
- **Guards order**: `JwtAuthGuard → ModuleAccessGuard → PermissionGuard`
- **Migrations**: Always generate after entity changes (`bun run migration:generate`)
- **Frontend**: Components → Hooks → API functions → HTTP client. Never skip layers.
- **Full details**: Read `AGENTS.md`.
