import { lazy, Suspense } from 'react';

import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';

import AdminLayout from '@/components/layouts/admin-layout';
import CompanyLayout from '@/components/layouts/company-layout';
import EmployeeLayout from '@/components/layouts/employee-layout';
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

// Protected Route Component
function ProtectedRoute({
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
        <Route
          path="modules/clients"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientCreatePage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientDetailPage />
            </Suspense>
          }
        />
        <Route
          path="email-config"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminEmailConfigPage />
            </Suspense>
          }
        />
        {/* Email Client Routes for Admin */}
        <Route
          path="modules/email-client"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailClientIndex />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/inbox"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailInboxPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/compose"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailComposePage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/drafts"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailDraftsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/sent"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailSentPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/trash"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailTrashPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/folder/:folderName"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailFolderPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/message/:uid"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailMessagePage />
            </Suspense>
          }
        />
        {/* Tasks Routes for Admin */}
        <Route
          path="modules/tasks"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/kanban"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksKanbanPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/calendar"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksCalendarPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/timeline"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksTimelinePage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskCreatePage />
            </Suspense>
          }
        />
        {/* Time Tracking Routes for Admin */}
        <Route
          path="modules/time-tracking"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/entries"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingEntriesPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/daily"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetDailyPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/weekly"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetWeeklyPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingReportsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingSettingsPage />
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
        <Route
          path="modules/clients"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientCreatePage />
            </Suspense>
          }
        />
        <Route
          path="modules/clients/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientDetailPage />
            </Suspense>
          }
        />
        <Route
          path="email-config"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompanyEmailConfigPage />
            </Suspense>
          }
        />
        {/* Email Client Routes for Company Owner */}
        <Route
          path="modules/email-client"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailClientIndex />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/inbox"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailInboxPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/compose"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailComposePage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/drafts"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailDraftsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/sent"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailSentPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/trash"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailTrashPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/folder/:folderName"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailFolderPage />
            </Suspense>
          }
        />
        <Route
          path="modules/email-client/message/:uid"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailMessagePage />
            </Suspense>
          }
        />
        {/* Tasks Routes for Company Owner */}
        <Route
          path="modules/tasks"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksListPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/kanban"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksKanbanPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/calendar"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksCalendarPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/timeline"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksTimelinePage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/tasks/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskCreatePage />
            </Suspense>
          }
        />
        {/* Time Tracking Routes for Company Owner */}
        <Route
          path="modules/time-tracking"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/entries"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingEntriesPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/daily"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetDailyPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/timesheet/weekly"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetWeeklyPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingReportsPage />
            </Suspense>
          }
        />
        <Route
          path="modules/time-tracking/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingSettingsPage />
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
        <Route
          path="clients"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="clients/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientsListPage />
            </Suspense>
          }
        />
        <Route
          path="clients/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientCreatePage />
            </Suspense>
          }
        />
        <Route
          path="clients/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ClientDetailPage />
            </Suspense>
          }
        />
        <Route
          path="email-client"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailClientIndex />
            </Suspense>
          }
        />
        <Route
          path="email-client/inbox"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailInboxPage />
            </Suspense>
          }
        />
        <Route
          path="email-client/compose"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailComposePage />
            </Suspense>
          }
        />
        <Route
          path="email-client/drafts"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailDraftsPage />
            </Suspense>
          }
        />
        <Route
          path="email-client/sent"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailSentPage />
            </Suspense>
          }
        />
        <Route
          path="email-client/trash"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailTrashPage />
            </Suspense>
          }
        />
        <Route
          path="email-client/folder/:folderName"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailFolderPage />
            </Suspense>
          }
        />
        <Route
          path="email-client/message/:uid"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailMessagePage />
            </Suspense>
          }
        />
        {/* Tasks Routes for Employee */}
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/list"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksListPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/kanban"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksKanbanPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/calendar"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksCalendarPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/timeline"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksTimelinePage />
            </Suspense>
          }
        />
        <Route
          path="tasks/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskCreatePage />
            </Suspense>
          }
        />
        {/* Time Tracking Routes for Employee */}
        <Route
          path="time-tracking"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="time-tracking/entries"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingEntriesPage />
            </Suspense>
          }
        />
        <Route
          path="time-tracking/timesheet/daily"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetDailyPage />
            </Suspense>
          }
        />
        <Route
          path="time-tracking/timesheet/weekly"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingTimesheetWeeklyPage />
            </Suspense>
          }
        />
        <Route
          path="time-tracking/reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingReportsPage />
            </Suspense>
          }
        />
        <Route
          path="time-tracking/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingSettingsPage />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <UserEmailConfigPage />
            </Suspense>
          }
        />
        <Route
          path="account"
          element={
            <Suspense fallback={<PageLoader />}>
              <AccountSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="appearance"
          element={
            <Suspense fallback={<PageLoader />}>
              <AppearanceSettingsPage />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <NotificationsInboxPage />
            </Suspense>
          }
        />
        <Route
          path="archive"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotificationsArchivePage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotificationSettingsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
