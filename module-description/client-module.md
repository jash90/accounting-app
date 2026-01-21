# Client Module - System Requirements

## Overview

The Client Module is a multi-tenant customer relationship management system designed for businesses to manage their client database with customizable fields, conditional icons, change tracking, and automated notifications.

## Core Functionality

### 1. Client Management

- **CRUD Operations**: Create, Read, Update, Delete clients
- **Data Storage**: Store client information with both standard and custom fields
- **Multi-tenant Architecture**: Data isolation between companies while allowing sharing within company hierarchy

### 2. Custom Fields System

- **Per-Company Configuration**: Each company can define custom fields for their client records
- **Field Types**: Support various data types (text, number, date, select, multi-select, boolean, etc.)
- **Dynamic Schema**: Fields can be added, modified, or removed by authorized users

### 3. Conditional Icons System

- **Icon Definitions**: Define icons with display conditions based on field values
- **Condition Rules**: Icons appear when specific field values match defined criteria
- **Visual Indicators**: Provide quick visual context about client attributes

### 4. Change History (Audit Log)

- **Comprehensive Tracking**: Record all client data modifications
- **Detailed Changes**: Store before/after values for each changed field
- **Metadata**: Include timestamp, user who made the change, and change type
- **Shared History**: History is visible to all authorized users within the same access scope

### 5. Notifications & Email System

- **Addition Confirmation**: Send confirmation to newly added clients
- **Data Report**: Include summary of stored data in confirmation email
- **Configurable Recipients**: Flexible notification settings per role
- **Email Templates**: Customizable email content and formatting

---

## Role-Based Access Control (RBAC)

### Admin Role

Administrators have global access across all companies.

| Feature               | Permission                |
| --------------------- | ------------------------- |
| Client List           | Shared between all admins |
| Change History        | Shared between all admins |
| Notification Settings | Shared configuration      |
| Email Settings        | Shared configuration      |
| Icon Settings         | Shared configuration      |
| Custom Fields         | Shared configuration      |

### Owner Role

Company owners have full control over their company's client data and settings.

| Feature                        | Permission                                                     |
| ------------------------------ | -------------------------------------------------------------- |
| Client List                    | Shared with employees                                          |
| Change History                 | Shared with employees                                          |
| Client CRUD                    | Full access (create, read, update, delete)                     |
| Own Notification Settings      | Full control                                                   |
| Employee Notification Settings | Can enable/disable employee access to notification preferences |
| Icon Settings                  | Full control (create, update, delete)                          |
| Custom Fields                  | Full control                                                   |

### Employee Role

Employees have limited access based on owner configuration.

| Feature               | Permission                               |
| --------------------- | ---------------------------------------- |
| Client List           | Shared with owner and other employees    |
| Change History        | Read access (shared view)                |
| Client Create         | ✅ Allowed                               |
| Client Update         | ✅ Allowed                               |
| Client Delete         | ❌ Requires owner approval               |
| Icon Display          | Read-only (visible but not configurable) |
| Notification Settings | Only if enabled by owner                 |

---

## Permission Matrix

```
┌─────────────────────────────┬───────────┬───────────┬───────────┐
│ Action                      │   Admin   │   Owner   │  Employee │
├─────────────────────────────┼───────────┼───────────┼───────────┤
│ View Clients                │     ✅    │     ✅    │     ✅    │
│ Add Client                  │     ✅    │     ✅    │     ✅    │
│ Edit Client                 │     ✅    │     ✅    │     ✅    │
│ Delete Client               │     ✅    │     ✅    │     ⚠️*   │
│ View Change History         │     ✅    │     ✅    │     ✅    │
│ Configure Custom Fields     │     ✅    │     ✅    │     ❌    │
│ Configure Icons             │     ✅    │     ✅    │     ❌    │
│ View Icons on Clients       │     ✅    │     ✅    │     ✅    │
│ Configure Own Notifications │     ✅    │     ✅    │     ⚠️**  │
│ Enable Employee Notif.      │     ✅    │     ✅    │     ❌    │
└─────────────────────────────┴───────────┴───────────┴───────────┘

*  Requires owner approval
** Only if owner has enabled this feature for employees
```

---

## Data Sharing Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN SCOPE                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Shared client list across all admins                    │  │
│  │ • Shared change history                                   │  │
│  │ • Shared settings (notifications, emails, icons, fields)  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       COMPANY SCOPE                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                         OWNER                              │  │
│  │  • Full CRUD on clients                                   │  │
│  │  • Manages all company settings                           │  │
│  │  • Controls employee permissions                          │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        │ shares data with                        │
│                        ▼                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      EMPLOYEES                             │  │
│  │  • Shared client list (read/write, no delete)             │  │
│  │  • Shared change history (read-only)                      │  │
│  │  • Limited settings access                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Specifications

### Client Addition Workflow

1. User creates new client record
2. System validates required fields
3. System saves client data
4. System creates change history entry (type: "created")
5. System sends confirmation email to client with:
   - Confirmation of addition
   - Report of all stored data
6. System sends notification to configured recipients (based on role settings)

### Client Update Workflow

1. User modifies client data
2. System validates changes
3. System saves updated data
4. System creates change history entry with:
   - Changed fields (before/after values)
   - Timestamp
   - User who made changes
5. System evaluates icon conditions (show/hide based on new values)

### Client Deletion Workflow

- **Admin/Owner**: Direct deletion allowed
- **Employee**:
  1. Employee requests deletion
  2. System creates pending deletion request
  3. Owner receives notification
  4. Owner approves/rejects
  5. If approved, system deletes client and logs action

---

## Notification Settings Structure

```typescript
interface NotificationSettings {
  // Owner-level settings
  owner: {
    emailOnClientAdded: boolean;
    emailOnClientUpdated: boolean;
    emailOnClientDeleted: boolean;
    pushNotifications: boolean;
  };

  // Employee feature toggle (controlled by owner)
  employeeNotificationsEnabled: boolean;

  // Employee-level settings (only if enabled by owner)
  employee: {
    emailOnClientAdded: boolean;
    // Additional notification preferences
  };

  // Client-facing notifications
  client: {
    sendConfirmationEmail: boolean;
    includeDataReport: boolean;
    emailTemplate: string;
  };
}
```

---

## Icon Configuration Structure

```typescript
interface IconConfiguration {
  id: string;
  name: string;
  icon: string; // Icon identifier or URL
  description: string;
  conditions: IconCondition[];
  isActive: boolean;
  createdBy: string; // Owner or Admin ID
  createdAt: Date;
}

interface IconCondition {
  fieldId: string; // Reference to custom field
  operator:
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'greaterThan'
    | 'lessThan'
    | 'isEmpty'
    | 'isNotEmpty';
  value: any; // Value to compare against
  logicalOperator?: 'AND' | 'OR'; // For multiple conditions
}
```

---

## Change History Entry Structure

```typescript
interface ChangeHistoryEntry {
  id: string;
  clientId: string;
  companyId: string;
  userId: string;
  userRole: 'admin' | 'owner' | 'employee';
  changeType: 'created' | 'updated' | 'deleted' | 'restored';
  timestamp: Date;
  changes: FieldChange[];
  metadata?: Record<string, any>;
}

interface FieldChange {
  fieldName: string;
  fieldType: string;
  previousValue: any;
  newValue: any;
}
```

---

## Custom Field Definition Structure

```typescript
interface CustomFieldDefinition {
  id: string;
  companyId: string;
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'email'
    | 'phone'
    | 'url';
  isRequired: boolean;
  isUnique: boolean;
  defaultValue?: any;
  options?: SelectOption[]; // For select/multiselect types
  validation?: FieldValidation;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SelectOption {
  value: string;
  label: string;
  color?: string; // Optional color coding
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // Regex pattern
  customMessage?: string;
}
```

---

## Client Data Structure

```typescript
interface Client {
  id: string;
  companyId: string;

  // Standard fields
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;

  // Custom fields (dynamic based on company configuration)
  customFields: Record<string, any>;

  // Computed/display properties
  displayedIcons: string[]; // Icon IDs that match conditions

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  isActive: boolean;
}

interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}
```

---

## Email Templates

### Client Addition Confirmation

```typescript
interface ClientConfirmationEmail {
  to: string; // Client email
  subject: string;
  template: 'client-confirmation';
  data: {
    clientName: string;
    companyName: string;
    addedDate: Date;
    storedData: {
      fieldLabel: string;
      fieldValue: string;
    }[];
    contactInfo?: {
      email?: string;
      phone?: string;
    };
  };
}
```

### Internal Notification

```typescript
interface InternalNotificationEmail {
  to: string[]; // Recipients based on notification settings
  subject: string;
  template: 'internal-notification';
  data: {
    action: 'created' | 'updated' | 'deleted';
    clientName: string;
    performedBy: string;
    timestamp: Date;
    changes?: FieldChange[];
  };
}
```

---

## API Endpoints Overview

Base path: `/api/modules/clients`

### Clients

| Method | Endpoint                                  | Description        | Roles        |
| ------ | ----------------------------------------- | ------------------ | ------------ |
| GET    | `/api/modules/clients`                    | List all clients   | All          |
| GET    | `/api/modules/clients/:id`                | Get client details | All          |
| POST   | `/api/modules/clients`                    | Create new client  | All          |
| PUT    | `/api/modules/clients/:id`                | Update client      | All          |
| DELETE | `/api/modules/clients/:id`                | Delete client      | Admin, Owner |
| POST   | `/api/modules/clients/:id/delete-request` | Request deletion   | Employee     |

### Custom Fields

| Method | Endpoint                                 | Description         | Roles        |
| ------ | ---------------------------------------- | ------------------- | ------------ |
| GET    | `/api/modules/clients/custom-fields`     | List custom fields  | All          |
| POST   | `/api/modules/clients/custom-fields`     | Create custom field | Admin, Owner |
| PUT    | `/api/modules/clients/custom-fields/:id` | Update custom field | Admin, Owner |
| DELETE | `/api/modules/clients/custom-fields/:id` | Delete custom field | Admin, Owner |

### Icons

| Method | Endpoint                         | Description              | Roles        |
| ------ | -------------------------------- | ------------------------ | ------------ |
| GET    | `/api/modules/clients/icons`     | List icon configurations | All          |
| POST   | `/api/modules/clients/icons`     | Create icon config       | Admin, Owner |
| PUT    | `/api/modules/clients/icons/:id` | Update icon config       | Admin, Owner |
| DELETE | `/api/modules/clients/icons/:id` | Delete icon config       | Admin, Owner |

### Change History

| Method | Endpoint                           | Description        | Roles |
| ------ | ---------------------------------- | ------------------ | ----- |
| GET    | `/api/modules/clients/:id/history` | Get client history | All   |
| GET    | `/api/modules/clients/history`     | List all changes   | All   |

### Notification Settings

| Method | Endpoint                                         | Description                   | Roles        |
| ------ | ------------------------------------------------ | ----------------------------- | ------------ |
| GET    | `/api/modules/clients/settings/notifications`    | Get notification settings     | Admin, Owner |
| PUT    | `/api/modules/clients/settings/notifications`    | Update notification settings  | Admin, Owner |
| GET    | `/api/modules/clients/settings/notifications/me` | Get own notification prefs    | All\*        |
| PUT    | `/api/modules/clients/settings/notifications/me` | Update own notification prefs | All\*        |

\*Employee access depends on owner configuration
