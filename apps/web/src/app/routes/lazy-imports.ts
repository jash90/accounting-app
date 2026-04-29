/**
 * Lazy-loaded page imports for code splitting.
 * Extracted from routes.tsx to keep the main router file focused on route definitions.
 */
import { lazy } from 'react';

// Auth Pages
export const LoginPage = lazy(() => import('@/pages/public/login-page'));

// Admin Pages
export const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
export const UsersListPage = lazy(() => import('@/pages/admin/users/users-list'));
export const CompaniesListPage = lazy(() => import('@/pages/admin/companies/companies-list'));
export const CompanyModulesPage = lazy(() => import('@/pages/admin/companies/company-modules'));
export const ModulesListPage = lazy(() => import('@/pages/admin/modules/modules-list'));

// Company Pages
export const CompanyDashboard = lazy(() => import('@/pages/company/dashboard'));
export const CompanyProfilePage = lazy(() => import('@/pages/company/company-profile'));
export const EmployeesListPage = lazy(() => import('@/pages/company/employees/employees-list'));
export const EmployeePermissionsPage = lazy(
  () => import('@/pages/company/employees/employee-permissions')
);
export const CompanyModulesListPage = lazy(() => import('@/pages/company/modules/modules-list'));

// Employee Pages
export const EmployeeDashboard = lazy(() => import('@/pages/employee/dashboard'));

// AI Agent Pages
export const AIAgentChatPage = lazy(() => import('@/pages/modules/ai-agent/chat'));
export const AIAgentTokenUsagePage = lazy(() => import('@/pages/modules/ai-agent/token-usage'));
export const AIAgentAdminTokenUsagePage = lazy(
  () => import('@/pages/modules/ai-agent/admin-token-usage')
);
export const AIAgentContextFilesPage = lazy(() => import('@/pages/modules/ai-agent/context-files'));
export const AIAgentAdminConfigPage = lazy(
  () => import('@/pages/modules/ai-agent/admin-configuration')
);
export const AdminAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/admin-index'));
export const CompanyAIAgentDashboard = lazy(() => import('@/pages/modules/ai-agent/company-index'));
export const EmployeeAIAgentDashboard = lazy(
  () => import('@/pages/modules/ai-agent/employee-index')
);

// Settings Pages
export const UserEmailConfigPage = lazy(() => import('@/pages/settings/email-config'));
export const AccountSettingsPage = lazy(() => import('@/pages/settings/account'));
export const AppearanceSettingsPage = lazy(() => import('@/pages/settings/appearance'));
export const CompanyEmailConfigPage = lazy(() => import('@/pages/company/email-config'));
export const AdminEmailConfigPage = lazy(() => import('@/pages/admin/email-config'));

// Clients Pages
export const ClientsDashboardPage = lazy(() => import('@/pages/modules/clients/clients-dashboard'));
export const ClientsListPage = lazy(() => import('@/pages/modules/clients/clients-list'));
export const ClientDetailPage = lazy(() => import('@/pages/modules/clients/client-detail'));
export const ClientsSettingsPage = lazy(() => import('@/pages/modules/clients/clients-settings'));
export const ClientCreatePage = lazy(() => import('@/pages/modules/clients/client-create'));

// Email Client Pages
export const EmailClientIndex = lazy(() => import('@/pages/modules/email-client/index'));
export const EmailInboxPage = lazy(() => import('@/pages/modules/email-client/inbox'));
export const EmailComposePage = lazy(() => import('@/pages/modules/email-client/compose'));
export const EmailDraftsPage = lazy(() => import('@/pages/modules/email-client/drafts'));
export const EmailMessagePage = lazy(() => import('@/pages/modules/email-client/message'));
export const EmailSentPage = lazy(() => import('@/pages/modules/email-client/sent'));
export const EmailTrashPage = lazy(() => import('@/pages/modules/email-client/trash'));
export const EmailFolderPage = lazy(() => import('@/pages/modules/email-client/folder'));
export const EmailAutoReplyTemplatesPage = lazy(
  () => import('@/pages/modules/email-client/auto-reply-templates')
);

// Tasks Pages
export const TasksDashboardPage = lazy(() => import('@/pages/modules/tasks/tasks-dashboard'));
export const TasksListPage = lazy(() => import('@/pages/modules/tasks/tasks-list'));
export const TasksKanbanPage = lazy(() => import('@/pages/modules/tasks/tasks-kanban'));
export const TasksCalendarPage = lazy(() => import('@/pages/modules/tasks/tasks-calendar'));
export const TasksTimelinePage = lazy(() => import('@/pages/modules/tasks/tasks-timeline'));
export const TasksSettingsPage = lazy(() => import('@/pages/modules/tasks/tasks-settings'));
export const TaskCreatePage = lazy(() => import('@/pages/modules/tasks/task-create'));
export const TaskTemplatesListPage = lazy(
  () => import('@/pages/modules/tasks/task-templates-list')
);
export const TasksStatisticsPage = lazy(() => import('@/pages/modules/tasks/tasks-statistics'));

// Time Tracking Pages
export const TimeTrackingDashboardPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-dashboard')
);
export const TimeTrackingEntriesPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-entries')
);
export const TimeTrackingTimesheetDailyPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-timesheet-daily')
);
export const TimeTrackingTimesheetWeeklyPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-timesheet-weekly')
);
export const TimeTrackingReportsPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-reports')
);
export const TimeTrackingSettingsPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-settings')
);
export const TimeTrackingStatisticsPage = lazy(
  () => import('@/pages/modules/time-tracking/time-tracking-statistics')
);

// Offers Pages
export const OffersDashboardPage = lazy(() => import('@/pages/modules/offers/offers-dashboard'));
export const OffersListPage = lazy(() => import('@/pages/modules/offers/offers-list'));
export const OfferDetailPage = lazy(() => import('@/pages/modules/offers/offer-detail'));
export const LeadsListPage = lazy(() => import('@/pages/modules/offers/leads-list'));
export const LeadDetailPage = lazy(() => import('@/pages/modules/offers/lead-detail'));
export const TemplatesListPage = lazy(() => import('@/pages/modules/offers/templates-list'));
export const TemplateEditorPage = lazy(() => import('@/pages/modules/offers/template-editor'));

// Settlements Pages
export const SettlementsDashboardPage = lazy(
  () => import('@/pages/modules/settlements/settlements-dashboard')
);
export const SettlementsListPage = lazy(
  () => import('@/pages/modules/settlements/settlements-list')
);
export const SettlementCommentsPage = lazy(
  () => import('@/pages/modules/settlements/settlement-comments')
);
export const SettlementAssignPage = lazy(
  () => import('@/pages/modules/settlements/settlement-assign')
);
export const SettlementsTeamPage = lazy(
  () => import('@/pages/modules/settlements/settlements-team')
);
export const SettlementsSettingsPage = lazy(
  () => import('@/pages/modules/settlements/settlements-settings')
);

// Documents Pages
export const DocumentsDashboardPage = lazy(
  () => import('@/pages/modules/documents/documents-dashboard')
);
export const DocumentsTemplatesListPage = lazy(
  () => import('@/pages/modules/documents/templates-list')
);
export const GeneratedDocumentsListPage = lazy(
  () => import('@/pages/modules/documents/generated-list')
);
export const DocumentTemplateEditorPage = lazy(
  () => import('@/pages/modules/documents/template-editor')
);

// KSeF Pages
export const KsefDashboardPage = lazy(() => import('@/pages/modules/ksef/ksef-dashboard'));
export const KsefInvoicesListPage = lazy(() => import('@/pages/modules/ksef/ksef-invoices-list'));
export const KsefInvoiceDetailPage = lazy(
  () => import('@/pages/modules/ksef/ksef-invoice-detail')
);
export const KsefSessionsPage = lazy(() => import('@/pages/modules/ksef/ksef-sessions'));
export const KsefSettingsPage = lazy(() => import('@/pages/modules/ksef/ksef-settings'));
export const KsefAuditLogPage = lazy(() => import('@/pages/modules/ksef/ksef-audit-log'));
export const KsefSyncPage = lazy(() => import('@/pages/modules/ksef/ksef-sync'));

// Notifications Pages
export const NotificationsInboxPage = lazy(
  () => import('@/pages/notifications/notifications-inbox')
);
export const NotificationsArchivePage = lazy(
  () => import('@/pages/notifications/notifications-archive')
);
export const NotificationSettingsPage = lazy(
  () => import('@/pages/notifications/notifications-settings')
);
