# Component Design System - UI Component Catalog

## Table of Contents

1. [Introduction](#introduction)
2. [Design Tokens](#design-tokens)
3. [Core Components](#core-components)
4. [Custom Components](#custom-components)
5. [Layout Components](#layout-components)
6. [Form Components](#form-components)
7. [Composition Patterns](#composition-patterns)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Best Practices](#best-practices)

---

## Introduction

### Design Philosophy

This design system is built on **shadcn/ui** components with **Tailwind CSS**, prioritizing:

- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Unified design language across all pages
- **Flexibility**: Customizable through variants and composition
- **Performance**: Lightweight, tree-shakeable components
- **Developer Experience**: Type-safe, well-documented, easy to use

### Component Library

- **Base**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS utility classes
- **Icons**: Lucide React
- **Variants**: class-variance-authority (CVA)

### File Organization

```
src/components/
├── ui/                    # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── form.tsx
│   └── ...
├── common/                # Custom reusable components
│   ├── data-table.tsx
│   ├── page-header.tsx
│   └── ...
├── forms/                 # Form-specific components
│   ├── login-form.tsx
│   └── ...
└── layouts/               # Layout components
    ├── admin-layout.tsx
    └── ...
```

---

## Design Tokens

### Color Palette

#### Primary Colors

```css
/* Light Mode */
--primary: 221.2 83.2% 53.3%        /* Blue - main brand color */
--primary-foreground: 210 40% 98%   /* White text on primary */

/* Dark Mode */
--primary: 217.2 91.2% 59.8%
--primary-foreground: 222.2 47.4% 11.2%
```

**Usage**:
```tsx
<Button className="bg-primary text-primary-foreground">
  Primary Action
</Button>
```

#### Secondary Colors

```css
--secondary: 210 40% 96.1%          /* Light gray */
--secondary-foreground: 222.2 47.4% 11.2%

--muted: 210 40% 96.1%              /* Muted background */
--muted-foreground: 215.4 16.3% 46.9%
```

#### Semantic Colors

```css
--destructive: 0 84.2% 60.2%        /* Red - danger/delete actions */
--accent: 210 40% 96.1%              /* Accent highlights */
--border: 214.3 31.8% 91.4%         /* Border color */
```

#### Role-Based Colors (Custom)

```tsx
// User role badges
const roleColors = {
  ADMIN: 'destructive',       // Red
  COMPANY_OWNER: 'default',   // Blue
  EMPLOYEE: 'secondary',      // Gray
};

<Badge variant={roleColors[user.role]}>
  {user.role}
</Badge>
```

### Typography

```css
/* Font Family */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Font Sizes */
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 1.875rem;    /* 30px */
--font-size-4xl: 2.25rem;     /* 36px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

**Usage**:
```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<p className="text-base font-normal leading-normal">Body text</p>
```

### Spacing

```css
/* Based on Tailwind's spacing scale (0.25rem = 4px base) */
0    →  0px
1    →  4px
2    →  8px
3    →  12px
4    →  16px
5    →  20px
6    →  24px
8    →  32px
10   →  40px
12   →  48px
16   →  64px
20   →  80px
24   →  96px
```

**Usage**:
```tsx
<div className="p-6">         {/* padding: 24px */}
<div className="mt-4 mb-8">   {/* margin-top: 16px, margin-bottom: 32px */}
<div className="gap-4">       {/* gap: 16px */}
```

### Border Radius

```css
--radius: 0.5rem;               /* 8px - default */
--radius-lg: 0.5rem;            /* 8px */
--radius-md: calc(0.5rem - 2px); /* 6px */
--radius-sm: calc(0.5rem - 4px); /* 4px */
```

**Usage**:
```tsx
<div className="rounded-lg">    {/* 8px radius */}
<div className="rounded-md">    {/* 6px radius */}
<div className="rounded-sm">    {/* 4px radius */}
```

### Shadows

```tsx
/* Tailwind shadows */
className="shadow-sm"     /* Small shadow - cards */
className="shadow"        /* Default shadow */
className="shadow-md"     /* Medium shadow - elevated */
className="shadow-lg"     /* Large shadow - modals */
className="shadow-xl"     /* Extra large - floating */
```

---

## Core Components

### Button

**File**: `components/ui/button.tsx` (shadcn/ui)

**Variants**:
- `default`: Primary blue button
- `destructive`: Red for delete/dangerous actions
- `outline`: Bordered, transparent background
- `secondary`: Gray secondary action
- `ghost`: No background, hover effect
- `link`: Text button with underline

**Sizes**:
- `default`: Standard size (h-10, px-4)
- `sm`: Small (h-9, px-3)
- `lg`: Large (h-11, px-8)
- `icon`: Square for icon-only (h-10, w-10)

**Props**:
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;  // Compose with child element
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children: React.ReactNode;
}
```

**Examples**:

```tsx
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';

// Primary action
<Button>Save Changes</Button>
<Button onClick={handleSubmit}>Submit</Button>

// With icon
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Create User
</Button>

// Destructive action
<Button variant="destructive">
  <Trash2 className="mr-2 h-4 w-4" />
  Delete
</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Outline button
<Button variant="outline">Learn More</Button>

// Ghost button (minimal)
<Button variant="ghost" size="sm">
  <Edit className="h-4 w-4" />
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
  <Plus className="h-4 w-4" />
</Button>

// Link style
<Button variant="link">Read documentation</Button>

// Disabled state
<Button disabled>Processing...</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>

// As Link component
<Button asChild>
  <Link to="/admin/users">View Users</Link>
</Button>
```

**Best Practices**:
- ✅ Use `variant="destructive"` for delete/dangerous actions
- ✅ Include icon before text: `<Icon className="mr-2" />`
- ✅ Disable during loading states
- ✅ Use semantic `type` attribute in forms

---

### Input

**File**: `components/ui/input.tsx` (shadcn/ui)

**Props**:
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
```

**Examples**:

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Basic text input
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="user@example.com"
  />
</div>

// Password input
<div>
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    placeholder="••••••••"
  />
</div>

// Number input
<Input
  type="number"
  placeholder="0"
  min={0}
  max={100}
/>

// Date input
<Input type="date" />

// Search input
<Input
  type="search"
  placeholder="Search users..."
  className="max-w-sm"
/>

// Disabled input
<Input disabled value="Read only value" />

// With error state
<Input
  className="border-destructive focus-visible:ring-destructive"
  aria-invalid="true"
/>
```

**With React Hook Form**:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validation/schemas';

const form = useForm({
  resolver: zodResolver(loginSchema),
});

<form onSubmit={form.handleSubmit(onSubmit)}>
  <div>
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      {...form.register('email')}
    />
    {form.formState.errors.email && (
      <p className="text-sm text-destructive">
        {form.formState.errors.email.message}
      </p>
    )}
  </div>
</form>
```

**Best Practices**:
- ✅ Always pair with `<Label>` for accessibility
- ✅ Use appropriate `type` attribute
- ✅ Provide `placeholder` hints
- ✅ Show validation errors below input
- ✅ Use `aria-invalid` for error states

---

### Form

**File**: `components/ui/form.tsx` (shadcn/ui)

**Components**:
- `Form`: Root form provider
- `FormField`: Individual field wrapper
- `FormItem`: Field container
- `FormLabel`: Field label
- `FormControl`: Input wrapper
- `FormDescription`: Help text
- `FormMessage`: Error message

**Example**: Complete Login Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginForm({ onSubmit }: { onSubmit: (data: LoginFormData) => void }) {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
```

**Best Practices**:
- ✅ Use Zod schemas for validation
- ✅ Show loading state during submission
- ✅ Disable submit button while submitting
- ✅ Display field-level errors with `<FormMessage />`
- ✅ Provide helpful placeholders

---

### Table

**File**: `components/ui/table.tsx` (shadcn/ui)

**Components**:
- `Table`: Root table element
- `TableHeader`: `<thead>` wrapper
- `TableBody`: `<tbody>` wrapper
- `TableFooter`: `<tfoot>` wrapper
- `TableRow`: `<tr>` wrapper
- `TableHead`: `<th>` header cell
- `TableCell`: `<td>` data cell
- `TableCaption`: Table caption/description

**Basic Example**:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Email</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.firstName} {user.lastName}</TableCell>
        <TableCell><Badge>{user.role}</Badge></TableCell>
        <TableCell>
          <Button size="sm" variant="ghost">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**With TanStack Table** (Advanced):

See **DataTable** component in Custom Components section.

---

### Dialog

**File**: `components/ui/dialog.tsx` (shadcn/ui)

**Components**:
- `Dialog`: Root dialog provider
- `DialogTrigger`: Trigger button
- `DialogContent`: Modal content
- `DialogHeader`: Header section
- `DialogFooter`: Footer with actions
- `DialogTitle`: Modal title
- `DialogDescription`: Modal description

**Examples**:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Simple dialog
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="secondary">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Controlled dialog
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create User</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Input placeholder="Email" />
      <Input placeholder="First Name" />
    </div>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleCreate}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Best Practices**:
- ✅ Use controlled state for programmatic control
- ✅ Include DialogTitle for accessibility
- ✅ Provide clear DialogDescription
- ✅ Always have Cancel option
- ✅ Close dialog on successful action

---

### Toast

**File**: `components/ui/toast.tsx` (shadcn/ui)

**Hook**: `use-toast.ts`

**Variants**:
- `default`: Standard notification
- `destructive`: Error notification

**Examples**:

```tsx
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// Success toast
toast({
  title: 'Success!',
  description: 'User created successfully',
});

// Error toast
toast({
  title: 'Error',
  description: 'Failed to create user',
  variant: 'destructive',
});

// With action
toast({
  title: 'User deleted',
  description: 'User has been removed from the system',
  action: (
    <Button variant="outline" size="sm" onClick={handleUndo}>
      Undo
    </Button>
  ),
});

// Custom duration
toast({
  title: 'Notification',
  description: 'This will disappear in 3 seconds',
  duration: 3000,
});
```

**Usage in API Mutations**:

```tsx
const createUserMutation = useMutation({
  mutationFn: usersApi.create,
  onSuccess: () => {
    toast({
      title: 'User created',
      description: 'The user has been added successfully',
    });
  },
  onError: (error) => {
    toast({
      title: 'Failed to create user',
      description: getErrorMessage(error),
      variant: 'destructive',
    });
  },
});
```

**Best Practices**:
- ✅ Use for async operation feedback
- ✅ Keep descriptions concise
- ✅ Use destructive variant for errors
- ✅ Set reasonable duration (default 5s)
- ✅ Don't overuse (avoid toast spam)

---

### Card

**File**: `components/ui/card.tsx` (shadcn/ui)

**Components**:
- `Card`: Root card container
- `CardHeader`: Header section
- `CardFooter`: Footer section
- `CardTitle`: Title text
- `CardDescription`: Description text
- `CardContent`: Main content area

**Examples**:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Simple card
<Card>
  <CardHeader>
    <CardTitle>Total Users</CardTitle>
    <CardDescription>Active users in the system</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-4xl font-bold">1,234</p>
  </CardContent>
</Card>

// Card with footer actions
<Card>
  <CardHeader>
    <CardTitle>Company Details</CardTitle>
  </CardHeader>
  <CardContent>
    <dl className="space-y-2">
      <div>
        <dt className="font-medium">Name:</dt>
        <dd>Acme Corporation</dd>
      </div>
      <div>
        <dt className="font-medium">Owner:</dt>
        <dd>John Doe</dd>
      </div>
    </dl>
  </CardContent>
  <CardFooter className="gap-2">
    <Button variant="outline">Edit</Button>
    <Button variant="destructive">Delete</Button>
  </CardFooter>
</Card>

// Dashboard stat cards
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Total Companies</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">42</p>
      <p className="text-sm text-muted-foreground">+3 this month</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Active Users</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">156</p>
      <p className="text-sm text-muted-foreground">+12 this week</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Modules</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">3</p>
      <p className="text-sm text-muted-foreground">Available</p>
    </CardContent>
  </Card>
</div>
```

**Best Practices**:
- ✅ Use for grouping related information
- ✅ Include descriptive titles
- ✅ Use grid layout for dashboard cards
- ✅ Keep content focused and scannable

---

### Badge

**File**: `components/ui/badge.tsx` (shadcn/ui)

**Variants**:
- `default`: Blue background
- `secondary`: Gray background
- `destructive`: Red background
- `outline`: Transparent with border

**Examples**:

```tsx
import { Badge } from '@/components/ui/badge';

// User role badges
<Badge variant="destructive">ADMIN</Badge>
<Badge variant="default">COMPANY_OWNER</Badge>
<Badge variant="secondary">EMPLOYEE</Badge>

// Status badges
<Badge variant={user.isActive ? 'default' : 'secondary'}>
  {user.isActive ? 'Active' : 'Inactive'}
</Badge>

// Permission badges
{permissions.map((permission) => (
  <Badge key={permission} variant="outline">
    {permission}
  </Badge>
))}

// Count badge
<Badge className="ml-2">
  {count}
</Badge>

// Custom styling
<Badge className="bg-green-500">
  Verified
</Badge>
```

**Best Practices**:
- ✅ Use for status indicators
- ✅ Keep text short (1-2 words)
- ✅ Use semantic variants (destructive for errors)
- ✅ Combine with icons for clarity

---

### Select

**File**: `components/ui/select.tsx` (shadcn/ui)

**Components**:
- `Select`: Root select provider
- `SelectTrigger`: Button to open dropdown
- `SelectContent`: Dropdown menu
- `SelectItem`: Individual option
- `SelectValue`: Selected value display

**Examples**:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Basic select
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ADMIN">Admin</SelectItem>
    <SelectItem value="COMPANY_OWNER">Company Owner</SelectItem>
    <SelectItem value="EMPLOYEE">Employee</SelectItem>
  </SelectContent>
</Select>

// Controlled select
const [role, setRole] = useState<UserRole>();

<Select value={role} onValueChange={setRole}>
  <SelectTrigger>
    <SelectValue placeholder="Choose user role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
    <SelectItem value={UserRole.COMPANY_OWNER}>Company Owner</SelectItem>
    <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
  </SelectContent>
</Select>

// With React Hook Form
<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="COMPANY_OWNER">Company Owner</SelectItem>
          <SelectItem value="EMPLOYEE">Employee</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>

// Disabled select
<Select disabled>
  <SelectTrigger>
    <SelectValue placeholder="Disabled" />
  </SelectTrigger>
</Select>
```

**Best Practices**:
- ✅ Provide clear placeholder text
- ✅ Use enum values for type safety
- ✅ Integrate with form validation
- ✅ Set reasonable width (avoid full-width unless needed)

---

## Custom Components

### DataTable

**File**: `components/common/data-table.tsx`

**Purpose**: Reusable data table with sorting, filtering, and pagination

**Features**:
- Column sorting
- Row selection
- Pagination
- Loading states
- Empty states
- Custom cell rendering

**Props**:
```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}
```

**Example**:

```tsx
import { DataTable } from '@/components/common/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { User } from '@/types/entities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="font-medium">{row.original.email}</div>
    ),
  },
  {
    accessorKey: 'firstName',
    header: 'First Name',
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={getRoleVariant(row.original.role)}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleEdit(row.original)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDelete(row.original)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
  },
];

<DataTable
  columns={columns}
  data={users}
  isLoading={isLoading}
  onRowClick={(user) => navigate(`/admin/users/${user.id}`)}
  enableSorting={true}
  enablePagination={true}
  pageSize={20}
/>
```

**Implementation** (`components/common/data-table.tsx`):

```tsx
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  enableSorting?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  enableSorting = true,
  enablePagination = true,
  pageSize = 20,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              data.length
            )}{' '}
            of {data.length} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Best Practices**:
- ✅ Show loading skeleton while fetching
- ✅ Display "no results" message
- ✅ Implement pagination for large datasets
- ✅ Make rows clickable with hover effect
- ✅ Use TanStack Table for advanced features

---

### ConfirmDialog

**File**: `components/common/confirm-dialog.tsx`

**Purpose**: Reusable confirmation dialog for destructive actions

**Props**:
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}
```

**Implementation**:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === 'destructive' && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage**:

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [userToDelete, setUserToDelete] = useState<User | null>(null);

// Trigger
<Button
  variant="destructive"
  onClick={() => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }}
>
  Delete
</Button>

// Dialog
{userToDelete && (
  <ConfirmDialog
    open={deleteDialogOpen}
    onOpenChange={setDeleteDialogOpen}
    title="Delete User"
    description={`Are you sure you want to delete ${userToDelete.email}? This action cannot be undone.`}
    variant="destructive"
    confirmText="Delete"
    onConfirm={() => deleteUser(userToDelete.id)}
    isLoading={isDeleting}
  />
)}
```

---

### PageHeader

**File**: `components/common/page-header.tsx`

**Purpose**: Consistent page headers with title, description, and actions

**Props**:
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: boolean;
}
```

**Implementation**:

```tsx
import { Breadcrumbs } from './breadcrumbs';

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs = true,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      {breadcrumbs && <Breadcrumbs />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
```

**Usage**:

```tsx
<PageHeader
  title="Users"
  description="Manage system users and their roles"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      Create User
    </Button>
  }
/>
```

---

### UserMenu

**File**: `components/common/user-menu.tsx`

**Purpose**: User dropdown menu in header (profile, logout)

**Implementation**:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthContext } from '@/contexts/auth-context';
import { User, LogOut, Settings } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuthContext();

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {user.role}
              </Badge>
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### LoadingSpinner

**File**: `components/common/loading-spinner.tsx`

**Purpose**: Centered loading indicator

**Implementation**:

```tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

// Full-page loading
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
```

**Usage**:

```tsx
// Inline loading
{isLoading && <LoadingSpinner size="sm" />}

// Full page loading
{isLoading && <PageLoading text="Loading users..." />}

// In button
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

---

## Layout Components

### AdminLayout

**File**: `components/layouts/admin-layout.tsx`

**Features**:
- Sidebar navigation
- Header with breadcrumbs and user menu
- Responsive (collapsible sidebar on mobile)
- Active route highlighting

**Structure**:

```tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { UserMenu } from '@/components/common/user-menu';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  {
    href: '/admin',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/admin/users',
    icon: Users,
    label: 'Users',
  },
  {
    href: '/admin/companies',
    icon: Building2,
    label: 'Companies',
  },
  {
    href: '/admin/modules',
    icon: Package,
    label: 'Modules',
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold">Admin Panel</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <Breadcrumbs />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

**Mobile Responsive**:

```tsx
// Add mobile menu toggle
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// Mobile menu (< md breakpoint)
<div className="md:hidden">
  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon">
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left">
      <nav className="space-y-1 mt-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </SheetContent>
  </Sheet>
</div>
```

---

## Form Components

### Permission Selector

**File**: `components/forms/permission-selector.tsx`

**Purpose**: Multi-select checkboxes for module permissions

**Implementation**:

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ModulePermission } from '@/types/enums';

interface PermissionSelectorProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

const allPermissions = [
  { value: ModulePermission.READ, label: 'Read', description: 'View data' },
  { value: ModulePermission.WRITE, label: 'Write', description: 'Create and update data' },
  { value: ModulePermission.DELETE, label: 'Delete', description: 'Delete data' },
];

export function PermissionSelector({
  value,
  onChange,
  disabled = false,
}: PermissionSelectorProps) {
  const handleToggle = (permission: string) => {
    const newPermissions = value.includes(permission)
      ? value.filter((p) => p !== permission)
      : [...value, permission];
    onChange(newPermissions);
  };

  return (
    <div className="space-y-3">
      <Label className="text-base">Permissions</Label>
      <div className="space-y-2">
        {allPermissions.map((permission) => (
          <div key={permission.value} className="flex items-start space-x-3">
            <Checkbox
              id={permission.value}
              checked={value.includes(permission.value)}
              onCheckedChange={() => handleToggle(permission.value)}
              disabled={disabled}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={permission.value}
                className="text-sm font-medium cursor-pointer"
              >
                {permission.label}
              </label>
              <p className="text-xs text-muted-foreground">
                {permission.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Usage**:

```tsx
<FormField
  control={form.control}
  name="permissions"
  render={({ field }) => (
    <FormItem>
      <PermissionSelector
        value={field.value}
        onChange={field.onChange}
      />
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Composition Patterns

### Pattern 1: Form with Dialog

**Use Case**: Create/edit dialogs with forms

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createUserSchema, CreateUserFormData } from '@/lib/validation/schemas';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;  // For editing
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const { createUser, updateUser } = useUsers();
  const isEditing = !!user;

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: user || {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: UserRole.EMPLOYEE,
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    if (isEditing) {
      updateUser({ id: user.id, data });
    } else {
      createUser(data);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* More fields... */}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 2: List Page with CRUD

**Use Case**: Standard list page with create, edit, delete

```tsx
import { useState } from 'react';
import { useUsers } from '@/lib/hooks/use-users';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { UserFormDialog } from '@/components/forms/user-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function UsersListPage() {
  const { users, isLoading, deleteUser } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const columns = [
    // ... column definitions
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage system users"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable columns={columns} data={users} isLoading={isLoading} />
      </div>

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
        />
      )}
      {deletingUser && (
        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          title="Delete User"
          description={`Delete ${deletingUser.email}?`}
          variant="destructive"
          onConfirm={() => deleteUser(deletingUser.id)}
        />
      )}
    </div>
  );
}
```

---

## Accessibility Guidelines

### Keyboard Navigation

All components support keyboard navigation:

- **Tab**: Navigate between focusable elements
- **Enter/Space**: Activate buttons, checkboxes
- **Escape**: Close dialogs, dropdowns
- **Arrow keys**: Navigate lists, select options

### ARIA Labels

```tsx
// Button with icon only - add aria-label
<Button variant="ghost" size="icon" aria-label="Edit user">
  <Edit className="h-4 w-4" />
</Button>

// Form field - proper labeling
<FormField
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="email">Email</FormLabel>
      <FormControl>
        <Input id="email" aria-describedby="email-error" {...field} />
      </FormControl>
      <FormMessage id="email-error" />
    </FormItem>
  )}
/>

// Dialog - proper title
<DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <DialogTitle id="dialog-title">Delete User</DialogTitle>
  <DialogDescription id="dialog-description">
    This action cannot be undone
  </DialogDescription>
</DialogContent>
```

### Screen Reader Support

```tsx
// Visually hidden but available to screen readers
<span className="sr-only">Loading...</span>

// Skip to main content link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
  Skip to content
</a>

<main id="main-content">
  {/* Content */}
</main>
```

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

Test with browser devtools accessibility checker.

---

## Best Practices

### Component Composition

✅ **DO**:
```tsx
// Compose components for reusability
<Card>
  <CardHeader>
    <CardTitle>User Details</CardTitle>
  </CardHeader>
  <CardContent>
    <UserInfo user={user} />
  </CardContent>
  <CardFooter>
    <Button>Edit</Button>
  </CardFooter>
</Card>
```

❌ **DON'T**:
```tsx
// Don't create monolithic components
<UserCard user={user} showEdit showDelete showActivate />
```

### Styling

✅ **DO**:
```tsx
// Use Tailwind utilities
<div className="flex items-center gap-2 p-4 rounded-lg bg-card">

// Use cn() for conditional classes
<Button className={cn('w-full', isLoading && 'opacity-50')}>
```

❌ **DON'T**:
```tsx
// Don't use inline styles
<div style={{ display: 'flex', padding: '16px' }}>

// Don't use hardcoded colors
<div className="bg-[#3b82f6]">
```

### Performance

✅ **DO**:
```tsx
// Memoize expensive components
const MemoizedTable = React.memo(DataTable);

// Use useCallback for handlers
const handleDelete = useCallback((id: string) => {
  deleteUser(id);
}, [deleteUser]);

// Lazy load heavy components
const HeavyChart = lazy(() => import('./heavy-chart'));
```

❌ **DON'T**:
```tsx
// Don't create new functions in render
<Button onClick={() => handleClick(item.id)}>  // Creates new function each render
```

### Error Handling

✅ **DO**:
```tsx
// Show user-friendly error messages
{error && (
  <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
    {getErrorMessage(error)}
  </div>
)}

// Provide fallback UI
{isError ? (
  <div>Failed to load. <Button onClick={refetch}>Retry</Button></div>
) : (
  <DataTable ... />
)}
```

---

## Responsive Design

### Breakpoints

```tsx
/* Tailwind breakpoints */
sm:  640px   /* Small devices (phones landscape) */
md:  768px   /* Medium devices (tablets) */
lg:  1024px  /* Large devices (laptops) */
xl:  1280px  /* Extra large (desktops) */
2xl: 1536px  /* 2X large (large desktops) */
```

### Mobile-First Approach

```tsx
// Mobile first (default), then larger screens
<div className="
  flex flex-col gap-2     /* Mobile: vertical stack */
  md:flex-row md:gap-4   /* Tablet+: horizontal, larger gap */
">
  <Button className="w-full md:w-auto">Action</Button>
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">
  Desktop only content
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map((item) => <Card key={item.id}>{item.name}</Card>)}
</div>
```

---

## Related Documentation

This design system works with:

- **FRONTEND_IMPLEMENTATION_PLAN.md** - Implementation phases
- **API_INTEGRATION_GUIDE.md** - How components consume API data
- **DEVELOPER_ONBOARDING.md** - How to use components in development

### Quick Reference

**Using Components**:
1. Import from `@/components/ui/*`
2. Apply variants via props
3. Style with Tailwind utilities
4. Ensure accessibility (labels, ARIA)

**Creating New Components**:
1. Follow composition pattern
2. Use CVA for variants
3. Document props with TypeScript
4. Add usage examples
5. Test with keyboard navigation

---

**Version**: 1.0
**Last Updated**: January 2024
**Component Library**: shadcn/ui + Tailwind CSS
