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
const CompanyModulesPage = lazy(() => import('@/pages/admin/companies/company-modules'));
const ModulesListPage = lazy(() => import('@/pages/admin/modules/modules-list'));
const CompanyDashboard = lazy(() => import('@/pages/company/dashboard'));
const EmployeesListPage = lazy(() => import('@/pages/company/employees/employees-list'));
const EmployeePermissionsPage = lazy(() => import('@/pages/company/employees/employee-permissions'));
const CompanyModulesListPage = lazy(() => import('@/pages/company/modules/modules-list'));
const EmployeeDashboard = lazy(() => import('@/pages/employee/dashboard'));
const SimpleTextListPage = lazy(() => import('@/pages/modules/simple-text/simple-text-list'));

// AI Agent Pages
const AIAgentChatPage = lazy(() => import('@/pages/modules/ai-agent/chat'));
const AIAgentTokenUsagePage = lazy(() => import('@/pages/modules/ai-agent/token-usage'));
const AIAgentAdminTokenUsagePage = lazy(() => import('@/pages/modules/ai-agent/admin-token-usage'));
const AIAgentContextFilesPage = lazy(() => import('@/pages/modules/ai-agent/context-files'));
const AIAgentAdminConfigPage = lazy(() => import('@/pages/modules/ai-agent/admin-configuration'));
const AdminAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/admin-index'));
const CompanyAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/company-index'));
const EmployeeAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/employee-index'));

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
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
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
          path="companies/:id/modules"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompanyModulesPage />
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
        <Route
          path="modules/simple-text"
          element={
            <Suspense fallback={<PageLoader />}>
              <SimpleTextListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminAIAgentDashboard />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/chat"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentChatPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/configuration"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentAdminConfigPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/context"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentContextFilesPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/token-usage"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentAdminTokenUsagePage />
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
        <Route
          path="modules/simple-text"
          element={
            <Suspense fallback={<PageLoader />}>
              <SimpleTextListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompanyAIAgentDashboard />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/chat"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentChatPage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/token-usage"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentTokenUsagePage />
            </Suspense>
          }
        />
        <Route
          path="modules/ai-agent/context"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentContextFilesPage />
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
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeDashboard />
            </Suspense>
          }
        />
        <Route
          path="simple-text"
          element={
            <Suspense fallback={<PageLoader />}>
              <SimpleTextListPage />
            </Suspense>
          }
        />
        <Route
          path="ai-agent"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeAIAgentDashboard />
            </Suspense>
          }
        />
        <Route
          path="ai-agent/chat"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAgentChatPage />
            </Suspense>
          }
        />
      </Route>
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
