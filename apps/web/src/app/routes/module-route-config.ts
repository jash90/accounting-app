/**
 * Declarative module route configuration.
 * Defines module routes ONCE — generated dynamically for admin, company, and employee layouts.
 * Eliminates ~700 lines of triplicated JSX route definitions.
 */
import type { ComponentType, LazyExoticComponent } from 'react';

import {
  AdminAIAgentDashboard,
  AIAgentAdminConfigPage,
  AIAgentAdminTokenUsagePage,
  AIAgentChatPage,
  AIAgentContextFilesPage,
  AIAgentTokenUsagePage,
  ClientCreatePage,
  ClientDetailPage,
  ClientsDashboardPage,
  ClientsListPage,
  ClientsSettingsPage,
  CompanyAIAgentDashboard,
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
  GeneratedDocumentsListPage,
  KsefAuditLogPage,
  KsefDashboardPage,
  KsefInvoiceDetailPage,
  KsefInvoicesListPage,
  KsefSessionsPage,
  KsefSettingsPage,
  KsefSyncPage,
  LeadDetailPage,
  LeadsListPage,
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
} from './lazy-imports';

export type LayoutType = 'admin' | 'company' | 'employee';

export interface SubRoute {
  /** Route path relative to module (empty string = index route) */
  path: string;
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType>;
  /** Only include in these layout groups. Default: all three */
  layouts?: LayoutType[];
}

export interface ModuleRouteConfig {
  /** Module path prefix (e.g., 'clients', 'tasks') */
  path: string;
  /** Sub-routes within the module */
  routes: SubRoute[];
}

const ADMIN_COMPANY: LayoutType[] = ['admin', 'company'];

/**
 * Single source of truth for all module routes.
 * Each module defines its sub-routes once; the router generates
 * admin, company, and employee route groups dynamically.
 */
export const MODULE_ROUTES: ModuleRouteConfig[] = [
  // === AI Agent ===
  {
    path: 'ai-agent',
    routes: [
      // Each layout gets its own dashboard component
      { path: '', component: AdminAIAgentDashboard, layouts: ['admin'] },
      { path: '', component: CompanyAIAgentDashboard, layouts: ['company'] },
      { path: '', component: EmployeeAIAgentDashboard, layouts: ['employee'] },
      { path: 'chat', component: AIAgentChatPage },
      { path: 'context', component: AIAgentContextFilesPage, layouts: ADMIN_COMPANY },
      { path: 'configuration', component: AIAgentAdminConfigPage, layouts: ['admin'] },
      { path: 'token-usage', component: AIAgentAdminTokenUsagePage, layouts: ['admin'] },
      { path: 'token-usage', component: AIAgentTokenUsagePage, layouts: ['company'] },
    ],
  },

  // === Clients ===
  {
    path: 'clients',
    routes: [
      { path: '', component: ClientsDashboardPage },
      { path: 'list', component: ClientsListPage },
      { path: 'settings', component: ClientsSettingsPage, layouts: ADMIN_COMPANY },
      { path: 'create', component: ClientCreatePage },
      { path: ':id', component: ClientDetailPage },
    ],
  },

  // === Email Client ===
  {
    path: 'email-client',
    routes: [
      { path: '', component: EmailClientIndex },
      { path: 'inbox', component: EmailInboxPage },
      { path: 'compose', component: EmailComposePage },
      { path: 'drafts', component: EmailDraftsPage },
      { path: 'sent', component: EmailSentPage },
      { path: 'trash', component: EmailTrashPage },
      { path: 'folder/:folderName', component: EmailFolderPage },
      { path: 'message/:uid', component: EmailMessagePage },
      { path: 'auto-reply-templates', component: EmailAutoReplyTemplatesPage },
    ],
  },

  // === Tasks ===
  {
    path: 'tasks',
    routes: [
      { path: '', component: TasksDashboardPage },
      { path: 'list', component: TasksListPage },
      { path: 'kanban', component: TasksKanbanPage },
      { path: 'calendar', component: TasksCalendarPage },
      { path: 'timeline', component: TasksTimelinePage },
      { path: 'settings', component: TasksSettingsPage },
      { path: 'create', component: TaskCreatePage },
      { path: 'templates', component: TaskTemplatesListPage },
      { path: 'statistics', component: TasksStatisticsPage },
    ],
  },

  // === Time Tracking ===
  {
    path: 'time-tracking',
    routes: [
      { path: '', component: TimeTrackingDashboardPage },
      { path: 'entries', component: TimeTrackingEntriesPage },
      { path: 'timesheet/daily', component: TimeTrackingTimesheetDailyPage },
      { path: 'timesheet/weekly', component: TimeTrackingTimesheetWeeklyPage },
      { path: 'reports', component: TimeTrackingReportsPage },
      { path: 'settings', component: TimeTrackingSettingsPage },
      { path: 'statistics', component: TimeTrackingStatisticsPage },
    ],
  },

  // === Settlements ===
  {
    path: 'settlements',
    routes: [
      { path: '', component: SettlementsDashboardPage },
      { path: 'list', component: SettlementsListPage },
      { path: ':id/comments', component: SettlementCommentsPage },
      { path: ':id/assign', component: SettlementAssignPage, layouts: ADMIN_COMPANY },
      { path: 'team', component: SettlementsTeamPage, layouts: ADMIN_COMPANY },
      { path: 'settings', component: SettlementsSettingsPage, layouts: ADMIN_COMPANY },
    ],
  },

  // === Documents ===
  {
    path: 'documents',
    routes: [
      { path: '', component: DocumentsDashboardPage },
      { path: 'templates', component: DocumentsTemplatesListPage },
      { path: 'templates/:id/editor', component: DocumentTemplateEditorPage },
      { path: 'generated', component: GeneratedDocumentsListPage },
    ],
  },

  // === KSeF ===
  {
    path: 'ksef',
    routes: [
      { path: '', component: KsefDashboardPage },
      { path: 'invoices', component: KsefInvoicesListPage },
      { path: 'invoices/:id', component: KsefInvoiceDetailPage },
      { path: 'sessions', component: KsefSessionsPage },
      { path: 'sync', component: KsefSyncPage },
      { path: 'settings', component: KsefSettingsPage, layouts: ADMIN_COMPANY },
      { path: 'audit', component: KsefAuditLogPage, layouts: ADMIN_COMPANY },
    ],
  },

  // === Offers ===
  {
    path: 'offers',
    routes: [
      { path: '', component: OffersDashboardPage },
      { path: 'list', component: OffersListPage },
      { path: ':id', component: OfferDetailPage },
      { path: 'leads', component: LeadsListPage },
      { path: 'leads/:id', component: LeadDetailPage },
      { path: 'templates', component: TemplatesListPage },
      { path: 'templates/:id/editor', component: TemplateEditorPage },
    ],
  },
];
