import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';

import AdminLayout from '@/components/layouts/admin-layout';
import CompanyLayout from '@/components/layouts/company-layout';
import EmployeeLayout from '@/components/layouts/employee-layout';

import {
  AccountSettingsPage,
  AdminAIAgentDashboard,
  AdminDashboard,
  AdminEmailConfigPage,
  AIAgentAdminConfigPage,
  AIAgentAdminTokenUsagePage,
  AIAgentChatPage,
  AIAgentContextFilesPage,
  AIAgentTokenUsagePage,
  AppearanceSettingsPage,
  ClientCreatePage,
  ClientDetailPage,
  ClientsDashboardPage,
  ClientsListPage,
  ClientsSettingsPage,
  CompaniesListPage,
  CompanyAIAgentDashboard,
  CompanyDashboard,
  CompanyEmailConfigPage,
  CompanyModulesListPage,
  CompanyModulesPage,
  CompanyProfilePage,
  DocumentsDashboardPage,
  DocumentsTemplatesListPage,
  DocumentTemplateEditorPage,
  EmailAutoReplyTemplatesPage,
  EmailClientIndex,
  EmailComposePage,
  EmailDraftsPage,
  EmailFolderPage,
  EmailInboxPage,
  EmailMessagePage,
  EmailSentPage,
  EmailTrashPage,
  EmployeeAIAgentDashboard,
  EmployeeDashboard,
  EmployeePermissionsPage,
  EmployeesListPage,
  GeneratedDocumentsListPage,
  LeadDetailPage,
  LeadsListPage,
  LoginPage,
  ModulesListPage,
  NotificationsArchivePage,
  NotificationSettingsPage,
  NotificationsInboxPage,
  OfferDetailPage,
  OffersDashboardPage,
  OffersListPage,
  SettlementAssignPage,
  SettlementCommentsPage,
  SettlementsDashboardPage,
  SettlementsListPage,
  SettlementsSettingsPage,
  SettlementsTeamPage,
  TaskCreatePage,
  TasksCalendarPage,
  TasksDashboardPage,
  TasksKanbanPage,
  TasksListPage,
  TasksSettingsPage,
  TasksStatisticsPage,
  TasksTimelinePage,
  TaskTemplatesListPage,
  TemplateEditorPage,
  TemplatesListPage,
  TimeTrackingDashboardPage,
  TimeTrackingEntriesPage,
  TimeTrackingReportsPage,
  TimeTrackingSettingsPage,
  TimeTrackingStatisticsPage,
  TimeTrackingTimesheetDailyPage,
  TimeTrackingTimesheetWeeklyPage,
  UserEmailConfigPage,
  UsersListPage,
} from './routes/lazy-imports';
import {
  ADMIN_ROLES,
  EMPLOYEE_OWNER_ROLES,
  LazyRoute,
  ModuleAccessDenied,
  NotFound,
  OWNER_ROLES,
  ProtectedRoute,
  Unauthorized,
} from './routes/route-utils';

function adminRouteGroup() {
  return (
    <Route
      path="/admin/*"
      element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
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
      <Route
        path="modules/email-client/auto-reply-templates"
        element={
          <LazyRoute>
            <EmailAutoReplyTemplatesPage />
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
      <Route
        path="modules/tasks/templates"
        element={
          <LazyRoute>
            <TaskTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/tasks/statistics"
        element={
          <LazyRoute>
            <TasksStatisticsPage />
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
      <Route
        path="modules/time-tracking/statistics"
        element={
          <LazyRoute>
            <TimeTrackingStatisticsPage />
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
      {/* Documents Routes for Admin */}
      <Route
        path="modules/documents"
        element={
          <LazyRoute>
            <DocumentsDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/templates"
        element={
          <LazyRoute>
            <DocumentsTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/templates/:id/editor"
        element={
          <LazyRoute>
            <DocumentTemplateEditorPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/generated"
        element={
          <LazyRoute>
            <GeneratedDocumentsListPage />
          </LazyRoute>
        }
      />
      {/* Offers Routes for Admin */}
      <Route
        path="modules/offers"
        element={
          <LazyRoute>
            <OffersDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/list"
        element={
          <LazyRoute>
            <OffersListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/:id"
        element={
          <LazyRoute>
            <OfferDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/leads"
        element={
          <LazyRoute>
            <LeadsListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/leads/:id"
        element={
          <LazyRoute>
            <LeadDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/templates"
        element={
          <LazyRoute>
            <TemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/templates/:id/editor"
        element={
          <LazyRoute>
            <TemplateEditorPage />
          </LazyRoute>
        }
      />
    </Route>
  );
}

function companyOwnerRouteGroup() {
  return (
    <Route
      path="/company/*"
      element={
        <ProtectedRoute allowedRoles={OWNER_ROLES}>
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
        path="profile"
        element={
          <LazyRoute>
            <CompanyProfilePage />
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
      <Route
        path="modules/email-client/auto-reply-templates"
        element={
          <LazyRoute>
            <EmailAutoReplyTemplatesPage />
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
      <Route
        path="modules/tasks/templates"
        element={
          <LazyRoute>
            <TaskTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/tasks/statistics"
        element={
          <LazyRoute>
            <TasksStatisticsPage />
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
      <Route
        path="modules/time-tracking/statistics"
        element={
          <LazyRoute>
            <TimeTrackingStatisticsPage />
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
      {/* Documents Routes for Company Owner */}
      <Route
        path="modules/documents"
        element={
          <LazyRoute>
            <DocumentsDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/templates"
        element={
          <LazyRoute>
            <DocumentsTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/templates/:id/editor"
        element={
          <LazyRoute>
            <DocumentTemplateEditorPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/documents/generated"
        element={
          <LazyRoute>
            <GeneratedDocumentsListPage />
          </LazyRoute>
        }
      />
      {/* Offers Routes for Company Owner */}
      <Route
        path="modules/offers"
        element={
          <LazyRoute>
            <OffersDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/list"
        element={
          <LazyRoute>
            <OffersListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/:id"
        element={
          <LazyRoute>
            <OfferDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/leads"
        element={
          <LazyRoute>
            <LeadsListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/leads/:id"
        element={
          <LazyRoute>
            <LeadDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/templates"
        element={
          <LazyRoute>
            <TemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="modules/offers/templates/:id/editor"
        element={
          <LazyRoute>
            <TemplateEditorPage />
          </LazyRoute>
        }
      />
    </Route>
  );
}

function moduleRouteGroup() {
  return (
    <Route
      path="/modules/*"
      element={
        <ProtectedRoute allowedRoles={EMPLOYEE_OWNER_ROLES}>
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
      <Route
        path="email-client/auto-reply-templates"
        element={
          <LazyRoute>
            <EmailAutoReplyTemplatesPage />
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
      <Route
        path="tasks/templates"
        element={
          <LazyRoute>
            <TaskTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="tasks/statistics"
        element={
          <LazyRoute>
            <TasksStatisticsPage />
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
      <Route
        path="time-tracking/statistics"
        element={
          <LazyRoute>
            <TimeTrackingStatisticsPage />
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
      {/* Documents Routes for Employee */}
      <Route
        path="documents"
        element={
          <LazyRoute>
            <DocumentsDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="documents/templates"
        element={
          <LazyRoute>
            <DocumentsTemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="documents/templates/:id/editor"
        element={
          <LazyRoute>
            <DocumentTemplateEditorPage />
          </LazyRoute>
        }
      />
      <Route
        path="documents/generated"
        element={
          <LazyRoute>
            <GeneratedDocumentsListPage />
          </LazyRoute>
        }
      />
      {/* Offers Routes for Employee */}
      <Route
        path="offers"
        element={
          <LazyRoute>
            <OffersDashboardPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/list"
        element={
          <LazyRoute>
            <OffersListPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/:id"
        element={
          <LazyRoute>
            <OfferDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/leads"
        element={
          <LazyRoute>
            <LeadsListPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/leads/:id"
        element={
          <LazyRoute>
            <LeadDetailPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/templates"
        element={
          <LazyRoute>
            <TemplatesListPage />
          </LazyRoute>
        }
      />
      <Route
        path="offers/templates/:id/editor"
        element={
          <LazyRoute>
            <TemplateEditorPage />
          </LazyRoute>
        }
      />
    </Route>
  );
}

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
      <Route path="/module-access-denied" element={<ModuleAccessDenied />} />

      {adminRouteGroup()}

      {companyOwnerRouteGroup()}

      {moduleRouteGroup()}

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
