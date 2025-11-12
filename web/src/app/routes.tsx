import { lazy, Suspense } from 'react';
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';
import AdminLayout from '@/components/layouts/admin-layout';
import CompanyLayout from '@/components/layouts/company-layout';
import EmployeeLayout from '@/components/layouts/employee-layout';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/public/login-page'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const UsersListPage = lazy(() => import('@/pages/admin/users/users-list'));
const CompaniesListPage = lazy(() => import('@/pages/admin/companies/companies-list'));
const ModulesListPage = lazy(() => import('@/pages/admin/modules/modules-list'));
const CompanyDashboard = lazy(() => import('@/pages/company/dashboard'));
const EmployeesListPage = lazy(() => import('@/pages/company/employees/employees-list'));
const EmployeePermissionsPage = lazy(() => import('@/pages/company/employees/employee-permissions'));
const CompanyModulesListPage = lazy(() => import('@/pages/company/modules/modules-list'));
const SimpleTextListPage = lazy(() => import('@/pages/modules/simple-text/simple-text-list'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-4 w-full max-w-md p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function NotFound() {
  return <div className="flex h-screen items-center justify-center">404 - Not Found</div>;
}

function Unauthorized() {
  return <div className="flex h-screen items-center justify-center">Unauthorized</div>;
}

// Protected Route Component
function ProtectedRoute({ 
  children, 
  allowedRoles 
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
}

export default function Routes() {
  return (
    <RouterRoutes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<PageLoader />}>
              <UsersListPage />
            </Suspense>
          }
        />
        <Route
          path="companies"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompaniesListPage />
            </Suspense>
          }
        />
        <Route
          path="modules"
          element={
            <Suspense fallback={<PageLoader />}>
              <ModulesListPage />
            </Suspense>
          }
        />
      </Route>
      
      <Route
        path="/company/*"
        element={
          <ProtectedRoute allowedRoles={[UserRole.COMPANY_OWNER]}>
            <CompanyLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <CompanyDashboard />
            </Suspense>
          }
        />
        <Route
          path="employees"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmployeesListPage />
            </Suspense>
          }
        />
        <Route
          path="employees/:id/permissions"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmployeePermissionsPage />
            </Suspense>
          }
        />
        <Route
          path="modules"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompanyModulesListPage />
            </Suspense>
          }
        />
      </Route>
      
      <Route
        path="/modules/*"
        element={
          <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE, UserRole.COMPANY_OWNER]}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<div>Modules Dashboard - Coming Soon</div>} />
        <Route
          path="simple-text"
          element={
            <Suspense fallback={<PageLoader />}>
              <SimpleTextListPage />
            </Suspense>
          }
        />
      </Route>
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
