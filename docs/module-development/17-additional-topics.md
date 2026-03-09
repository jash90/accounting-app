# Additional Topics

> [← Back to Index](./README.md) | [← Previous: Frontend Patterns](./16-frontend-patterns.md)

The following sections cover additional integration points that are essential for a production-ready module.

## Navigation Integration

After creating your module, add it to the sidebar navigation for each user role.

### Update Sidebar Navigation

Update the navigation configuration to include your new module.

**File**: `web/src/components/layouts/sidebar-nav.tsx` (or similar)

```typescript
// Navigation items for different roles
const adminNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/admin/modules/tasks',
    icon: CheckSquare,
  },
];

const companyNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/company/modules/tasks',
    icon: CheckSquare,
  },
];

const employeeNavItems = [
  // ... existing items
  {
    title: 'Tasks',
    href: '/modules/tasks',
    icon: CheckSquare,
  },
];
```

**Key Points**:

- Add navigation item for each user role
- Use consistent icons from Lucide React
- Match URLs to route configuration
- Consider module permissions for conditional rendering

### Conditional Navigation Based on Permissions

```typescript
// Only show module if user has access
const { data: modules } = useCompanyModules();

const navItems = useMemo(() => {
  const items = [...baseNavItems];

  // Add Tasks if module is enabled
  if (modules?.some((m) => m.module.slug === 'tasks')) {
    items.push({
      title: 'Tasks',
      href: '/modules/tasks',
      icon: CheckSquare,
    });
  }

  return items;
}, [modules]);
```

---

## MSW Mock Handlers

Create mock handlers for development and testing. This enables frontend development without a running backend.

### Create MSW Handlers

Create file: `web/src/lib/api/mocks/tasks-handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

// Mock data
const mockTasks = [
  {
    id: '1',
    title: 'Complete Q1 Report',
    description: 'Prepare financial statements for Q1',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2024-03-31',
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Acme Corp',
      isSystemCompany: false,
    },
    createdBy: {
      id: 'user-1',
      email: 'owner@acme.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    assignee: {
      id: 'user-2',
      email: 'employee@acme.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
];

export const tasksHandlers = [
  // GET /api/modules/tasks - List all tasks
  http.get('/api/modules/tasks', () => {
    return HttpResponse.json(mockTasks);
  }),

  // GET /api/modules/tasks/:id - Get single task
  http.get('/api/modules/tasks/:id', ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.id);

    if (!task) {
      return HttpResponse.json({ message: 'Task not found', statusCode: 404 }, { status: 404 });
    }

    return HttpResponse.json(task);
  }),

  // POST /api/modules/tasks - Create task
  http.post('/api/modules/tasks', async ({ request }) => {
    const body = await request.json();

    const newTask = {
      id: `task-${Date.now()}`,
      ...body,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      companyId: 'company-1',
      company: {
        id: 'company-1',
        name: 'Acme Corp',
        isSystemCompany: false,
      },
      createdBy: {
        id: 'user-1',
        email: 'owner@acme.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(newTask, { status: 201 });
  }),

  // PATCH /api/modules/tasks/:id - Update task
  http.patch('/api/modules/tasks/:id', async ({ params, request }) => {
    const body = await request.json();
    const task = mockTasks.find((t) => t.id === params.id);

    if (!task) {
      return HttpResponse.json({ message: 'Task not found', statusCode: 404 }, { status: 404 });
    }

    const updatedTask = {
      ...task,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(updatedTask);
  }),

  // DELETE /api/modules/tasks/:id - Delete task
  http.delete('/api/modules/tasks/:id', ({ params }) => {
    const taskIndex = mockTasks.findIndex((t) => t.id === params.id);

    if (taskIndex === -1) {
      return HttpResponse.json({ message: 'Task not found', statusCode: 404 }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/modules/tasks/status/:status - Filter by status
  http.get('/api/modules/tasks/status/:status', ({ params }) => {
    const filtered = mockTasks.filter((t) => t.status === params.status);
    return HttpResponse.json(filtered);
  }),
];
```

### Register Handlers

Update file: `web/src/lib/api/mocks/handlers.ts`

```typescript
import { tasksHandlers } from './tasks-handlers';

export const handlers = [
  // ... existing handlers
  ...tasksHandlers,
];
```

**Key Points**:

- Mock all endpoints your module uses
- Return realistic data structures matching backend DTOs
- Include error scenarios (404, 403, 400)
- Same mocks work for dev mode, unit tests, and E2E tests

---

## React 19 & TanStack Query v5 Patterns

Use modern React patterns for optimal performance.

### Update Hooks for TanStack Query v5

The hooks shown earlier use TanStack Query v5 patterns. Key differences from v4:

```typescript
// TanStack Query v5 Patterns

// 1. Use `isPending` instead of `isLoading`
const { data, isPending } = useQuery({ ... });  // v5
// const { data, isLoading } = useQuery({ ... });  // v4 (deprecated)

// 2. Use `queryOptions` for reusable queries
import { queryOptions } from '@tanstack/react-query';

export const tasksQueryOptions = () => queryOptions({
  queryKey: queryKeys.tasks.all,
  queryFn: tasksApi.getAll,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Use in component
const { data } = useQuery(tasksQueryOptions());

// 3. Use Suspense-ready patterns (optional)
import { useSuspenseQuery } from '@tanstack/react-query';

function TaskList() {
  // This will suspend the component until data is ready
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions());

  // No need to check isPending - data is guaranteed
  return <DataTable data={tasks} />;
}

// Wrap with Suspense boundary
<Suspense fallback={<LoadingSpinner />}>
  <TaskList />
</Suspense>
```

### React 19 Patterns

```typescript
// React 19 auto-memoization - no need for manual optimization
// Before (React 18) - Manual optimization required
const MemoizedTask = React.memo(({ task }) => {
  const formatted = useMemo(() => formatTask(task), [task]);
  return <div>{formatted.title}</div>;
});

// After (React 19) - Compiler auto-optimizes
function Task({ task }) {
  const formatted = formatTask(task); // Auto-memoized
  return <div>{formatted.title}</div>;
}
```

---

## Permission-Based UI Rendering

Control UI elements based on user permissions.

### Implement Permission Checks

```typescript
// Hook to check module permissions
export function useTaskPermissions() {
  const { user } = useAuthContext();
  const { data: permissions } = useEmployeeModules(user?.id);

  const taskPermissions = permissions?.find(
    p => p.module.slug === 'tasks'
  )?.permissions || [];

  // Company owners have full access
  if (user?.role === 'COMPANY_OWNER') {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
    };
  }

  return {
    canRead: taskPermissions.includes('read'),
    canWrite: taskPermissions.includes('write'),
    canDelete: taskPermissions.includes('delete'),
  };
}

// Usage in component
function TaskListPage() {
  const { canRead, canWrite, canDelete } = useTaskPermissions();
  const { data: tasks, isPending } = useTasks();

  if (!canRead) {
    return <UnauthorizedMessage />;
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        action={
          canWrite && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Task
            </Button>
          )
        }
      />

      <DataTable
        columns={getColumns({ canWrite, canDelete })}
        data={tasks}
      />
    </div>
  );
}

// Dynamic columns based on permissions
function getColumns({ canWrite, canDelete }) {
  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'priority', header: 'Priority' },
  ];

  // Only add actions column if user has edit/delete permissions
  if (canWrite || canDelete) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          )}
        </div>
      ),
    });
  }

  return columns;
}
```

---

## Accessibility Best Practices

Ensure your module UI is accessible (WCAG 2.1 AA compliant).

### Accessibility Implementation

From DESIGN_SYSTEM.md, apply these accessibility patterns:

```typescript
// 1. Icon buttons must have aria-labels
<Button
  variant="ghost"
  size="sm"
  aria-label="Edit task"
  onClick={() => setEditingTask(task)}
>
  <Edit className="h-4 w-4" />
</Button>

<Button
  variant="ghost"
  size="sm"
  aria-label="Delete task"
  onClick={() => setDeletingTaskId(task.id)}
>
  <Trash2 className="h-4 w-4" />
</Button>

// 2. Form labels must be associated with inputs
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="task-title">Title</FormLabel>
      <FormControl>
        <Input
          id="task-title"
          aria-describedby="task-title-error"
          {...field}
        />
      </FormControl>
      <FormMessage id="task-title-error" />
    </FormItem>
  )}
/>

// 3. Status badges with proper contrast
<Badge
  variant={statusVariants[task.status]}
  className="font-medium"
>
  {task.status.replace('_', ' ')}
</Badge>

// 4. Focus visible for keyboard navigation
<Button
  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  Submit
</Button>

// 5. Loading states announced to screen readers
{isPending && (
  <div role="status" aria-live="polite">
    <LoadingSpinner />
    <span className="sr-only">Loading tasks...</span>
  </div>
)}

// 6. Empty state announcements
{tasks.length === 0 && (
  <div role="status" aria-live="polite" className="text-center py-8">
    <p className="text-muted-foreground">No tasks found</p>
    <Button onClick={() => setIsCreateDialogOpen(true)}>
      Create your first task
    </Button>
  </div>
)}
```

### Accessibility Checklist for Modules

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order follows logical reading order
- [ ] Color contrast meets 4.5:1 ratio (AA standard)
- [ ] Icon-only buttons have `aria-label`
- [ ] Form fields have associated labels
- [ ] Error messages are linked via `aria-describedby`
- [ ] Loading/status changes announced via `aria-live`
- [ ] Tables have proper headers (`<th>` with `scope`)

---

## Environment Configuration

For module-specific configuration, use environment variables.

### Module Configuration (Optional)

If your module needs specific configuration:

**Backend** (`apps/api/.env`):

```env
# Task Module Configuration
TASKS_DEFAULT_DUE_DAYS=7
TASKS_MAX_ATTACHMENTS=10
TASKS_ENABLE_NOTIFICATIONS=true
```

**Service Implementation**:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TaskService {
  private readonly defaultDueDays: number;

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private configService: ConfigService
  ) {
    this.defaultDueDays = this.configService.get<number>('TASKS_DEFAULT_DUE_DAYS', 7);
  }

  async create(createDto: CreateTaskDto, user: User): Promise<Task> {
    // Use default due date if not provided
    const dueDate = createDto.dueDate
      ? new Date(createDto.dueDate)
      : addDays(new Date(), this.defaultDueDays);

    // ... rest of creation logic
  }
}
```

**Frontend** (`web/.env`):

```env
# Module feature flags
VITE_ENABLE_TASK_NOTIFICATIONS=true
VITE_TASK_POLL_INTERVAL=30000
```

**Frontend Usage**:

```typescript
// Access via import.meta.env
const enableNotifications = import.meta.env.VITE_ENABLE_TASK_NOTIFICATIONS === 'true';
const pollInterval = Number(import.meta.env.VITE_TASK_POLL_INTERVAL) || 30000;

// In React Query
const { data } = useQuery({
  queryKey: queryKeys.tasks.all,
  queryFn: tasksApi.getAll,
  refetchInterval: pollInterval,
});
```

---

## Error Handling Patterns

Implement comprehensive error handling across the module.

### API Client Error Handling

```typescript
// lib/api/error-handler.ts
import { toast } from '@/hooks/use-toast';
import { AxiosError } from 'axios';

interface ApiError {
  message: string | string[];
  statusCode: number;
  error?: string;
}

export function handleApiError(error: AxiosError<ApiError>) {
  const apiError = error.response?.data;

  // Format error message
  const message = Array.isArray(apiError?.message)
    ? apiError.message.join(', ')
    : apiError?.message || 'An unexpected error occurred';

  // Show toast notification
  toast({
    title: getErrorTitle(error.response?.status),
    description: message,
    variant: 'destructive',
  });

  // Log for debugging
  console.error('[API Error]', {
    status: error.response?.status,
    message,
    url: error.config?.url,
  });
}

function getErrorTitle(status?: number): string {
  switch (status) {
    case 400:
      return 'Validation Error';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Denied';
    case 404:
      return 'Not Found';
    case 500:
      return 'Server Error';
    default:
      return 'Error';
  }
}
```

### Usage in Mutations

```typescript
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskDto) => tasksApi.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: handleApiError,
  });
}
```

### Backend Error Response Consistency

```typescript
// Ensure consistent error responses
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Related Documentation

This guide is part of a comprehensive documentation suite:

- **ARCHITECTURE.md** - System architecture and design
- **API_ENDPOINTS.md** - Complete API endpoint reference
- **MODULE_DEVELOPMENT.md** (this document) - Step-by-step module creation guide
- **IMPLEMENTATION_PATTERNS.md** - Code patterns and best practices

## Quick Navigation

**Creating a New Module**:

1. **Understand system** → ARCHITECTURE.md
2. **Follow this tutorial** → MODULE_DEVELOPMENT.md (this document)
3. **Copy code patterns** → IMPLEMENTATION_PATTERNS.md
4. **Test with API** → API_ENDPOINTS.md

**Getting Help**:

- Need architecture overview? → ARCHITECTURE.md
- Need code examples? → IMPLEMENTATION_PATTERNS.md
- Need API details? → API_ENDPOINTS.md
- Stuck on a step? → Reference `simple-text` module in `libs/modules/simple-text/`

## Support

- **Documentation**: See related docs above
- **Examples**: Reference `simple-text` module for working code
- **Issues**: Create issues in project repository
- **Questions**: Contact development team

**Happy Coding!**
