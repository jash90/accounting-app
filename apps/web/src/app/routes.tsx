import { lazy, memo, Suspense } from 'react';

import { Navigate, Route, Routes as RouterRoutes, useLocation } from 'react-router-dom';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/error-boundary';
import AdminLayout from '@/components/layouts/admin-layout';
import CompanyLayout from '@/components/layouts/company-layout';
import EmployeeLayout from '@/components/layouts/employee-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';


// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/public/login-page'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const UsersListPage = lazy(() => import('@/pages/admin/users/users-list'));
const CompaniesListPage = lazy(() => import('@/pages/admin/companies/companies-list'));
const CompanyModulesPage = lazy(() => import('@/pages/admin/companies/company-modules'));
const ModulesListPage = lazy(() => import('@/pages/admin/modules/modules-list'));
const CompanyDashboard = lazy(() => import('@/pages/company/dashboard'));
const EmployeesListPage = lazy(() => import('@/pages/company/employees/employees-list'));
const EmployeePermissionsPage = lazy(
  () => import('@/pages/company/employees/employee-permissions')
);
const CompanyModulesListPage = lazy(() => import('@/pages/company/modules/modules-list'));
const EmployeeDashboard = lazy(() => import('@/pages/employee/dashboard'));

// AI Agent Pages
const AIAgentChatPage = lazy(() => import('@/pages/modules/ai-agent/chat'));
const AIAgentTokenUsagePage = lazy(() => import('@/pages/modules/ai-agent/token-usage'));
const AIAgentAdminTokenUsagePage = lazy(() => import('@/pages/modules/ai-agent/admin-token-usage'));
const AIAgentContextFilesPage = lazy(() => import('@/pages/modules/ai-agent/context-files'));
const AIAgentAdminConfigPage = lazy(() => import('@/pages/modules/ai-agent/admin-configuration'));
const AdminAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/admin-index'));
const CompanyAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/company-index'));
const EmployeeAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/employee-index'));

// Settings Pages
const UserEmailConfigPage = lazy(() => import('@/pages/settings/email-config'));
const AccountSettingsPage = lazy(() => import('@/pages/settings/account'));
const AppearanceSettingsPage = lazy(() => import('@/pages/settings/appearance'));
const CompanyEmailConfigPage = lazy(() => import('@/pages/company/email-config'));
const AdminEmailConfigPage = lazy(() => import('@/pages/admin/email-config'));

// Clients Pages
const ClientsDashboardPage = lazy(() => import('@/pages/modules/clients/clients-dashboard'));
const ClientsListPage = lazy(() => import('@/pages/modules/clients/clients-list'));
const ClientDetailPage = lazy(() => import('@/pages/modules/clients/client-detail'));
const ClientsSettingsPage = lazy(() => import('@/pages/modules/clients/clients-settings'));
const ClientCreatePage = lazy(() => import('@/pages/modules/clients/client-create'));

// Email Client Pages
const EmailClientIndex = lazy(() => import('@/pages/modules/email-client/index'));
const EmailInboxPage = lazy(() => import('@/pages/modules/email-client/inbox'));
const EmailComposePage = lazy(() => import('@/pages/modules/email-client/compose'));
const EmailDraftsPage = lazy(() => import('@/pages/modules/email-client/drafts'));
const EmailMessagePage = lazy(() => import('@/pages/modules/email-client/message'));
const EmailSentPage = lazy(() => import('@/pages/modules/email-client/sent'));
const EmailTrashPage = lazy(() => import('@/pages/modules/email-client/trash'));
const EmailFolderPage = lazy(() => import('@/pages/modules/email-client/folder'));

// Tasks Pages
const TasksDashboardPage = lazy(() => import('@/pages/modules/tasks/tasks-dashboard'));
const TasksListPage = lazy(() => import('@/pages/modules/tasks/tasks-list'));
const TasksKanbanPage = lazy(() => import('@/pages/modules/tasks/tasks-kanban'));
const TasksCalendarPage = lazy(() => import('@/pages/modules/tasks/tasks-calendar'));
const TasksTimelinePage = lazy(() => import('@/pages/modules/tasks/tasks-timeline'));
const TasksSettingsPage = lazy(() => import('@/pages/modules/tasks/tasks-settings'));
const TaskCreatePage = lazy(() => import('@/pages/modules/tasks/task-create'));

// Time Tracking Pages
const TimeTrackingDashboardPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-dashboard')
);
const TimeTrackingEntriesPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-entries')
);
const TimeTrackingTimesheetDailyPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-timesheet-daily')
);
const TimeTrackingTimesheetWeeklyPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-timesheet-weekly')
);
const TimeTrackingReportsPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-reports')
);
const TimeTrackingSettingsPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-settings')
);

// Settlements Pages
const SettlementsDashboardPage = lazy(
  () => import('@/pages/modules/settlements/settlements-dashboard')
);
const SettlementsListPage = lazy(() => import('@/pages/modules/settlements/settlements-list'));
const SettlementCommentsPage = lazy(
  () => import('@/pages/modules/settlements/settlement-comments')
);
const SettlementAssignPage = lazy(() => import('@/pages/modules/settlements/settlement-assign'));
const SettlementsTeamPage = lazy(() => import('@/pages/modules/settlements/settlements-team'));
const SettlementsSettingsPage = lazy(
  () => import('@/pages/modules/settlements/settlements-settings')
);

// Notifications Pages
const NotificationsInboxPage = lazy(() => import('@/pages/notifications/notifications-inbox'));
const NotificationsArchivePage = lazy(() => import('@/pages/notifications/notifications-archive'));
const NotificationSettingsPage = lazy(() => import('@/pages/notifications/notifications-settings'));

function PageLoader() {
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
 * Shows a retry UI when chunk loading fails (network issues, deployment, etc.)
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
 * Wrapper component that adds error boundary around lazy-loaded routes.
 * Catches chunk load failures and shows a retry UI.
 * Auto-resets when navigating to a different route via resetKeys.
 */
function LazyRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary fallback={<LazyRouteErrorFallback />} resetKeys={[location.pathname]}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function NotFound() {
  return <div className="flex h-screen items-center justify-center">404 - Not Found</div>;
}

function Unauthorized() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
    </div>
  );
}

// Protected Route Component - memoized to prevent unnecessary re-renders
// when auth context updates (e.g., token refresh) but auth state hasn't changed
const ProtectedRoute = memo(function ProtectedRoute({
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

export default function Routes() {
  return (
    <RouterRoutes>
      <Route
        path="/login"
        element={
          <LazyRoute>
            <LoginPage />
          </LazyRoute>
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
            <LazyRoute>
              <AdminDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="users"
          element={
            <LazyRoute>
              <UsersListPage />
            </LazyRoute>
          }
        />
        <Route
          path="companies"
          element={
            <LazyRoute>
              <CompaniesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="companies/:id/modules"
          element={
            <LazyRoute>
              <CompanyModulesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules"
          element={
            <LazyRoute>
              <ModulesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent"
          element={
            <LazyRoute>
              <AdminAIAgentDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/chat"
          element={
            <LazyRoute>
              <AIAgentChatPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/configuration"
          element={
            <LazyRoute>
              <AIAgentAdminConfigPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/context"
          element={
            <LazyRoute>
              <AIAgentContextFilesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/token-usage"
          element={
            <LazyRoute>
              <AIAgentAdminTokenUsagePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients"
          element={
            <LazyRoute>
              <ClientsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/list"
          element={
            <LazyRoute>
              <ClientsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/settings"
          element={
            <LazyRoute>
              <ClientsSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/create"
          element={
            <LazyRoute>
              <ClientCreatePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/:id"
          element={
            <LazyRoute>
              <ClientDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <AdminEmailConfigPage />
            </LazyRoute>
          }
        />
        {/* Email Client Routes for Admin */}
        <Route
          path="modules/email-client"
          element={
            <LazyRoute>
              <EmailClientIndex />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/inbox"
          element={
            <LazyRoute>
              <EmailInboxPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/compose"
          element={
            <LazyRoute>
              <EmailComposePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/drafts"
          element={
            <LazyRoute>
              <EmailDraftsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/sent"
          element={
            <LazyRoute>
              <EmailSentPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/trash"
          element={
            <LazyRoute>
              <EmailTrashPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/folder/:folderName"
          element={
            <LazyRoute>
              <EmailFolderPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/message/:uid"
          element={
            <LazyRoute>
              <EmailMessagePage />
            </LazyRoute>
          }
        />
        {/* Tasks Routes for Admin */}
        <Route
          path="modules/tasks"
          element={
            <LazyRoute>
              <TasksDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/list"
          element={
            <LazyRoute>
              <TasksListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/kanban"
          element={
            <LazyRoute>
              <TasksKanbanPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/calendar"
          element={
            <LazyRoute>
              <TasksCalendarPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/timeline"
          element={
            <LazyRoute>
              <TasksTimelinePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/settings"
          element={
            <LazyRoute>
              <TasksSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/create"
          element={
            <LazyRoute>
              <TaskCreatePage />
            </LazyRoute>
          }
        />
        {/* Time Tracking Routes for Admin */}
        <Route
          path="modules/time-tracking"
          element={
            <LazyRoute>
              <TimeTrackingDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/entries"
          element={
            <LazyRoute>
              <TimeTrackingEntriesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/daily"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetDailyPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/weekly"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetWeeklyPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/reports"
          element={
            <LazyRoute>
              <TimeTrackingReportsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/settings"
          element={
            <LazyRoute>
              <TimeTrackingSettingsPage />
            </LazyRoute>
          }
        />
        {/* Settlements Routes for Admin */}
        <Route
          path="modules/settlements"
          element={
            <LazyRoute>
              <SettlementsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/list"
          element={
            <LazyRoute>
              <SettlementsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/:id/comments"
          element={
            <LazyRoute>
              <SettlementCommentsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/:id/assign"
          element={
            <LazyRoute>
              <SettlementAssignPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/team"
          element={
            <LazyRoute>
              <SettlementsTeamPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/settings"
          element={
            <LazyRoute>
              <SettlementsSettingsPage />
            </LazyRoute>
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
            <LazyRoute>
              <CompanyDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="employees"
          element={
            <LazyRoute>
              <EmployeesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="employees/:id/permissions"
          element={
            <LazyRoute>
              <EmployeePermissionsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules"
          element={
            <LazyRoute>
              <CompanyModulesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent"
          element={
            <LazyRoute>
              <CompanyAIAgentDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/chat"
          element={
            <LazyRoute>
              <AIAgentChatPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/token-usage"
          element={
            <LazyRoute>
              <AIAgentTokenUsagePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/ai-agent/context"
          element={
            <LazyRoute>
              <AIAgentContextFilesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients"
          element={
            <LazyRoute>
              <ClientsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/list"
          element={
            <LazyRoute>
              <ClientsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/settings"
          element={
            <LazyRoute>
              <ClientsSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/create"
          element={
            <LazyRoute>
              <ClientCreatePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/clients/:id"
          element={
            <LazyRoute>
              <ClientDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <CompanyEmailConfigPage />
            </LazyRoute>
          }
        />
        {/* Email Client Routes for Company Owner */}
        <Route
          path="modules/email-client"
          element={
            <LazyRoute>
              <EmailClientIndex />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/inbox"
          element={
            <LazyRoute>
              <EmailInboxPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/compose"
          element={
            <LazyRoute>
              <EmailComposePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/drafts"
          element={
            <LazyRoute>
              <EmailDraftsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/sent"
          element={
            <LazyRoute>
              <EmailSentPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/trash"
          element={
            <LazyRoute>
              <EmailTrashPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/folder/:folderName"
          element={
            <LazyRoute>
              <EmailFolderPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/email-client/message/:uid"
          element={
            <LazyRoute>
              <EmailMessagePage />
            </LazyRoute>
          }
        />
        {/* Tasks Routes for Company Owner */}
        <Route
          path="modules/tasks"
          element={
            <LazyRoute>
              <TasksDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/list"
          element={
            <LazyRoute>
              <TasksListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/kanban"
          element={
            <LazyRoute>
              <TasksKanbanPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/calendar"
          element={
            <LazyRoute>
              <TasksCalendarPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/timeline"
          element={
            <LazyRoute>
              <TasksTimelinePage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/settings"
          element={
            <LazyRoute>
              <TasksSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/tasks/create"
          element={
            <LazyRoute>
              <TaskCreatePage />
            </LazyRoute>
          }
        />
        {/* Time Tracking Routes for Company Owner */}
        <Route
          path="modules/time-tracking"
          element={
            <LazyRoute>
              <TimeTrackingDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/entries"
          element={
            <LazyRoute>
              <TimeTrackingEntriesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/daily"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetDailyPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/weekly"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetWeeklyPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/reports"
          element={
            <LazyRoute>
              <TimeTrackingReportsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/time-tracking/settings"
          element={
            <LazyRoute>
              <TimeTrackingSettingsPage />
            </LazyRoute>
          }
        />
        {/* Settlements Routes for Company Owner */}
        <Route
          path="modules/settlements"
          element={
            <LazyRoute>
              <SettlementsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/list"
          element={
            <LazyRoute>
              <SettlementsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/:id/comments"
          element={
            <LazyRoute>
              <SettlementCommentsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/:id/assign"
          element={
            <LazyRoute>
              <SettlementAssignPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/team"
          element={
            <LazyRoute>
              <SettlementsTeamPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules/settlements/settings"
          element={
            <LazyRoute>
              <SettlementsSettingsPage />
            </LazyRoute>
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
            <LazyRoute>
              <EmployeeDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="ai-agent"
          element={
            <LazyRoute>
              <EmployeeAIAgentDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="ai-agent/chat"
          element={
            <LazyRoute>
              <AIAgentChatPage />
            </LazyRoute>
          }
        />
        <Route
          path="clients"
          element={
            <LazyRoute>
              <ClientsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="clients/list"
          element={
            <LazyRoute>
              <ClientsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="clients/create"
          element={
            <LazyRoute>
              <ClientCreatePage />
            </LazyRoute>
          }
        />
        <Route
          path="clients/:id"
          element={
            <LazyRoute>
              <ClientDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client"
          element={
            <LazyRoute>
              <EmailClientIndex />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/inbox"
          element={
            <LazyRoute>
              <EmailInboxPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/compose"
          element={
            <LazyRoute>
              <EmailComposePage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/drafts"
          element={
            <LazyRoute>
              <EmailDraftsPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/sent"
          element={
            <LazyRoute>
              <EmailSentPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/trash"
          element={
            <LazyRoute>
              <EmailTrashPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/folder/:folderName"
          element={
            <LazyRoute>
              <EmailFolderPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-client/message/:uid"
          element={
            <LazyRoute>
              <EmailMessagePage />
            </LazyRoute>
          }
        />
        {/* Tasks Routes for Employee */}
        <Route
          path="tasks"
          element={
            <LazyRoute>
              <TasksDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/list"
          element={
            <LazyRoute>
              <TasksListPage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/kanban"
          element={
            <LazyRoute>
              <TasksKanbanPage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/calendar"
          element={
            <LazyRoute>
              <TasksCalendarPage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/timeline"
          element={
            <LazyRoute>
              <TasksTimelinePage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/settings"
          element={
            <LazyRoute>
              <TasksSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="tasks/create"
          element={
            <LazyRoute>
              <TaskCreatePage />
            </LazyRoute>
          }
        />
        {/* Time Tracking Routes for Employee */}
        <Route
          path="time-tracking"
          element={
            <LazyRoute>
              <TimeTrackingDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="time-tracking/entries"
          element={
            <LazyRoute>
              <TimeTrackingEntriesPage />
            </LazyRoute>
          }
        />
        <Route
          path="time-tracking/timesheet/daily"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetDailyPage />
            </LazyRoute>
          }
        />
        <Route
          path="time-tracking/timesheet/weekly"
          element={
            <LazyRoute>
              <TimeTrackingTimesheetWeeklyPage />
            </LazyRoute>
          }
        />
        <Route
          path="time-tracking/reports"
          element={
            <LazyRoute>
              <TimeTrackingReportsPage />
            </LazyRoute>
          }
        />
        <Route
          path="time-tracking/settings"
          element={
            <LazyRoute>
              <TimeTrackingSettingsPage />
            </LazyRoute>
          }
        />
        {/* Settlements Routes for Employee */}
        <Route
          path="settlements"
          element={
            <LazyRoute>
              <SettlementsDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="settlements/list"
          element={
            <LazyRoute>
              <SettlementsListPage />
            </LazyRoute>
          }
        />
        <Route
          path="settlements/:id/comments"
          element={
            <LazyRoute>
              <SettlementCommentsPage />
            </LazyRoute>
          }
        />
      </Route>

      {/* Settings Routes - Accessible to all authenticated users */}
      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <UserEmailConfigPage />
            </LazyRoute>
          }
        />
        <Route
          path="account"
          element={
            <LazyRoute>
              <AccountSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="appearance"
          element={
            <LazyRoute>
              <AppearanceSettingsPage />
            </LazyRoute>
          }
        />
      </Route>

      {/* Notifications Routes - Accessible to all authenticated users */}
      <Route
        path="/notifications/*"
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <NotificationsInboxPage />
            </LazyRoute>
          }
        />
        <Route
          path="archive"
          element={
            <LazyRoute>
              <NotificationsArchivePage />
            </LazyRoute>
          }
        />
        <Route
          path="settings"
          element={
            <LazyRoute>
              <NotificationSettingsPage />
            </LazyRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
