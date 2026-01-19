# Frontend Module Patterns

> [← Back to Index](./README.md) | [← Previous: Module Configuration](./15-module-configuration.md)

## Dashboard Page Pattern

Each module has a dashboard page that serves as the entry point with statistics, view options, and settings access.

**File Location**: `apps/web/src/pages/modules/{module}/{module}-dashboard.tsx`

### Pattern Structure

```typescript
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare, List, LayoutGrid, Calendar, GanttChartSquare,
  Settings, ArrowRight, Clock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/auth-context';
import { useTasks } from '@/lib/hooks/use-tasks';
import { UserRole, TaskStatus } from '@/types/enums';

export default function TasksDashboardPage() {
  const { user } = useAuthContext();
  const { data, isPending } = useTasks();

  // Extract data from paginated response
  const tasks = data?.data ?? [];

  // Calculate statistics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() &&
           t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED
  ).length;
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;

  // Role-based path helper
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN: return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER: return '/company/modules/tasks';
      default: return '/modules/tasks';
    }
  };

  const basePath = getBasePath();

  // View options with Polish labels
  const views = [
    {
      title: 'Lista zadan',
      description: 'Przegladaj wszystkie zadania w formie tabeli',
      icon: List,
      href: `${basePath}/list`,
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Tablica Kanban',
      description: 'Zarzadzaj zadaniami metoda przeciagnij i upusc',
      icon: LayoutGrid,
      href: `${basePath}/kanban`,
      gradient: 'bg-apptax-dark-gradient',
    },
    {
      title: 'Kalendarz',
      description: 'Wyswietl zadania w widoku kalendarza',
      icon: Calendar,
      href: `${basePath}/calendar`,
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
  ];

  // Settings only for admin/owner
  const showSettings = user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Polish title */}
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Modul Zadania
          <div className="w-3 h-3 rounded-full bg-apptax-teal" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarzadzanie zadaniami z wieloma widokami
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total tasks */}
        <Card className="border-apptax-soft-teal/30">
          <CardHeader className="pb-2">
            <CardDescription>Wszystkie zadania</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-apptax-gradient text-white">
                <CheckSquare className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold text-apptax-navy">{totalTasks}</span>
            </div>
          </CardContent>
        </Card>
        {/* Additional stat cards... */}
      </div>

      {/* View Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {views.map((view) => (
          <Card key={view.title} className="hover:shadow-apptax-md transition-all">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${view.gradient} text-white`}>
                  <view.icon className="h-6 w-6" />
                </div>
                <CardTitle>{view.title}</CardTitle>
              </div>
              <CardDescription>{view.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={view.href}>
                <Button className="w-full bg-apptax-blue hover:bg-apptax-blue/90">
                  Otworz
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Card (admin/owner only) */}
      {showSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gray-700 text-white">
                <Settings className="h-6 w-6" />
              </div>
              <CardTitle>Ustawienia modulu</CardTitle>
            </div>
            <CardDescription>
              Zarzadzaj etykietami, domyslnymi ustawieniami i powiadomieniami
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`${basePath}/settings`}>
              <Button variant="outline" className="w-full">
                Otworz ustawienia
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Dynamic Navigation Hook

The navigation is built dynamically from the API using the `useNavigationItems` hook.

**File Location**: `apps/web/src/hooks/use-navigation-items.ts`

```typescript
import { useMemo } from 'react';
import { LayoutDashboard, Users, Building2, Package } from 'lucide-react';
import { UserDto } from '@/types/dtos';
import { UserRole } from '@/types/enums';
import { useModules } from '@/lib/hooks/use-modules';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { NavItem } from '@/components/sidebar';

export function useNavigationItems(user: UserDto | null): NavItem[] {
  // Fetch modules based on user role
  const { data: allModules } = useModules();
  const { data: companyModules } = useCompanyModules();

  return useMemo(() => {
    if (!user) return [];

    const baseItems: NavItem[] = [];

    switch (user.role) {
      case UserRole.ADMIN:
        // Admin base navigation
        baseItems.push(
          { label: 'Pulpit', href: '/admin', icon: LayoutDashboard },
          { label: 'Uzytkownicy', href: '/admin/users', icon: Users },
          { label: 'Firmy', href: '/admin/companies', icon: Building2 },
          { label: 'Moduly', href: '/admin/modules', icon: Package },
        );

        // Add all modules for admin
        if (allModules) {
          allModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name, // Polish name from module.json
                href: `/admin/modules/${module.slug}`,
                icon: Package,
              });
            }
          });
        }
        break;

      case UserRole.COMPANY_OWNER:
        // Company owner base navigation
        baseItems.push(
          { label: 'Pulpit', href: '/company', icon: LayoutDashboard },
          { label: 'Pracownicy', href: '/company/employees', icon: Users },
          { label: 'Moduly', href: '/company/modules', icon: Package },
        );

        // Add company modules for company owner
        if (companyModules) {
          companyModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name,
                href: `/company/modules/${module.slug}`,
                icon: Package,
              });
            }
          });
        }
        break;

      case UserRole.EMPLOYEE:
        // Employee base navigation
        baseItems.push(
          { label: 'Pulpit', href: '/modules', icon: LayoutDashboard },
        );

        // Add company modules for employee
        if (companyModules) {
          companyModules.forEach((module) => {
            if (module.isActive) {
              baseItems.push({
                label: module.name,
                href: `/modules/${module.slug}`,
                icon: Package,
              });
            }
          });
        }
        break;
    }

    return baseItems;
  }, [user, allModules, companyModules]);
}
```

---

## Polish Localization

All user-facing text must be in Polish. Use the constants file for reusable labels.

**File Location**: `apps/web/src/lib/constants/polish-labels.ts`

```typescript
import { TaskStatus, TaskPriority, CustomFieldType } from '@/types/enums';

// Task Status Labels
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'Do zrobienia',
  [TaskStatus.IN_PROGRESS]: 'W trakcie',
  [TaskStatus.DONE]: 'Ukonczone',
  [TaskStatus.CANCELLED]: 'Anulowane',
};

// Task Priority Labels
export const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Niski',
  [TaskPriority.MEDIUM]: 'Sredni',
  [TaskPriority.HIGH]: 'Wysoki',
  [TaskPriority.URGENT]: 'Pilny',
};

// Custom Field Type Labels
export const CustomFieldTypeLabels: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};

// Common UI Labels
export const CommonLabels = {
  actions: 'Akcje',
  save: 'Zapisz',
  cancel: 'Anuluj',
  delete: 'Usun',
  edit: 'Edytuj',
  create: 'Utworz',
  search: 'Szukaj',
  filter: 'Filtruj',
  loading: 'Ladowanie...',
  noResults: 'Brak wynikow',
  confirmDelete: 'Czy na pewno chcesz usunac?',
};
```

### Toast Messages in Polish

```typescript
import { toast } from '@/hooks/use-toast';

// Success messages
toast({
  title: 'Sukces',
  description: 'Zadanie zostalo utworzone',
});

// Error messages
toast({
  title: 'Blad',
  description: 'Nie udalo sie utworzyc zadania',
  variant: 'destructive',
});

// With error context
onError: (error: ApiErrorResponse) => {
  toast({
    title: 'Blad',
    description: error.response?.data?.message || 'Wystapil nieoczekiwany blad',
    variant: 'destructive',
  });
}
```

---

## Role-Based Path Helper

Use the `getBasePath` helper in all module pages to generate correct URLs based on user role.

```typescript
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';

export function useModuleBasePath(moduleSlug: string): string {
  const { user } = useAuthContext();

  switch (user?.role) {
    case UserRole.ADMIN:
      return `/admin/modules/${moduleSlug}`;
    case UserRole.COMPANY_OWNER:
      return `/company/modules/${moduleSlug}`;
    default:
      return `/modules/${moduleSlug}`;
  }
}

// Usage in components
const basePath = useModuleBasePath('tasks');
// Navigate to: basePath + '/list', basePath + '/kanban', etc.
```

---

## Conclusion

Congratulations! You've successfully created a new business module with:

- Multi-tenant data isolation
- RBAC integration
- Complete CRUD operations
- Database migration
- Comprehensive validation
- Swagger documentation
- Security best practices

### Next Steps

1. **Add more features**: Search, filtering, pagination
2. **Optimize performance**: Add indexes, caching
3. **Write tests**: Unit tests, E2E tests
4. **Monitor**: Add logging, metrics
5. **Document**: Update README, API docs

---

> **Next:** [Additional Topics](./17-additional-topics.md)
