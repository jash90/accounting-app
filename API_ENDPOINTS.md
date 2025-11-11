# Accounting API - Complete Endpoint Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication & Authorization](#authentication--authorization)
4. [Endpoint Reference](#endpoint-reference)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [Admin - User Management](#admin-user-management)
   - [Admin - Company Management](#admin-company-management)
   - [Admin - Module Management](#admin-module-management)
   - [Admin - Company Module Access](#admin-company-module-access)
   - [Company - Employee Management](#company-employee-management)
   - [Company - Module Management](#company-module-management)
   - [Company - Employee Permissions](#company-employee-permissions)
   - [Simple Text Module](#simple-text-module)
5. [Data Models](#data-models)
6. [RBAC System](#rbac-system)
7. [Security](#security)
8. [Common Workflows](#common-workflows)
9. [Error Reference](#error-reference)
10. [Environment Configuration](#environment-configuration)
11. [Development Notes](#development-notes)

---

## Introduction

This is a comprehensive NestJS-based accounting system implementing a sophisticated multi-tenant RBAC (Role-Based Access Control) architecture with modular business functionality. The system manages three distinct user roles with granular permissions across company-specific modules.

### Key Features

- **Multi-tenant Architecture**: Complete data isolation per company
- **Role-Based Access Control**: Three-tier role hierarchy (ADMIN, COMPANY_OWNER, EMPLOYEE)
- **Modular System**: Pluggable business modules with granular permissions
- **JWT Authentication**: Access and refresh token pattern
- **Comprehensive Validation**: Request validation using class-validator
- **Swagger Documentation**: Auto-generated API documentation
- **Soft Deletes**: Audit trail preservation
- **TypeScript**: Full type safety throughout the application

### Architecture

- **Framework**: NestJS v11
- **Build System**: Nx Monorepo
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

---

## Getting Started

### Base URLs

- **Development**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

### Quick Start

1. **Register a user**:
```bash
POST /auth/register
```

2. **Login to get tokens**:
```bash
POST /auth/login
```

3. **Use access token in subsequent requests**:
```bash
Authorization: Bearer <access_token>
```

4. **Refresh token when expired**:
```bash
POST /auth/refresh
```

---

## Authentication & Authorization

### JWT Token System

The API uses a dual-token system:

- **Access Token**: Short-lived token for API requests (1 hour)
- **Refresh Token**: Long-lived token for refreshing access tokens (7 days)

**Token Format**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role Hierarchy

```
ADMIN
  └── Full system access
  └── User, company, and module management
  └── Cannot access business data (e.g., simple-text records)

COMPANY_OWNER
  └── Manages their company
  └── Creates and manages employees
  └── Grants module access to employees
  └── Full access to company's business data

EMPLOYEE
  └── Limited access based on permissions
  └── Can only access modules explicitly granted
  └── Permissions: read, write, delete
```

### Permission System

Permissions are module-specific and granular:

- **read**: View data
- **write**: Create and update data
- **delete**: Delete data

**Permission Inheritance**:
- ADMIN: All permissions (except business data access)
- COMPANY_OWNER: Full permissions on enabled modules
- EMPLOYEE: Only explicitly granted permissions

---

## Endpoint Reference

### Total Endpoints: 47

- **Public**: 4 endpoints (Health + Auth)
- **Admin**: 23 endpoints
- **Company Owner**: 14 endpoints
- **Module**: 5 endpoints (Simple Text)
- **HTTP Methods**: GET, POST, PATCH, DELETE

---

## Health Check

### GET `/`

**Purpose**: Health check endpoint to verify API is running

**Authorization**: Public (no authentication required)

**Response**:
```json
{
  "message": "Hello API"
}
```

**Use Cases**:
- Server health monitoring
- Load balancer health checks
- Uptime verification

---

## Authentication Endpoints

### POST `/auth/register`

**Purpose**: Register a new user in the system with role-based company association

**Authorization**: Public

**Request Body**:
```typescript
{
  email: string             // Valid email, auto-lowercased and trimmed
  password: string          // Minimum 8 characters
  firstName: string         // User's first name
  lastName: string          // User's last name
  role: "ADMIN" | "COMPANY_OWNER" | "EMPLOYEE"
  companyId?: string        // UUID, required for COMPANY_OWNER & EMPLOYEE
}
```

**Validation Rules**:
- `email`: Must be valid email format, automatically transformed to lowercase and trimmed
- `password`: Minimum length 8 characters
- `role`: Must be one of the enum values (ADMIN, COMPANY_OWNER, EMPLOYEE)
- `companyId`: Required when role is COMPANY_OWNER or EMPLOYEE

**Business Logic**:
1. Performs case-insensitive email uniqueness check using `LOWER(email)` query
2. If `companyId` provided, verifies company exists in database
3. Validates role-based requirements:
   - COMPANY_OWNER and EMPLOYEE must have valid companyId
   - ADMIN cannot have companyId
4. Hashes password using bcrypt with 10 salt rounds
5. Creates user with `isActive: true` by default
6. Generates JWT access and refresh tokens
7. Returns authentication response with tokens and user data

**Success Response** (201 Created):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Error Responses**:

**409 Conflict** - User already exists:
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**400 Bad Request** - Validation error:
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters",
    "role must be one of the following values: ADMIN, COMPANY_OWNER, EMPLOYEE"
  ],
  "error": "Bad Request"
}
```

**400 Bad Request** - Company not found:
```json
{
  "statusCode": 400,
  "message": "Company not found",
  "error": "Bad Request"
}
```

**400 Bad Request** - Missing companyId:
```json
{
  "statusCode": 400,
  "message": "CompanyId is required for COMPANY_OWNER and EMPLOYEE roles",
  "error": "Bad Request"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### POST `/auth/login`

**Purpose**: Authenticate user with email and password, returning JWT tokens

**Authorization**: Public

**Request Body**:
```typescript
{
  email: string      // User's email, auto-lowercased and trimmed
  password: string   // User's password (plaintext)
}
```

**Business Logic**:
1. Performs case-insensitive email lookup using `LOWER(email)` query
2. Compares provided password with hashed password using bcrypt
3. Checks if user account is active (`isActive: true`)
4. If all checks pass, generates new JWT access and refresh tokens
5. Returns authentication response with tokens and user data

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Error Responses**:

**401 Unauthorized** - Invalid credentials:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**401 Unauthorized** - Account inactive:
```json
{
  "statusCode": 401,
  "message": "User account is not active",
  "error": "Unauthorized"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

### POST `/auth/refresh`

**Purpose**: Refresh access token using a valid refresh token

**Authorization**: Public (requires valid refresh token in request body)

**Request Body**:
```typescript
{
  refresh_token: string   // Valid JWT refresh token
}
```

**Business Logic**:
1. Verifies refresh token signature and expiration
2. Extracts user ID from token payload (`sub` field)
3. Looks up user by ID
4. Verifies user still exists and is active
5. Generates new JWT access and refresh tokens
6. Returns new authentication response

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Error Responses**:

**401 Unauthorized** - Invalid or expired token:
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

**401 Unauthorized** - User not found:
```json
{
  "statusCode": 401,
  "message": "User not found",
  "error": "Unauthorized"
}
```

**401 Unauthorized** - User inactive:
```json
{
  "statusCode": 401,
  "message": "User account is not active",
  "error": "Unauthorized"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Security Notes**:
- Refresh tokens should be stored securely (HttpOnly cookies recommended)
- Current implementation uses same secret for access and refresh tokens (should be separated in production)
- Consider implementing refresh token rotation for enhanced security

---

## Admin User Management

All endpoints in this section require:
- **Authentication**: JWT Bearer token
- **Authorization**: User must have `ADMIN` role

### GET `/admin/users`

**Purpose**: List all users in the system

**Authorization**: ADMIN role required

**Query Parameters**: None

**Business Logic**:
1. Fetches all users from database
2. Includes related company information
3. Orders results by `createdAt` descending (newest first)

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@system.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN",
    "companyId": null,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "company": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "owner@company.com",
    "firstName": "Company",
    "lastName": "Owner",
    "role": "COMPANY_OWNER",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true,
    "createdAt": "2024-01-15T09:20:00.000Z",
    "updatedAt": "2024-01-15T09:20:00.000Z",
    "company": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Acme Corporation",
      "isActive": true
    }
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### GET `/admin/users/:id`

**Purpose**: Get detailed information about a specific user

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): User ID

**Business Logic**:
1. Looks up user by ID
2. Includes related company information
3. Returns 404 if user not found

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "owner@company.com",
  "firstName": "Company",
  "lastName": "Owner",
  "role": "COMPANY_OWNER",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T09:20:00.000Z",
  "updatedAt": "2024-01-15T09:20:00.000Z",
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Acme Corporation",
    "ownerId": "550e8400-e29b-41d4-a716-446655440001",
    "isActive": true
  }
}
```

**Error Responses**:

**404 Not Found** - User doesn't exist:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/users/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### POST `/admin/users`

**Purpose**: Create a new user (admin operation)

**Authorization**: ADMIN role required

**Request Body**:
```typescript
{
  email: string             // Valid email, auto-lowercased and trimmed
  password: string          // Minimum 8 characters
  firstName: string         // User's first name
  lastName: string          // User's last name
  role: "ADMIN" | "COMPANY_OWNER" | "EMPLOYEE"
  companyId?: string        // UUID, required for COMPANY_OWNER & EMPLOYEE
  isActive?: boolean        // Optional, defaults to true
}
```

**Validation Rules**:
- Same as `/auth/register` endpoint
- Additional optional `isActive` field to control account status on creation

**Business Logic**:
1. Same validation as register endpoint
2. Allows admin to set `isActive` status directly
3. Password hashed with bcrypt
4. Creates user in database
5. Returns created user object

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "email": "newuser@company.com",
  "firstName": "New",
  "lastName": "User",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**Error Responses**:

**409 Conflict** - Email already exists:
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**400 Bad Request** - Company not found:
```json
{
  "statusCode": 400,
  "message": "Company not found",
  "error": "Bad Request"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "User",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true
  }'
```

---

### PATCH `/admin/users/:id`

**Purpose**: Update user details

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): User ID to update

**Request Body** (all fields optional):
```typescript
{
  email?: string            // Valid email, must be unique
  password?: string         // Minimum 8 characters, will be hashed
  firstName?: string
  lastName?: string
  role?: "ADMIN" | "COMPANY_OWNER" | "EMPLOYEE"
  companyId?: string        // UUID
  isActive?: boolean
}
```

**Business Logic**:
1. Looks up user by ID
2. If email provided, checks uniqueness (case-insensitive)
3. If password provided, hashes with bcrypt before saving
4. Performs partial update (only provided fields)
5. Validates companyId if provided
6. Returns updated user object

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "updated@company.com",
  "firstName": "Updated",
  "lastName": "Name",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T09:20:00.000Z",
  "updatedAt": "2024-01-15T12:30:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - User doesn't exist:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**409 Conflict** - Email already taken:
```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/admin/users/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "isActive": false
  }'
```

---

### DELETE `/admin/users/:id`

**Purpose**: Soft delete a user (deactivate account)

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): User ID to delete

**Business Logic**:
1. Looks up user by ID
2. Sets `isActive = false` (soft delete)
3. Preserves all user data for audit trail
4. User cannot login after deletion
5. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - User doesn't exist:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/admin/users/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <admin_access_token>"
```

**Note**: This is a soft delete operation. The user record remains in the database with `isActive: false`. To restore access, use the activate endpoint.

---

### PATCH `/admin/users/:id/activate`

**Purpose**: Activate or deactivate a user account

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): User ID

**Query Parameters**:
- `isActive` (boolean): `true` to activate, `false` to deactivate

**Business Logic**:
1. Looks up user by ID
2. Updates `isActive` field with provided value
3. Returns updated user object

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "user@company.com",
  "firstName": "User",
  "lastName": "Name",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T09:20:00.000Z",
  "updatedAt": "2024-01-15T12:45:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - User doesn't exist:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Example Requests**:

Activate user:
```bash
curl -X PATCH "http://localhost:3000/admin/users/550e8400-e29b-41d4-a716-446655440001/activate?isActive=true" \
  -H "Authorization: Bearer <admin_access_token>"
```

Deactivate user:
```bash
curl -X PATCH "http://localhost:3000/admin/users/550e8400-e29b-41d4-a716-446655440001/activate?isActive=false" \
  -H "Authorization: Bearer <admin_access_token>"
```

---

## Admin Company Management

### GET `/admin/companies`

**Purpose**: List all companies in the system

**Authorization**: ADMIN role required

**Business Logic**:
1. Fetches all companies
2. Includes owner and employees relations
3. Returns complete company information

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Acme Corporation",
    "ownerId": "550e8400-e29b-41d4-a716-446655440001",
    "isActive": true,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z",
    "owner": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "owner@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "COMPANY_OWNER"
    },
    "employees": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "email": "employee@acme.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "role": "EMPLOYEE"
      }
    ]
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/companies \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### GET `/admin/companies/:id`

**Purpose**: Get detailed information about a specific company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID

**Business Logic**:
1. Looks up company by ID
2. Includes owner and employees relations
3. Returns 404 if company not found

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "Acme Corporation",
  "ownerId": "550e8400-e29b-41d4-a716-446655440001",
  "isActive": true,
  "createdAt": "2024-01-15T08:00:00.000Z",
  "updatedAt": "2024-01-15T08:00:00.000Z",
  "owner": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "owner@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "COMPANY_OWNER",
    "isActive": true
  },
  "employees": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "email": "employee@acme.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "EMPLOYEE",
      "isActive": true
    }
  ]
}
```

**Error Responses**:

**404 Not Found** - Company doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### POST `/admin/companies`

**Purpose**: Create a new company

**Authorization**: ADMIN role required

**Request Body**:
```typescript
{
  name: string        // Company name
  ownerId: string     // UUID of existing user with COMPANY_OWNER role
}
```

**Validation Rules**:
- `name`: Required, non-empty string
- `ownerId`: Must be valid UUID of existing user with COMPANY_OWNER role

**Business Logic**:
1. Validates that owner user exists
2. Verifies user has COMPANY_OWNER role
3. Creates company with `isActive: true`
4. Associates owner with company
5. Returns created company object

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "name": "New Company Inc",
  "ownerId": "550e8400-e29b-41d4-a716-446655440001",
  "isActive": true,
  "createdAt": "2024-01-15T14:00:00.000Z",
  "updatedAt": "2024-01-15T14:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Owner user doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Owner user not found",
  "error": "Not Found"
}
```

**400 Bad Request** - User is not company owner:
```json
{
  "statusCode": 400,
  "message": "User must have COMPANY_OWNER role",
  "error": "Bad Request"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/admin/companies \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company Inc",
    "ownerId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

---

### PATCH `/admin/companies/:id`

**Purpose**: Update company details

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID to update

**Request Body** (all fields optional):
```typescript
{
  name?: string          // New company name
  isActive?: boolean     // Activation status
}
```

**Business Logic**:
1. Looks up company by ID
2. Performs partial update
3. Returns updated company object

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "Updated Company Name",
  "ownerId": "550e8400-e29b-41d4-a716-446655440001",
  "isActive": true,
  "createdAt": "2024-01-15T08:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Company doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name"
  }'
```

---

### DELETE `/admin/companies/:id`

**Purpose**: Soft delete a company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID to delete

**Business Logic**:
1. Looks up company by ID
2. Sets `isActive = false` (soft delete)
3. Preserves company data and relationships
4. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - Company doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer <admin_access_token>"
```

**Note**: Soft delete preserves audit trail. Related employees and data remain in database but company becomes inactive.

---

### GET `/admin/companies/:id/employees`

**Purpose**: Get all employees of a specific company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID

**Business Logic**:
1. Looks up company by ID
2. Fetches all users with `companyId = :id` and `role = EMPLOYEE`
3. Returns array of employee records

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "email": "employee1@acme.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "email": "employee2@acme.com",
    "firstName": "Bob",
    "lastName": "Johnson",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

**Error Responses**:

**404 Not Found** - Company doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010/employees \
  -H "Authorization: Bearer <admin_access_token>"
```

---

## Admin Module Management

### GET `/admin/modules`

**Purpose**: List all available modules in the system

**Authorization**: ADMIN role required

**Business Logic**:
1. Fetches all modules from database
2. Returns array of module records

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "name": "Simple Text",
    "slug": "simple-text",
    "description": "Basic text management module for accounting notes",
    "isActive": true,
    "createdAt": "2024-01-10T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "name": "Invoicing",
    "slug": "invoicing",
    "description": "Invoice creation and management",
    "isActive": true,
    "createdAt": "2024-01-10T10:05:00.000Z"
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/modules \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### GET `/admin/modules/:id`

**Purpose**: Get detailed information about a specific module

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Module ID

**Business Logic**:
1. Looks up module by ID
2. Returns module details
3. Returns 404 if not found

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "name": "Simple Text",
  "slug": "simple-text",
  "description": "Basic text management module for accounting notes",
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Module doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Module not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/modules/550e8400-e29b-41d4-a716-446655440100 \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### POST `/admin/modules`

**Purpose**: Create a new module

**Authorization**: ADMIN role required

**Request Body**:
```typescript
{
  name: string             // Module display name
  slug: string             // Unique identifier (kebab-case recommended)
  description?: string     // Optional module description
}
```

**Validation Rules**:
- `name`: Required, non-empty string
- `slug`: Required, must be unique across all modules
- `description`: Optional string

**Business Logic**:
1. Validates slug uniqueness at database level
2. Creates module with `isActive: true` by default
3. Returns created module object

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440105",
  "name": "Expense Tracking",
  "slug": "expense-tracking",
  "description": "Track and categorize business expenses",
  "isActive": true,
  "createdAt": "2024-01-15T15:00:00.000Z"
}
```

**Error Responses**:

**409 Conflict** - Slug already exists:
```json
{
  "statusCode": 409,
  "message": "Module with this slug already exists",
  "error": "Conflict"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/admin/modules \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Expense Tracking",
    "slug": "expense-tracking",
    "description": "Track and categorize business expenses"
  }'
```

---

### PATCH `/admin/modules/:id`

**Purpose**: Update module details

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Module ID to update

**Request Body** (all fields optional):
```typescript
{
  name?: string
  slug?: string
  description?: string
}
```

**Business Logic**:
1. Looks up module by ID
2. If slug provided, validates uniqueness
3. Performs partial update
4. Returns updated module object

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "name": "Updated Module Name",
  "slug": "simple-text",
  "description": "Updated description",
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Module doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Module not found",
  "error": "Not Found"
}
```

**409 Conflict** - Slug already taken:
```json
{
  "statusCode": 409,
  "message": "Module with this slug already exists",
  "error": "Conflict"
}
```

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/admin/modules/550e8400-e29b-41d4-a716-446655440100 \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

---

## Admin Company Module Access

### GET `/admin/companies/:id/modules`

**Purpose**: Get all modules assigned to a specific company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID

**Business Logic**:
1. Looks up company by ID
2. Fetches all `CompanyModuleAccess` records for company
3. Includes module details
4. Returns array of module access records

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "moduleId": "550e8400-e29b-41d4-a716-446655440100",
    "isEnabled": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "module": {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "name": "Simple Text",
      "slug": "simple-text",
      "description": "Basic text management module",
      "isActive": true
    }
  }
]
```

**Error Responses**:

**404 Not Found** - Company doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010/modules \
  -H "Authorization: Bearer <admin_access_token>"
```

---

### POST `/admin/companies/:id/modules/:moduleId`

**Purpose**: Grant module access to a company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID
- `moduleId` (string, UUID): Module ID to grant

**Business Logic**:
1. Validates company exists
2. Validates module exists
3. Creates or updates `CompanyModuleAccess` record
4. Sets `isEnabled = true` (idempotent operation)
5. Returns created/updated access record

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440201",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "moduleId": "550e8400-e29b-41d4-a716-446655440101",
  "isEnabled": true,
  "createdAt": "2024-01-15T16:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Company or module doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Company or module not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010/modules/550e8400-e29b-41d4-a716-446655440101 \
  -H "Authorization: Bearer <admin_access_token>"
```

**Note**: This operation is idempotent - calling it multiple times has the same effect as calling it once.

---

### DELETE `/admin/companies/:id/modules/:moduleId`

**Purpose**: Revoke module access from a company

**Authorization**: ADMIN role required

**Path Parameters**:
- `id` (string, UUID): Company ID
- `moduleId` (string, UUID): Module ID to revoke

**Business Logic**:
1. Finds `CompanyModuleAccess` record
2. Sets `isEnabled = false` (soft revoke)
3. Cascades to employee permissions (employees lose access)
4. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - Company, module, or access record doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Module access not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/admin/companies/550e8400-e29b-41d4-a716-446655440010/modules/550e8400-e29b-41d4-a716-446655440101 \
  -H "Authorization: Bearer <admin_access_token>"
```

**Note**: This is a soft revoke. The access record is preserved but disabled. All employees of the company automatically lose access to this module.

---

## Company Employee Management

All endpoints in this section require:
- **Authentication**: JWT Bearer token
- **Authorization**: User must have `COMPANY_OWNER` role
- **Scope**: Operations limited to owner's company
- **Guards**: `RolesGuard` and `OwnerOrAdminGuard`

### GET `/company/employees`

**Purpose**: Get all employees in the company owner's company

**Authorization**: COMPANY_OWNER role required

**Business Logic**:
1. Extracts `companyId` from JWT token
2. Fetches all users with matching companyId and role = EMPLOYEE
3. Returns array of employee records

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "email": "employee1@acme.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "email": "employee2@acme.com",
    "firstName": "Bob",
    "lastName": "Johnson",
    "role": "EMPLOYEE",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/company/employees \
  -H "Authorization: Bearer <owner_access_token>"
```

---

### GET `/company/employees/:id`

**Purpose**: Get specific employee details

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID

**Business Logic**:
1. Looks up user by ID
2. Verifies user belongs to owner's company
3. Verifies user has EMPLOYEE role
4. Returns employee details

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "email": "employee@acme.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Employee doesn't exist or doesn't belong to company:
```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020 \
  -H "Authorization: Bearer <owner_access_token>"
```

---

### POST `/company/employees`

**Purpose**: Create a new employee in the company

**Authorization**: COMPANY_OWNER role required

**Request Body**:
```typescript
{
  email: string           // Valid email, auto-lowercased and trimmed
  password: string        // Minimum 8 characters
  firstName: string       // Employee's first name
  lastName: string        // Employee's last name
}
```

**Validation Rules**:
- `email`: Must be valid email format, unique across system
- `password`: Minimum 8 characters
- `firstName`: Required, non-empty string
- `lastName`: Required, non-empty string

**Business Logic**:
1. Validates email uniqueness (case-insensitive)
2. Auto-assigns `role = EMPLOYEE`
3. Auto-assigns `companyId` from owner's JWT token
4. Auto-assigns `isActive = true`
5. Hashes password with bcrypt (10 salt rounds)
6. Creates employee record
7. Returns created employee object

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440025",
  "email": "newemployee@acme.com",
  "firstName": "New",
  "lastName": "Employee",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T16:30:00.000Z",
  "updatedAt": "2024-01-15T16:30:00.000Z"
}
```

**Error Responses**:

**409 Conflict** - Email already exists:
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**400 Bad Request** - Validation error:
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/company/employees \
  -H "Authorization: Bearer <owner_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemployee@acme.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "Employee"
  }'
```

---

### PATCH `/company/employees/:id`

**Purpose**: Update employee details

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID to update

**Request Body** (all fields optional):
```typescript
{
  email?: string            // Valid email, must be unique
  password?: string         // Minimum 8 characters, will be hashed
  firstName?: string
  lastName?: string
}
```

**Business Logic**:
1. Looks up employee by ID
2. Verifies employee belongs to owner's company
3. If email provided, validates uniqueness (case-insensitive)
4. If password provided, hashes with bcrypt
5. Performs partial update
6. Returns updated employee object

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "email": "updated@acme.com",
  "firstName": "Updated",
  "lastName": "Name",
  "role": "EMPLOYEE",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "isActive": true,
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T17:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Employee doesn't exist or doesn't belong to company:
```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

**409 Conflict** - Email already in use:
```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020 \
  -H "Authorization: Bearer <owner_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

---

### DELETE `/company/employees/:id`

**Purpose**: Soft delete an employee

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID to delete

**Business Logic**:
1. Looks up employee by ID
2. Verifies employee belongs to owner's company
3. Sets `isActive = false` (soft delete)
4. Preserves employee data and history
5. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - Employee doesn't exist or doesn't belong to company:
```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020 \
  -H "Authorization: Bearer <owner_access_token>"
```

**Note**: This is a soft delete. Employee record is preserved with `isActive: false`. Employee cannot login after deletion.

---

## Company Module Management

### GET `/company/modules`

**Purpose**: Get all modules available to the company owner's company

**Authorization**: COMPANY_OWNER role required

**Business Logic**:
1. Extracts user ID from JWT token
2. Calls `RBACService.getAvailableModules(userId)`
3. Returns modules where `CompanyModuleAccess.isEnabled = true`

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "name": "Simple Text",
    "slug": "simple-text",
    "description": "Basic text management module for accounting notes",
    "isActive": true,
    "createdAt": "2024-01-10T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "name": "Invoicing",
    "slug": "invoicing",
    "description": "Invoice creation and management",
    "isActive": true,
    "createdAt": "2024-01-10T10:05:00.000Z"
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/company/modules \
  -H "Authorization: Bearer <owner_access_token>"
```

---

### GET `/company/modules/:slug`

**Purpose**: Get detailed information about a specific module by slug

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `slug` (string): Module slug (e.g., "simple-text")

**Business Logic**:
1. Looks up module by slug
2. Verifies module is enabled for owner's company
3. Returns module details

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "name": "Simple Text",
  "slug": "simple-text",
  "description": "Basic text management module for accounting notes",
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Module doesn't exist or not available to company:
```json
{
  "statusCode": 404,
  "message": "Module not found or not available",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/company/modules/simple-text \
  -H "Authorization: Bearer <owner_access_token>"
```

---

## Company Employee Permissions

### GET `/company/employees/:id/modules`

**Purpose**: List all modules assigned to a specific employee with their permissions

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID

**Business Logic**:
1. Verifies employee belongs to owner's company
2. Fetches all `UserModulePermission` records for employee
3. Includes module details
4. Returns array of permission records

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "userId": "550e8400-e29b-41d4-a716-446655440020",
    "moduleId": "550e8400-e29b-41d4-a716-446655440100",
    "permissions": ["read", "write"],
    "grantedById": "550e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "module": {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "name": "Simple Text",
      "slug": "simple-text",
      "description": "Basic text management module"
    },
    "grantedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "owner@acme.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
]
```

**Error Responses**:

**404 Not Found** - Employee doesn't exist or doesn't belong to company:
```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020/modules \
  -H "Authorization: Bearer <owner_access_token>"
```

---

### POST `/company/employees/:id/modules/:slug`

**Purpose**: Grant module access to an employee with specific permissions

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID
- `slug` (string): Module slug (e.g., "simple-text")

**Request Body**:
```typescript
{
  permissions: string[]    // Array of permissions: ["read", "write", "delete"]
}
```

**Validation Rules**:
- `permissions`: Required, array of strings
- Valid permissions: "read", "write", "delete"

**Business Logic**:
1. Verifies employee belongs to owner's company
2. Verifies module exists and is enabled for company
3. Checks that owner has access to the module
4. Creates or updates `UserModulePermission` record (upsert)
5. Records `grantedById` as current owner
6. Returns created/updated permission record

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440301",
  "userId": "550e8400-e29b-41d4-a716-446655440020",
  "moduleId": "550e8400-e29b-41d4-a716-446655440100",
  "permissions": ["read", "write"],
  "grantedById": "550e8400-e29b-41d4-a716-446655440001",
  "createdAt": "2024-01-15T17:30:00.000Z"
}
```

**Error Responses**:

**404 Not Found** - Employee or module doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Employee or module not found",
  "error": "Not Found"
}
```

**403 Forbidden** - Owner doesn't have access to module:
```json
{
  "statusCode": 403,
  "message": "You don't have access to this module",
  "error": "Forbidden"
}
```

**403 Forbidden** - Module not enabled for company:
```json
{
  "statusCode": 403,
  "message": "Module not available for your company",
  "error": "Forbidden"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020/modules/simple-text \
  -H "Authorization: Bearer <owner_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["read", "write"]
  }'
```

**Note**: This operation is idempotent - calling it multiple times with same permissions updates the existing record.

---

### PATCH `/company/employees/:id/modules/:slug`

**Purpose**: Update employee module permissions

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID
- `slug` (string): Module slug

**Request Body**:
```typescript
{
  permissions: string[]    // New array of permissions
}
```

**Business Logic**:
Delegates to the POST endpoint (same operation - upsert behavior)

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440301",
  "userId": "550e8400-e29b-41d4-a716-446655440020",
  "moduleId": "550e8400-e29b-41d4-a716-446655440100",
  "permissions": ["read", "write", "delete"],
  "grantedById": "550e8400-e29b-41d4-a716-446655440001",
  "createdAt": "2024-01-15T17:30:00.000Z"
}
```

**Error Responses**: Same as POST endpoint

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020/modules/simple-text \
  -H "Authorization: Bearer <owner_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["read", "write", "delete"]
  }'
```

---

### DELETE `/company/employees/:id/modules/:slug`

**Purpose**: Revoke module access from an employee

**Authorization**: COMPANY_OWNER role required

**Path Parameters**:
- `id` (string, UUID): Employee ID
- `slug` (string): Module slug to revoke

**Business Logic**:
1. Verifies employee belongs to owner's company
2. Looks up module by slug
3. Finds and deletes `UserModulePermission` record (hard delete)
4. Employee immediately loses access to module
5. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - Employee, module, or permission record doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Permission not found",
  "error": "Not Found"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/company/employees/550e8400-e29b-41d4-a716-446655440020/modules/simple-text \
  -H "Authorization: Bearer <owner_access_token>"
```

**Note**: This is a hard delete operation. The permission record is permanently removed from the database.

---

## Simple Text Module

All endpoints in this section require:
- **Authentication**: JWT Bearer token
- **Authorization**: Module access and specific permissions
- **Guards**: `ModuleAccessGuard`, `PermissionGuard`
- **Module**: `simple-text`
- **Scope**: Multi-tenant data isolation by `companyId`

### GET `/modules/simple-text`

**Purpose**: List all text entries for the user's company

**Authorization**:
- Module access to "simple-text" required
- Permission: `read`

**Business Logic**:
1. Extracts `companyId` from JWT token
2. **Admin restriction**: ADMIN users cannot access business data
3. Fetches all SimpleText records where `companyId` matches
4. Orders by `createdAt` descending (newest first)
5. Includes `createdBy` user and `company` relations
6. Returns array of text entries

**Success Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440500",
    "content": "This is a sample accounting note for Q1 2024.",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "createdById": "550e8400-e29b-41d4-a716-446655440020",
    "createdAt": "2024-01-15T15:00:00.000Z",
    "updatedAt": "2024-01-15T15:00:00.000Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "email": "employee@acme.com",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "company": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Acme Corporation"
    }
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440501",
    "content": "Updated tax documentation requirements.",
    "companyId": "550e8400-e29b-41d4-a716-446655440010",
    "createdById": "550e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2024-01-14T10:30:00.000Z",
    "updatedAt": "2024-01-14T10:30:00.000Z",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "owner@acme.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "company": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Acme Corporation"
    }
  }
]
```

**Error Responses**:

**403 Forbidden** - No module access:
```json
{
  "statusCode": 403,
  "message": "Access denied to module: simple-text",
  "error": "Forbidden"
}
```

**403 Forbidden** - No read permission:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation",
  "error": "Forbidden"
}
```

**403 Forbidden** - Admin trying to access business data:
```json
{
  "statusCode": 403,
  "message": "Admins cannot access business data",
  "error": "Forbidden"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/modules/simple-text \
  -H "Authorization: Bearer <user_access_token>"
```

---

### GET `/modules/simple-text/:id`

**Purpose**: Get a specific text entry by ID

**Authorization**:
- Module access to "simple-text" required
- Permission: `read`

**Path Parameters**:
- `id` (string, UUID): Text entry ID

**Business Logic**:
1. Looks up SimpleText record by ID
2. **Company isolation**: Verifies `text.companyId === user.companyId`
3. Prevents cross-company data access
4. Includes `createdBy` and `company` relations
5. Returns text entry details

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440500",
  "content": "This is a sample accounting note for Q1 2024.",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "createdById": "550e8400-e29b-41d4-a716-446655440020",
  "createdAt": "2024-01-15T15:00:00.000Z",
  "updatedAt": "2024-01-15T15:00:00.000Z",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "email": "employee@acme.com",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Acme Corporation"
  }
}
```

**Error Responses**:

**404 Not Found** - Text doesn't exist:
```json
{
  "statusCode": 404,
  "message": "SimpleText not found",
  "error": "Not Found"
}
```

**403 Forbidden** - Access denied (different company):
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

**403 Forbidden** - No module access or read permission:
```json
{
  "statusCode": 403,
  "message": "Access denied to module: simple-text",
  "error": "Forbidden"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/modules/simple-text/550e8400-e29b-41d4-a716-446655440500 \
  -H "Authorization: Bearer <user_access_token>"
```

---

### POST `/modules/simple-text`

**Purpose**: Create a new text entry

**Authorization**:
- Module access to "simple-text" required
- Permission: `write`

**Request Body**:
```typescript
{
  content: string    // Text content, min 1 character, max 5000 characters
}
```

**Validation Rules**:
- `content`: Required, minimum length 1, maximum length 5000 characters

**Business Logic**:
1. Validates content length
2. Auto-assigns `companyId` from user's JWT token
3. Auto-assigns `createdById` as current user ID
4. Timestamps auto-generated by TypeORM
5. Saves to database
6. Returns created text entry with relations

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440505",
  "content": "New accounting note created by employee.",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "createdById": "550e8400-e29b-41d4-a716-446655440020",
  "createdAt": "2024-01-15T18:00:00.000Z",
  "updatedAt": "2024-01-15T18:00:00.000Z",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "email": "employee@acme.com",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Acme Corporation"
  }
}
```

**Error Responses**:

**400 Bad Request** - Validation error:
```json
{
  "statusCode": 400,
  "message": [
    "content must be longer than or equal to 1 characters",
    "content must be shorter than or equal to 5000 characters"
  ],
  "error": "Bad Request"
}
```

**403 Forbidden** - No write permission:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation",
  "error": "Forbidden"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/modules/simple-text \
  -H "Authorization: Bearer <user_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "New accounting note for January 2024 tax preparation."
  }'
```

---

### PATCH `/modules/simple-text/:id`

**Purpose**: Update an existing text entry

**Authorization**:
- Module access to "simple-text" required
- Permission: `write`

**Path Parameters**:
- `id` (string, UUID): Text entry ID to update

**Request Body**:
```typescript
{
  content?: string    // Updated text content, min 1, max 5000 characters
}
```

**Validation Rules**:
- `content`: Optional, but if provided: min 1, max 5000 characters

**Business Logic**:
1. Looks up text entry by ID (reuses `findOne` for company isolation)
2. Verifies text belongs to user's company
3. Validates content length if provided
4. Performs partial update
5. Updates `updatedAt` timestamp automatically
6. Returns updated text entry

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440500",
  "content": "Updated accounting note with new information.",
  "companyId": "550e8400-e29b-41d4-a716-446655440010",
  "createdById": "550e8400-e29b-41d4-a716-446655440020",
  "createdAt": "2024-01-15T15:00:00.000Z",
  "updatedAt": "2024-01-15T18:30:00.000Z",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "email": "employee@acme.com",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Acme Corporation"
  }
}
```

**Error Responses**:

**404 Not Found** - Text doesn't exist:
```json
{
  "statusCode": 404,
  "message": "SimpleText not found",
  "error": "Not Found"
}
```

**403 Forbidden** - Access denied (different company):
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

**403 Forbidden** - No write permission:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation",
  "error": "Forbidden"
}
```

**400 Bad Request** - Validation error:
```json
{
  "statusCode": 400,
  "message": [
    "content must be shorter than or equal to 5000 characters"
  ],
  "error": "Bad Request"
}
```

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/modules/simple-text/550e8400-e29b-41d4-a716-446655440500 \
  -H "Authorization: Bearer <user_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content with corrections."
  }'
```

---

### DELETE `/modules/simple-text/:id`

**Purpose**: Delete a text entry permanently

**Authorization**:
- Module access to "simple-text" required
- Permission: `delete`

**Path Parameters**:
- `id` (string, UUID): Text entry ID to delete

**Business Logic**:
1. Looks up text entry by ID
2. Verifies text belongs to user's company
3. Performs hard delete from database
4. Returns no content on success

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Responses**:

**404 Not Found** - Text doesn't exist:
```json
{
  "statusCode": 404,
  "message": "SimpleText not found",
  "error": "Not Found"
}
```

**403 Forbidden** - Access denied (different company):
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

**403 Forbidden** - No delete permission:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation",
  "error": "Forbidden"
}
```

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/modules/simple-text/550e8400-e29b-41d4-a716-446655440500 \
  -H "Authorization: Bearer <user_access_token>"
```

**Note**: This is a hard delete operation. The text entry is permanently removed from the database and cannot be recovered.

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   Company   │       │     User     │       │   Module    │
├─────────────┤       ├──────────────┤       ├─────────────┤
│ id (PK)     │◄──┐   │ id (PK)      │       │ id (PK)     │
│ name        │   └───┤ companyId(FK)│       │ name        │
│ ownerId(FK) ├───────┤ role         │       │ slug (UQ)   │
│ isActive    │       │ email (UQ)   │       │ description │
│ createdAt   │       │ password     │       │ isActive    │
│ updatedAt   │       │ firstName    │       │ createdAt   │
└─────────────┘       │ lastName     │       └─────────────┘
       │              │ isActive     │              │
       │              │ createdAt    │              │
       │              │ updatedAt    │              │
       │              └──────────────┘              │
       │                     │                      │
       │                     │                      │
       ▼                     ▼                      ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│CompanyModuleAcces│  │UserModulePermission  │  │   SimpleText     │
├──────────────────┤  ├──────────────────────┤  ├──────────────────┤
│ id (PK)          │  │ id (PK)              │  │ id (PK)          │
│ companyId (FK)   │  │ userId (FK)          │  │ companyId (FK)   │
│ moduleId (FK)    │  │ moduleId (FK)        │  │ content          │
│ isEnabled        │  │ permissions[]        │  │ createdById (FK) │
│ createdAt        │  │ grantedById (FK)     │  │ createdAt        │
└──────────────────┘  │ createdAt            │  │ updatedAt        │
  UQ: (company,       └──────────────────────┘  └──────────────────┘
      module)           UQ: (user, module)
```

### User Entity

**Table**: `users`

```typescript
interface User {
  id: string;                    // UUID (Primary Key)
  email: string;                 // Unique, lowercase
  password: string;              // Bcrypt hashed
  firstName: string;
  lastName: string;
  role: UserRole;                // ADMIN | COMPANY_OWNER | EMPLOYEE
  companyId: string | null;      // Foreign Key to Company (nullable for ADMIN)
  isActive: boolean;             // Default: true
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-updated

  // Relations
  company: Company | null;
  modulePermissions: UserModulePermission[];
}

enum UserRole {
  ADMIN = 'ADMIN',
  COMPANY_OWNER = 'COMPANY_OWNER',
  EMPLOYEE = 'EMPLOYEE'
}
```

**Indexes**:
- Primary: `id`
- Unique: `email`
- Foreign Key: `companyId` references `companies.id`

**Constraints**:
- Email must be unique (case-insensitive in queries)
- ADMIN role cannot have companyId
- COMPANY_OWNER and EMPLOYEE must have companyId

---

### Company Entity

**Table**: `companies`

```typescript
interface Company {
  id: string;                    // UUID (Primary Key)
  name: string;
  ownerId: string;               // Foreign Key to User
  isActive: boolean;             // Default: true
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-updated

  // Relations
  owner: User;
  employees: User[];
  moduleAccesses: CompanyModuleAccess[];
  simpleTexts: SimpleText[];
}
```

**Indexes**:
- Primary: `id`
- Foreign Key: `ownerId` references `users.id`

**Constraints**:
- Owner must have COMPANY_OWNER role

---

### Module Entity

**Table**: `modules`

```typescript
interface Module {
  id: string;                    // UUID (Primary Key)
  name: string;
  slug: string;                  // Unique identifier (kebab-case)
  description: string | null;
  isActive: boolean;             // Default: true
  createdAt: Date;               // Auto-generated

  // Relations
  companyAccesses: CompanyModuleAccess[];
  userPermissions: UserModulePermission[];
}
```

**Indexes**:
- Primary: `id`
- Unique: `slug`

**Constraints**:
- Slug must be unique across all modules

---

### CompanyModuleAccess Entity

**Table**: `company_module_access`

```typescript
interface CompanyModuleAccess {
  id: string;                    // UUID (Primary Key)
  companyId: string;             // Foreign Key to Company
  moduleId: string;              // Foreign Key to Module
  isEnabled: boolean;            // Default: false
  createdAt: Date;               // Auto-generated

  // Relations
  company: Company;
  module: Module;
}
```

**Indexes**:
- Primary: `id`
- Unique Composite: `(companyId, moduleId)`
- Foreign Keys:
  - `companyId` references `companies.id` (CASCADE on delete)
  - `moduleId` references `modules.id` (CASCADE on delete)

**Constraints**:
- One access record per company-module pair
- Cascade delete when company or module is deleted

---

### UserModulePermission Entity

**Table**: `user_module_permissions`

```typescript
interface UserModulePermission {
  id: string;                    // UUID (Primary Key)
  userId: string;                // Foreign Key to User
  moduleId: string;              // Foreign Key to Module
  permissions: string[];         // ["read", "write", "delete"]
  grantedById: string;           // Foreign Key to User (who granted)
  createdAt: Date;               // Auto-generated

  // Relations
  user: User;
  module: Module;
  grantedBy: User;
}
```

**Indexes**:
- Primary: `id`
- Unique Composite: `(userId, moduleId)`
- Foreign Keys:
  - `userId` references `users.id` (CASCADE on delete)
  - `moduleId` references `modules.id` (CASCADE on delete)
  - `grantedById` references `users.id`

**Constraints**:
- One permission record per user-module pair
- Permissions stored as simple array (TypeORM simple-array)
- Valid permissions: "read", "write", "delete"
- Cascade delete when user or module is deleted

---

### SimpleText Entity

**Table**: `simple_texts`

```typescript
interface SimpleText {
  id: string;                    // UUID (Primary Key)
  companyId: string;             // Foreign Key to Company
  content: string;               // Text content (max 5000 chars)
  createdById: string;           // Foreign Key to User
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-updated

  // Relations
  company: Company;
  createdBy: User;
}
```

**Indexes**:
- Primary: `id`
- Foreign Keys:
  - `companyId` references `companies.id` (CASCADE on delete)
  - `createdById` references `users.id`

**Constraints**:
- Content length: 1-5000 characters
- Cascade delete when company is deleted
- Multi-tenant isolation by companyId

---

## RBAC System

### Access Control Logic

The RBAC system implements a sophisticated three-tier authorization system with granular permissions.

#### Role Hierarchy

```
ADMIN (System Level)
  ├─ Full user management
  ├─ Full company management
  ├─ Full module management
  ├─ Grant company-level module access
  └─ NO access to business data (e.g., simple-text records)

COMPANY_OWNER (Company Level)
  ├─ Manage company employees
  ├─ View available modules for company
  ├─ Grant/revoke employee module permissions
  ├─ Full access to company's business data
  └─ Limited to own company scope

EMPLOYEE (User Level)
  ├─ Access only explicitly granted modules
  ├─ Permissions: read, write, delete
  ├─ Limited to own company scope
  └─ No management capabilities
```

### RBACService Methods

#### `canAccessModule(userId: string, moduleSlug: string): Promise<boolean>`

**Purpose**: Check if user can access a specific module

**Logic**:
1. **ADMIN**: Always returns `true` (can access all modules)
2. **COMPANY_OWNER**:
   - Looks up user's company
   - Checks if `CompanyModuleAccess` exists with `isEnabled = true`
   - Returns `true` if company has access
3. **EMPLOYEE**:
   - Checks company-level access first
   - Then checks if `UserModulePermission` exists for user
   - Returns `true` if both company and user have access

**Returns**: `boolean`

---

#### `hasPermission(userId: string, moduleSlug: string, permission: string): Promise<boolean>`

**Purpose**: Check if user has specific permission on a module

**Logic**:
1. **ADMIN**: Returns `true` for all permissions (except business data access)
2. **COMPANY_OWNER**:
   - If company has module access, returns `true` for all permissions
3. **EMPLOYEE**:
   - Looks up `UserModulePermission` record
   - Checks if `permission` exists in `permissions[]` array
   - Returns `true` only if explicitly granted

**Parameters**:
- `userId`: User ID to check
- `moduleSlug`: Module slug (e.g., "simple-text")
- `permission`: Permission string ("read", "write", "delete")

**Returns**: `boolean`

---

#### `grantModuleAccess(granterId: string, targetId: string, moduleSlug: string, permissions: string[])`

**Purpose**: Grant module access with permissions

**Logic**:
1. Validates granter has access to module
2. Determines grant type based on granter role:
   - **ADMIN → Company**: Creates/updates `CompanyModuleAccess`
   - **COMPANY_OWNER → Employee**: Creates/updates `UserModulePermission`
3. Records `grantedById` for audit trail
4. Returns created/updated record

**Parameters**:
- `granterId`: User granting access
- `targetId`: Company or User receiving access
- `moduleSlug`: Module being granted
- `permissions`: Array of permission strings (for employee grants)

---

#### `revokeModuleAccess(granterId: string, targetId: string, moduleSlug: string)`

**Purpose**: Revoke module access

**Logic**:
1. Validates granter has authority to revoke
2. Determines revoke type:
   - **ADMIN → Company**: Sets `CompanyModuleAccess.isEnabled = false`
   - **COMPANY_OWNER → Employee**: Deletes `UserModulePermission` record
3. Cascades to dependent permissions

**Note**: Company-level revocation automatically removes all employee permissions through cascade logic.

---

#### `getAvailableModules(userId: string): Promise<Module[]>`

**Purpose**: Get list of modules available to user

**Logic**:
1. **ADMIN**: Returns all active modules
2. **COMPANY_OWNER/EMPLOYEE**:
   - Looks up user's company
   - Finds all modules where `CompanyModuleAccess.isEnabled = true`
   - Returns array of Module objects

**Returns**: `Module[]`

---

### Guard System

#### JwtAuthGuard

**Purpose**: Validates JWT token on protected endpoints

**Logic**:
1. Extracts token from `Authorization: Bearer <token>` header
2. Verifies token signature with JWT secret
3. Checks token expiration
4. Extracts user payload and attaches to `request.user`
5. Blocks request if token invalid/expired

**Decorator**: `@UseGuards(JwtAuthGuard)` (applied globally)

**Skip**: Use `@Public()` decorator to skip authentication

---

#### RolesGuard

**Purpose**: Validates user has required role(s)

**Logic**:
1. Reads `@Roles()` decorator metadata
2. Compares `user.role` against required roles
3. Allows if user role matches any required role
4. Returns 403 Forbidden if role doesn't match

**Decorator**: `@Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER)`

**Example**:
```typescript
@Roles(UserRole.ADMIN)
@Get('/admin/users')
getAllUsers() { ... }
```

---

#### OwnerOrAdminGuard

**Purpose**: Company ownership verification for company endpoints

**Logic**:
1. Checks if user is ADMIN (always allowed)
2. If COMPANY_OWNER, verifies operation is on own company
3. Compares `user.companyId` with target company
4. Returns 403 if not owner and not admin

**Decorator**: `@UseGuards(OwnerOrAdminGuard)`

**Use Case**: Company owner endpoints that should only allow owners to manage their own company

---

#### ModuleAccessGuard

**Purpose**: Verify user has access to specific module

**Logic**:
1. Reads `@RequireModule(slug)` decorator metadata
2. Extracts module slug from decorator
3. Calls `RBACService.canAccessModule(userId, slug)`
4. Returns 403 if access denied

**Decorator**: `@RequireModule('simple-text')`

**Example**:
```typescript
@RequireModule('simple-text')
@Get('/modules/simple-text')
findAll() { ... }
```

---

#### PermissionGuard

**Purpose**: Granular permission checking

**Logic**:
1. Reads `@RequirePermission(module, permission)` decorator
2. Extracts module and permission strings
3. Calls `RBACService.hasPermission(userId, module, permission)`
4. Returns 403 if permission not granted

**Decorator**: `@RequirePermission('simple-text', 'write')`

**Example**:
```typescript
@RequireModule('simple-text')
@RequirePermission('simple-text', 'write')
@Post('/modules/simple-text')
create(@Body() dto: CreateSimpleTextDto) { ... }
```

**Note**: `PermissionGuard` is typically used together with `ModuleAccessGuard`

---

### Permission Inheritance

```
ADMIN
  └─ All modules: read, write, delete
     └─ Exception: Cannot access business data

COMPANY_OWNER (if company has module access)
  └─ All permissions: read, write, delete
     └─ Can grant permissions to employees

EMPLOYEE
  └─ Only explicitly granted permissions
     └─ Subset of: read, write, delete
```

### Data Isolation

**Multi-tenant Strategy**:
- All business data filtered by `companyId`
- Guards enforce company ownership
- Query builders use `WHERE companyId = :companyId`
- Prevents cross-company data leaks

**Example**:
```typescript
// SimpleText query
this.simpleTextRepository.find({
  where: { companyId: user.companyId }
});

// Ensures user can only see their company's data
```

---

## Security

### Authentication Security

**Password Hashing**:
- Algorithm: bcrypt
- Salt rounds: 10
- Automatic hashing on user creation and password updates

**JWT Tokens**:
- Access Token: 1 hour expiration
- Refresh Token: 7 days expiration
- Tokens include user ID, role, and company ID
- Bearer token format in Authorization header

**Token Payload**:
```typescript
{
  sub: string;           // User ID
  email: string;
  role: string;
  companyId: string | null;
  iat: number;           // Issued at
  exp: number;           // Expiration
}
```

### Authorization Security

**Role-Based Access**:
- Guards enforce role requirements
- Decorator-based authorization (`@Roles()`)
- Hierarchical permission system

**Multi-Tenant Isolation**:
- All queries scoped by companyId
- Guards verify company ownership
- Database-level foreign key constraints
- Cascade deletes maintain referential integrity

**Permission Granularity**:
- Module-level access control
- Operation-level permissions (read/write/delete)
- Audit trail with grantedBy tracking

### Input Validation

**class-validator**:
- All DTOs validated using decorators
- Custom validation rules for role-based fields
- Auto-transformation (lowercase, trim)
- Whitelist mode (strips unknown properties)

**Global Validation Pipe**:
```typescript
{
  whitelist: true,              // Remove non-whitelisted properties
  forbidNonWhitelisted: true,   // Throw error for unknown properties
  transform: true,              // Auto-transform to target types
}
```

**Validation Examples**:
- Email: Format validation + uniqueness check
- Password: Minimum length enforcement
- UUID: Format validation for IDs
- Content: Length constraints (1-5000 chars)

### CORS Configuration

**Settings**:
- Configurable via environment variables
- Origins whitelist
- Credentials support
- Methods: GET, POST, PATCH, DELETE

**Production Recommendation**:
```typescript
{
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}
```

### Helmet Security Headers

**HTTP Headers**:
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- X-XSS-Protection

### Database Security

**Soft Deletes**:
- Users: `isActive` flag
- Companies: `isActive` flag
- Preserves audit trail
- Prevents accidental data loss

**Hard Deletes**:
- SimpleText records (when company deleted)
- UserModulePermission (when access revoked)
- Cascade deletes for referential integrity

**Constraints**:
- Unique email (case-insensitive queries)
- Unique module slug
- Foreign key constraints
- Composite unique keys for many-to-many

### Security Best Practices

**Implemented**:
✅ Password hashing (bcrypt)
✅ JWT authentication
✅ Role-based authorization
✅ Input validation
✅ Multi-tenant data isolation
✅ CORS configuration
✅ Helmet security headers
✅ Soft delete patterns
✅ Foreign key constraints
✅ Case-insensitive email handling

**Recommended Improvements**:
⚠️ Separate JWT secrets for access/refresh tokens
⚠️ Rate limiting on authentication endpoints
⚠️ Password complexity requirements (uppercase, numbers, special chars)
⚠️ Email verification on registration
⚠️ Account lockout after failed login attempts
⚠️ IP whitelisting for admin endpoints
⚠️ Audit logging for sensitive operations
⚠️ Token refresh rotation
⚠️ API request logging
⚠️ SQL injection prevention (use parameterized queries)

---

## Common Workflows

### Complete User Onboarding

**Scenario**: Admin sets up a new company with employees and module access

```bash
# Step 1: Admin registers company owner
POST /auth/register
{
  "email": "owner@newcompany.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Owner",
  "role": "COMPANY_OWNER"
}
# Note: No companyId yet

# Step 2: Admin creates company
POST /admin/companies
Authorization: Bearer <admin_token>
{
  "name": "New Company Inc",
  "ownerId": "<owner_user_id>"
}
# Returns: companyId

# Step 3: Update owner with companyId (if needed)
PATCH /admin/users/<owner_user_id>
Authorization: Bearer <admin_token>
{
  "companyId": "<company_id>"
}

# Step 4: Admin grants module access to company
POST /admin/companies/<company_id>/modules/<simple_text_module_id>
Authorization: Bearer <admin_token>

# Step 5: Owner logs in
POST /auth/login
{
  "email": "owner@newcompany.com",
  "password": "SecurePass123!"
}
# Returns: access_token, refresh_token

# Step 6: Owner creates employee
POST /company/employees
Authorization: Bearer <owner_token>
{
  "email": "employee@newcompany.com",
  "password": "EmpPass123!",
  "firstName": "John",
  "lastName": "Employee"
}
# Returns: employee_id

# Step 7: Owner grants module permissions to employee
POST /company/employees/<employee_id>/modules/simple-text
Authorization: Bearer <owner_token>
{
  "permissions": ["read", "write"]
}

# Step 8: Employee logs in
POST /auth/login
{
  "email": "employee@newcompany.com",
  "password": "EmpPass123!"
}
# Returns: access_token

# Step 9: Employee accesses module
GET /modules/simple-text
Authorization: Bearer <employee_token>

# Step 10: Employee creates text
POST /modules/simple-text
Authorization: Bearer <employee_token>
{
  "content": "First accounting note!"
}
```

---

### Module Access Grant Workflow

**Scenario**: Company owner grants different permission levels to employees

```bash
# Read-only access
POST /company/employees/<employee1_id>/modules/simple-text
{
  "permissions": ["read"]
}

# Read and write access
POST /company/employees/<employee2_id>/modules/simple-text
{
  "permissions": ["read", "write"]
}

# Full access
POST /company/employees/<employee3_id>/modules/simple-text
{
  "permissions": ["read", "write", "delete"]
}

# Update permissions
PATCH /company/employees/<employee1_id>/modules/simple-text
{
  "permissions": ["read", "write"]  # Upgrade to read-write
}

# Revoke access
DELETE /company/employees/<employee1_id>/modules/simple-text
```

---

### Employee Permission Management

**Scenario**: Owner manages employee module access over time

```bash
# Check what modules employee has
GET /company/employees/<employee_id>/modules
Authorization: Bearer <owner_token>

# Grant access to new module
POST /company/employees/<employee_id>/modules/invoicing
Authorization: Bearer <owner_token>
{
  "permissions": ["read", "write"]
}

# Upgrade permissions on existing module
PATCH /company/employees/<employee_id>/modules/simple-text
Authorization: Bearer <owner_token>
{
  "permissions": ["read", "write", "delete"]
}

# Temporary access revocation (without deletion)
# Alternative: DELETE endpoint removes access entirely
DELETE /company/employees/<employee_id>/modules/simple-text
Authorization: Bearer <owner_token>
```

---

### Token Refresh Workflow

**Scenario**: User's access token expires during session

```bash
# Initial login
POST /auth/login
{
  "email": "user@company.com",
  "password": "password123"
}
# Returns: access_token (1h), refresh_token (7d)

# ... 1 hour later, access_token expires ...

# API request fails with 401
GET /modules/simple-text
Authorization: Bearer <expired_access_token>
# Returns: 401 Unauthorized

# Refresh tokens
POST /auth/refresh
{
  "refresh_token": "<refresh_token>"
}
# Returns: new access_token, new refresh_token

# Retry API request with new token
GET /modules/simple-text
Authorization: Bearer <new_access_token>
# Returns: 200 OK
```

---

### Admin Module Management

**Scenario**: Admin creates and distributes a new module

```bash
# Step 1: Create new module
POST /admin/modules
Authorization: Bearer <admin_token>
{
  "name": "Expense Tracking",
  "slug": "expense-tracking",
  "description": "Track and categorize business expenses"
}
# Returns: module_id

# Step 2: Grant access to Company A
POST /admin/companies/<company_a_id>/modules/<expense_module_id>
Authorization: Bearer <admin_token>

# Step 3: Grant access to Company B
POST /admin/companies/<company_b_id>/modules/<expense_module_id>
Authorization: Bearer <admin_token>

# Step 4: Verify company access
GET /admin/companies/<company_a_id>/modules
Authorization: Bearer <admin_token>

# Step 5: Company owner can now see the module
GET /company/modules
Authorization: Bearer <company_a_owner_token>

# Step 6: Company owner grants to employees
POST /company/employees/<employee_id>/modules/expense-tracking
Authorization: Bearer <company_a_owner_token>
{
  "permissions": ["read", "write"]
}
```

---

### Multi-Company Data Isolation Verification

**Scenario**: Ensure employees cannot access other company data

```bash
# Company A employee creates text
POST /modules/simple-text
Authorization: Bearer <company_a_employee_token>
{
  "content": "Company A confidential data"
}
# Returns: text_id_a with companyId = company_a_id

# Company B employee creates text
POST /modules/simple-text
Authorization: Bearer <company_b_employee_token>
{
  "content": "Company B confidential data"
}
# Returns: text_id_b with companyId = company_b_id

# Company A employee tries to access Company B data
GET /modules/simple-text/<text_id_b>
Authorization: Bearer <company_a_employee_token>
# Returns: 403 Forbidden - Access denied

# Company A employee lists texts
GET /modules/simple-text
Authorization: Bearer <company_a_employee_token>
# Returns: Only Company A texts (filtered by companyId)
```

---

## Error Reference

### HTTP Status Codes

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PATCH requests |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, business rule violations |
| 401 | Unauthorized | Invalid credentials, expired token, inactive account |
| 403 | Forbidden | Insufficient permissions, cross-company access |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation (email, slug) |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Messages

#### Authentication Errors (401)

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 401,
  "message": "User account is not active",
  "error": "Unauthorized"
}
```

#### Authorization Errors (403)

```json
{
  "statusCode": 403,
  "message": "Access denied to module: simple-text",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 403,
  "message": "You don't have access to this module",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

#### Validation Errors (400)

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters",
    "role must be one of the following values: ADMIN, COMPANY_OWNER, EMPLOYEE"
  ],
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "CompanyId is required for COMPANY_OWNER and EMPLOYEE roles",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": [
    "content must be longer than or equal to 1 characters",
    "content must be shorter than or equal to 5000 characters"
  ],
  "error": "Bad Request"
}
```

#### Not Found Errors (404)

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "Company not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "Module not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "SimpleText not found",
  "error": "Not Found"
}
```

#### Conflict Errors (409)

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

```json
{
  "statusCode": 409,
  "message": "Module with this slug already exists",
  "error": "Conflict"
}
```

### Troubleshooting Guide

#### "Invalid credentials" on login

**Possible causes**:
- Incorrect email or password
- Email case sensitivity (system converts to lowercase)
- User account deactivated (`isActive: false`)

**Solution**:
- Verify email is correct and lowercase
- Reset password if forgotten
- Contact admin to reactivate account

---

#### "Access denied to module: simple-text"

**Possible causes**:
- Company doesn't have module access
- Employee not granted permissions
- Module is inactive

**Solution**:
- Admin: Grant module to company via `/admin/companies/:id/modules/:moduleId`
- Owner: Grant permissions to employee via `/company/employees/:id/modules/:slug`
- Verify module is active

---

#### "Insufficient permissions for this operation"

**Possible causes**:
- Employee has module access but missing specific permission
- Attempting write operation with only read permission
- Attempting delete operation without delete permission

**Solution**:
- Company owner: Update employee permissions via `/company/employees/:id/modules/:slug`
- Include required permission: "read", "write", or "delete"

---

#### "Access denied" on SimpleText operations

**Possible causes**:
- Attempting to access another company's data
- Multi-tenant isolation preventing cross-company access

**Solution**:
- Verify the resource belongs to your company
- Contact admin if data ownership is unclear
- Cross-company access is by design (security feature)

---

#### "User with this email already exists"

**Possible causes**:
- Email already registered in system
- Case-insensitive uniqueness check

**Solution**:
- Use different email address
- Recover existing account if you own the email
- Contact admin to resolve conflicts

---

#### Token expired errors

**Possible causes**:
- Access token expired (1 hour lifespan)
- Refresh token expired (7 days lifespan)

**Solution**:
- Use `/auth/refresh` endpoint with refresh token
- If refresh token expired, login again via `/auth/login`
- Implement automatic token refresh in client

---

#### "Company not found" when creating users

**Possible causes**:
- Invalid companyId UUID
- Company doesn't exist or was deleted
- Company is inactive

**Solution**:
- Verify companyId is correct
- List all companies via `/admin/companies`
- Create company first if it doesn't exist

---

## Environment Configuration

### Required Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=accounting_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:4200
CORS_CREDENTIALS=true

# Application
API_PREFIX=
SWAGGER_PATH=api/docs
```

### Production Configuration Example

```env
# Server
PORT=8080
NODE_ENV=production

# Database (use connection pooling)
DB_HOST=production-db.example.com
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=<strong_password>
DB_DATABASE=accounting_prod
DB_SSL=true
DB_POOL_SIZE=20

# JWT (use strong, random secrets)
JWT_SECRET=<64_char_random_string>
JWT_REFRESH_SECRET=<64_char_random_string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS (whitelist specific domains)
CORS_ORIGINS=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

### Development vs Production

| Setting | Development | Production |
|---------|------------|------------|
| NODE_ENV | development | production |
| JWT_ACCESS_EXPIRATION | 1h | 15m |
| JWT_REFRESH_EXPIRATION | 7d | 7d |
| CORS_ORIGINS | localhost | Specific domains |
| LOG_LEVEL | debug | warn/error |
| DB_SSL | false | true |
| RATE_LIMIT_ENABLED | false | true |

---

## Development Notes

### Current Implementation Status

**Fully Implemented** ✅:
- Multi-tenant architecture with data isolation
- Three-tier RBAC (ADMIN, COMPANY_OWNER, EMPLOYEE)
- JWT authentication with refresh tokens
- Module-based permission system
- Simple Text module as reference implementation
- Comprehensive validation with class-validator
- Swagger/OpenAPI documentation
- Soft delete patterns
- Guard-based authorization
- Case-insensitive email handling

**Partially Implemented** ⚠️:
- Token refresh uses same secret as access token
- Debug logging present in production code
- No pagination on list endpoints

**Not Implemented** ❌:
- Rate limiting
- Email verification
- Password complexity rules (beyond length)
- Account lockout
- Audit logging
- Token refresh rotation
- IP whitelisting
- Separate refresh token secret

### Areas for Improvement

#### Security Enhancements

1. **Separate JWT Secrets**:
```typescript
// Current: Same secret for both tokens
// Recommended: Separate JwtService instances
@Module({
  imports: [
    JwtModule.register({ secret: JWT_ACCESS_SECRET, expiresIn: '15m' }),
    JwtModule.register({ secret: JWT_REFRESH_SECRET, expiresIn: '7d' })
  ]
})
```

2. **Password Complexity**:
```typescript
// Add validation decorator
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  message: 'Password must contain uppercase, lowercase, number, and special character'
})
password: string;
```

3. **Rate Limiting**:
```typescript
// Add throttler module
@ThrottlerGuard({ ttl: 60, limit: 10 })
@Post('/auth/login')
async login() { ... }
```

4. **Audit Logging**:
```typescript
// Log all RBAC operations
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip: string;
}
```

#### Performance Optimizations

1. **Pagination**:
```typescript
// Add pagination to list endpoints
@Get('/admin/users')
async findAll(@Query() query: PaginationDto) {
  const { page = 1, limit = 20 } = query;
  return this.userService.findAll({ skip: (page - 1) * limit, take: limit });
}
```

2. **Database Indexing**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_company ON users(companyId);
CREATE INDEX idx_simple_texts_company ON simple_texts(companyId);
CREATE INDEX idx_user_module_permissions_user ON user_module_permissions(userId);
```

3. **Query Optimization**:
```typescript
// Use query builder for complex queries
const texts = await this.simpleTextRepository
  .createQueryBuilder('text')
  .leftJoinAndSelect('text.createdBy', 'user')
  .where('text.companyId = :companyId', { companyId })
  .orderBy('text.createdAt', 'DESC')
  .getMany();
```

#### Code Quality

1. **Remove Debug Logging**:
```typescript
// Remove console.log statements from production code
// Replace with proper logger
this.logger.debug('User login attempt', { email });
```

2. **Enum for Permissions**:
```typescript
// Replace string arrays with enum
enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete'
}

permissions: Permission[];
```

3. **Error Handling**:
```typescript
// Consistent error messages and codes
class ErrorCodes {
  static readonly USER_NOT_FOUND = 'USER_001';
  static readonly INVALID_CREDENTIALS = 'AUTH_001';
  static readonly INSUFFICIENT_PERMISSIONS = 'RBAC_001';
}
```

#### Testing

1. **Unit Tests**: Add tests for RBAC logic, guards, and services
2. **Integration Tests**: Test complete workflows (user onboarding, module access)
3. **E2E Tests**: Test API endpoints with real HTTP requests
4. **Security Tests**: Test authorization boundaries and data isolation

### Module Development Guide

**To add a new module**:

1. Create module directory: `/libs/modules/new-module`
2. Define entity with companyId foreign key
3. Create DTOs with validation
4. Implement controller with guards:
```typescript
@Controller('modules/new-module')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('new-module')
export class NewModuleController { ... }
```
5. Apply permission decorators:
```typescript
@RequirePermission('new-module', 'read')
@Get()
findAll() { ... }
```
6. Filter queries by companyId
7. Register module in admin system
8. Add Swagger documentation

### Database Migration Guide

**TypeORM Migrations**:
```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

**Best Practices**:
- Always test migrations on dev database first
- Include both up and down migrations
- Preserve data during schema changes
- Backup production database before migrations

### Deployment Checklist

- [ ] Set strong JWT secrets (64+ character random strings)
- [ ] Configure production database with SSL
- [ ] Enable CORS for specific production domains only
- [ ] Set JWT access token expiration to 15 minutes
- [ ] Enable Helmet security headers
- [ ] Implement rate limiting
- [ ] Configure production logging (warn/error levels)
- [ ] Remove debug console.log statements
- [ ] Set up database backups
- [ ] Configure environment variables
- [ ] Test all API endpoints
- [ ] Verify multi-tenant data isolation
- [ ] Set up monitoring and alerts
- [ ] Document admin credentials securely
- [ ] Test token refresh flow
- [ ] Verify cascade delete behavior

---

## API Testing Examples

### Using cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Use token in subsequent requests
curl -X GET http://localhost:3000/modules/simple-text \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman

1. Create environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: (set from login response)

2. Set up authentication:
   - Type: Bearer Token
   - Token: `{{accessToken}}`

3. Login request:
   - POST `{{baseUrl}}/auth/login`
   - Save response token to environment

4. Authorized requests:
   - GET `{{baseUrl}}/modules/simple-text`
   - Authorization: Inherits bearer token

### Using JavaScript/TypeScript Client

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Login
const { data } = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123',
});

// Set token for future requests
api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

// Get texts
const texts = await api.get('/modules/simple-text');
console.log(texts.data);
```

---

## Conclusion

This comprehensive documentation covers all 47 endpoints in the accounting API system. The API implements a sophisticated multi-tenant RBAC architecture with modular business functionality, providing secure and scalable access control for accounting applications.

**Key Highlights**:
- Complete authentication and authorization system
- Three-tier role hierarchy with granular permissions
- Multi-tenant data isolation
- Modular architecture for business features
- Comprehensive validation and error handling
- Production-ready security features

**Related Documentation**:

This API reference is part of a comprehensive documentation suite:

- **ARCHITECTURE.md** - System architecture and design
- **API_ENDPOINTS.md** (this document) - Complete API endpoint reference
- **MODULE_DEVELOPMENT.md** - Step-by-step guide for creating new modules
- **IMPLEMENTATION_PATTERNS.md** - Code patterns and best practices

**Quick Navigation**:

**For API Users**:
- 🔐 **Authentication** → See [Authentication Endpoints](#authentication-endpoints)
- 📊 **Admin Operations** → See [Admin Endpoints](#admin-user-management)
- 👥 **Company Management** → See [Company Endpoints](#company-employee-management)
- 📝 **Business Modules** → See [Simple Text Module](#simple-text-module)
- 🔧 **Interactive Testing** → Use Swagger at `http://localhost:3000/api/docs`

**For Developers**:
- 🏗️ **Architecture overview** → ARCHITECTURE.md
- 💻 **Code patterns** → IMPLEMENTATION_PATTERNS.md
- 🔧 **Create new module** → MODULE_DEVELOPMENT.md

**For Support**:
- Swagger Documentation: `http://localhost:3000/api/docs`
- Issues: Contact development team
- Updates: Check version control system

---

**Version**: 1.0.0
**Last Updated**: January 2024
**Framework**: NestJS v11
**Database**: PostgreSQL with TypeORM
