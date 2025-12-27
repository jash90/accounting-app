# Accounting Project Context

## Project Overview

This project is a full-stack **Nx Monorepo** application designed as a Multi-tenant SaaS platform with a comprehensive Role-Based Access Control (RBAC) system.

-   **Backend:** NestJS (Node.js) application located in `apps/api`.
-   **Frontend:** React application located in `web` (Note: strictly at the root `web/` folder, not `apps/web/`).
-   **Database:** PostgreSQL (using `pgvector` image) managed via TypeORM.
-   **Infrastructure:** Docker Compose for local database.

## Technology Stack

### Backend (`apps/api`)
-   **Framework:** NestJS 11
-   **Language:** TypeScript
-   **Database:** PostgreSQL 15 (via `pgvector/pgvector` image)
-   **ORM:** TypeORM
-   **Authentication:** JWT (Passport), BCrypt
-   **Authorization:** CASL (RBAC), Custom Guards
-   **Documentation:** Swagger/OpenAPI (`/api/docs`)
-   **AI Integration:** OpenAI SDK

### Frontend (`web`)
-   **Framework:** React 19
-   **Build Tool:** Vite
-   **Styling:** Tailwind CSS v4, Radix UI (Primitives), Lucide React (Icons)
-   **State/Data Fetching:** TanStack Query (React Query)
-   **Forms:** React Hook Form + Zod
-   **Testing:** Vitest, Playwright (E2E)

### Shared Libraries (`libs/`)
-   `auth`: Authentication logic
-   `rbac`: RBAC system definitions
-   `common`: Shared utilities and DTOs
-   `modules`: Business logic modules (e.g., `simple-text`)

## Architecture & Core Concepts

### Role-Based Access Control (RBAC)
The system defines three primary roles:
1.  **ADMIN:** System administrator. Manages tenants (companies) and system-wide modules. No access to business data.
2.  **COMPANY_OWNER:** Tenant admin. Manages employees and assigns module permissions.
3.  **EMPLOYEE:** End-user. Access is limited by permissions granted by the Company Owner.

### Modular Design
The application is built to be extensible via modules.
-   **Registration:** Modules are registered in the system (slug, name).
-   **Assignment:** Companies are granted access to modules.
-   **Permissions:** Employees are granted specific permissions (`read`, `write`, `delete`) within those modules.

## Development Workflow

### Prerequisites
-   Node.js (v20+ recommended)
-   Docker & Docker Compose

### Setup
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start Database:**
    ```bash
    docker-compose up -d
    ```
3.  **Environment Variables:**
    Ensure `.env` exists (see `.env.example`).
4.  **Seed Database (Local Dev):**
    ```bash
    npm run seed
    ```

### Running the Project
-   **Start All (Parallel):**
    ```bash
    npm run dev
    ```
-   **Start Backend Only:**
    ```bash
    npm run serve
    # OR
    nx serve api
    ```
-   **Start Frontend Only:**
    ```bash
    npm run serve:web
    # OR
    nx serve web
    ```

### Building
-   **Backend:** `npm run build`
-   **Frontend:** `npm run build:web`

### Testing
-   **Unit Tests (API):** `npm run test`
-   **Unit Tests (Web):** `npm run test:web`
-   **E2E Tests:** `npm run test:e2e`
-   **Linting:** `npm run lint` / `npm run lint:web`

## Directory Structure Quirk
*   **Important:** The frontend application is located at `./web/`, **NOT** inside `./apps/web/`. The backend is standard at `./apps/api/`.

## Key Files for Context
-   `docs/ARCHITECTURE_GUIDE.md`: Detailed system architecture.
-   `apps/api/src/main.ts`: Backend entry point.
-   `web/vite.config.ts`: Frontend build configuration.
-   `docker-compose.yml`: Database service definition.
