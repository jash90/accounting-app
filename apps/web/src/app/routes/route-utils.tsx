/**
 * Route utility components: ProtectedRoute, LazyRoute, error pages.
 * Extracted from routes.tsx to keep the main router file focused on route definitions.
 */
import { memo, Suspense } from 'react';

import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';


export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/**
 * Error fallback for lazy-loaded route chunks that fail to load.
 */
function LazyRouteErrorFallback() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
      <AlertTriangle className="text-destructive h-12 w-12" />
      <h2 className="text-xl font-semibold">Nie udało się załadować strony</h2>
      <p className="text-muted-foreground max-w-md text-center">
        Wystąpił problem z ładowaniem strony. Może to być spowodowane problemami z siecią lub
        aktualizacją aplikacji.
      </p>
      <Button onClick={() => window.location.reload()}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Odśwież stronę
      </Button>
    </div>
  );
}

/**
 * Wrapper that adds error boundary + Suspense around lazy-loaded routes.
 */
export function LazyRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary fallback={<LazyRouteErrorFallback />} resetKeys={[location.pathname]}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function NotFound() {
  return <div className="flex h-screen items-center justify-center">404 - Not Found</div>;
}

export function Unauthorized() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
    </div>
  );
}

export function ModuleAccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const dashboardPath =
    user?.role === UserRole.ADMIN
      ? '/admin'
      : user?.role === UserRole.COMPANY_OWNER
        ? '/company'
        : '/modules';

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <ShieldAlert className="text-destructive mx-auto h-16 w-16" />
        <h1 className="mt-6 text-2xl font-bold">Brak dostępu do modułu</h1>
        <p className="text-muted-foreground mt-2">
          Twoja firma nie ma dostępu do tego modułu. Skontaktuj się z administratorem systemu, aby
          go aktywować.
        </p>
        <Button className="mt-6" onClick={() => navigate(dashboardPath)}>
          Wróć do dashboardu
        </Button>
      </div>
    </div>
  );
}

/**
 * Protected route — checks authentication and role-based access.
 * Memoized to prevent re-renders when auth context updates but state hasn't changed.
 */
export const ProtectedRoute = memo(function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user, isLoading } = useAuthContext();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
});

/** Role constants for route protection */
export const ADMIN_ROLES = [UserRole.ADMIN];
export const OWNER_ROLES = [UserRole.COMPANY_OWNER];
export const EMPLOYEE_OWNER_ROLES = [UserRole.EMPLOYEE, UserRole.COMPANY_OWNER];
