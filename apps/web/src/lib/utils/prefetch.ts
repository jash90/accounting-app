/**
 * Route prefetching utility for lazy-loaded components.
 * Preloads route chunks on hover/focus to reduce navigation latency.
 *
 * Usage:
 * - Call prefetchRoute(path) when user hovers over a navigation link
 * - Chunks are cached after first prefetch (won't re-fetch)
 */

type RouteLoader = () => Promise<unknown>;

// Map of route paths to their lazy loaders
const routeLoaders: Record<string, RouteLoader> = {
  // Public routes
  '/login': () => import('@/pages/public/login-page'),

  // Admin routes
  '/admin': () => import('@/pages/admin/dashboard'),
  '/admin/users': () => import('@/pages/admin/users/users-list'),
  '/admin/companies': () => import('@/pages/admin/companies/companies-list'),
  '/admin/modules': () => import('@/pages/admin/modules/modules-list'),
  '/admin/email-config': () => import('@/pages/admin/email-config'),

  // Admin AI Agent routes
  '/admin/modules/ai-agent': () => import('@/pages/modules/ai-agent/admin-index'),
  '/admin/modules/ai-agent/chat': () => import('@/pages/modules/ai-agent/chat'),
  '/admin/modules/ai-agent/configuration': () =>
    import('@/pages/modules/ai-agent/admin-configuration'),
  '/admin/modules/ai-agent/context': () => import('@/pages/modules/ai-agent/context-files'),
  '/admin/modules/ai-agent/token-usage': () => import('@/pages/modules/ai-agent/admin-token-usage'),

  // Admin Clients routes
  '/admin/modules/clients': () => import('@/pages/modules/clients/clients-dashboard'),
  '/admin/modules/clients/list': () => import('@/pages/modules/clients/clients-list'),
  '/admin/modules/clients/settings': () => import('@/pages/modules/clients/clients-settings'),
  '/admin/modules/clients/create': () => import('@/pages/modules/clients/client-create'),

  // Admin Email Client routes
  '/admin/modules/email-client': () => import('@/pages/modules/email-client/index'),
  '/admin/modules/email-client/inbox': () => import('@/pages/modules/email-client/inbox'),
  '/admin/modules/email-client/compose': () => import('@/pages/modules/email-client/compose'),
  '/admin/modules/email-client/drafts': () => import('@/pages/modules/email-client/drafts'),
  '/admin/modules/email-client/sent': () => import('@/pages/modules/email-client/sent'),
  '/admin/modules/email-client/trash': () => import('@/pages/modules/email-client/trash'),

  // Admin Tasks routes
  '/admin/modules/tasks': () => import('@/pages/modules/tasks/tasks-dashboard'),
  '/admin/modules/tasks/list': () => import('@/pages/modules/tasks/tasks-list'),
  '/admin/modules/tasks/kanban': () => import('@/pages/modules/tasks/tasks-kanban'),
  '/admin/modules/tasks/calendar': () => import('@/pages/modules/tasks/tasks-calendar'),
  '/admin/modules/tasks/timeline': () => import('@/pages/modules/tasks/tasks-timeline'),
  '/admin/modules/tasks/settings': () => import('@/pages/modules/tasks/tasks-settings'),
  '/admin/modules/tasks/create': () => import('@/pages/modules/tasks/task-create'),

  // Admin Time Tracking routes
  '/admin/modules/time-tracking': () =>
    import('@/pages/modules/time-tracking/time-tracking-dashboard'),
  '/admin/modules/time-tracking/entries': () =>
    import('@/pages/modules/time-tracking/time-tracking-entries'),
  '/admin/modules/time-tracking/timesheet/daily': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-daily'),
  '/admin/modules/time-tracking/timesheet/weekly': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-weekly'),
  '/admin/modules/time-tracking/reports': () =>
    import('@/pages/modules/time-tracking/time-tracking-reports'),
  '/admin/modules/time-tracking/settings': () =>
    import('@/pages/modules/time-tracking/time-tracking-settings'),

  // Company routes
  '/company': () => import('@/pages/company/dashboard'),
  '/company/employees': () => import('@/pages/company/employees/employees-list'),
  '/company/modules': () => import('@/pages/company/modules/modules-list'),
  '/company/email-config': () => import('@/pages/company/email-config'),

  // Company AI Agent routes
  '/company/modules/ai-agent': () => import('@/pages/modules/ai-agent/company-index'),
  '/company/modules/ai-agent/chat': () => import('@/pages/modules/ai-agent/chat'),
  '/company/modules/ai-agent/token-usage': () => import('@/pages/modules/ai-agent/token-usage'),
  '/company/modules/ai-agent/context': () => import('@/pages/modules/ai-agent/context-files'),

  // Company Clients routes
  '/company/modules/clients': () => import('@/pages/modules/clients/clients-dashboard'),
  '/company/modules/clients/list': () => import('@/pages/modules/clients/clients-list'),
  '/company/modules/clients/settings': () => import('@/pages/modules/clients/clients-settings'),
  '/company/modules/clients/create': () => import('@/pages/modules/clients/client-create'),

  // Company Email Client routes
  '/company/modules/email-client': () => import('@/pages/modules/email-client/index'),
  '/company/modules/email-client/inbox': () => import('@/pages/modules/email-client/inbox'),
  '/company/modules/email-client/compose': () => import('@/pages/modules/email-client/compose'),
  '/company/modules/email-client/drafts': () => import('@/pages/modules/email-client/drafts'),
  '/company/modules/email-client/sent': () => import('@/pages/modules/email-client/sent'),
  '/company/modules/email-client/trash': () => import('@/pages/modules/email-client/trash'),

  // Company Tasks routes
  '/company/modules/tasks': () => import('@/pages/modules/tasks/tasks-dashboard'),
  '/company/modules/tasks/list': () => import('@/pages/modules/tasks/tasks-list'),
  '/company/modules/tasks/kanban': () => import('@/pages/modules/tasks/tasks-kanban'),
  '/company/modules/tasks/calendar': () => import('@/pages/modules/tasks/tasks-calendar'),
  '/company/modules/tasks/timeline': () => import('@/pages/modules/tasks/tasks-timeline'),
  '/company/modules/tasks/settings': () => import('@/pages/modules/tasks/tasks-settings'),
  '/company/modules/tasks/create': () => import('@/pages/modules/tasks/task-create'),

  // Company Time Tracking routes
  '/company/modules/time-tracking': () =>
    import('@/pages/modules/time-tracking/time-tracking-dashboard'),
  '/company/modules/time-tracking/entries': () =>
    import('@/pages/modules/time-tracking/time-tracking-entries'),
  '/company/modules/time-tracking/timesheet/daily': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-daily'),
  '/company/modules/time-tracking/timesheet/weekly': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-weekly'),
  '/company/modules/time-tracking/reports': () =>
    import('@/pages/modules/time-tracking/time-tracking-reports'),
  '/company/modules/time-tracking/settings': () =>
    import('@/pages/modules/time-tracking/time-tracking-settings'),

  // Employee/Modules routes
  '/modules': () => import('@/pages/employee/dashboard'),
  '/modules/ai-agent': () => import('@/pages/modules/ai-agent/employee-index'),
  '/modules/ai-agent/chat': () => import('@/pages/modules/ai-agent/chat'),
  '/modules/clients': () => import('@/pages/modules/clients/clients-dashboard'),
  '/modules/clients/list': () => import('@/pages/modules/clients/clients-list'),
  '/modules/clients/create': () => import('@/pages/modules/clients/client-create'),
  '/modules/email-client': () => import('@/pages/modules/email-client/index'),
  '/modules/email-client/inbox': () => import('@/pages/modules/email-client/inbox'),
  '/modules/email-client/compose': () => import('@/pages/modules/email-client/compose'),
  '/modules/email-client/drafts': () => import('@/pages/modules/email-client/drafts'),
  '/modules/email-client/sent': () => import('@/pages/modules/email-client/sent'),
  '/modules/email-client/trash': () => import('@/pages/modules/email-client/trash'),
  '/modules/tasks': () => import('@/pages/modules/tasks/tasks-dashboard'),
  '/modules/tasks/list': () => import('@/pages/modules/tasks/tasks-list'),
  '/modules/tasks/kanban': () => import('@/pages/modules/tasks/tasks-kanban'),
  '/modules/tasks/calendar': () => import('@/pages/modules/tasks/tasks-calendar'),
  '/modules/tasks/timeline': () => import('@/pages/modules/tasks/tasks-timeline'),
  '/modules/tasks/settings': () => import('@/pages/modules/tasks/tasks-settings'),
  '/modules/tasks/create': () => import('@/pages/modules/tasks/task-create'),
  '/modules/time-tracking': () => import('@/pages/modules/time-tracking/time-tracking-dashboard'),
  '/modules/time-tracking/entries': () =>
    import('@/pages/modules/time-tracking/time-tracking-entries'),
  '/modules/time-tracking/timesheet/daily': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-daily'),
  '/modules/time-tracking/timesheet/weekly': () =>
    import('@/pages/modules/time-tracking/time-tracking-timesheet-weekly'),
  '/modules/time-tracking/reports': () =>
    import('@/pages/modules/time-tracking/time-tracking-reports'),
  '/modules/time-tracking/settings': () =>
    import('@/pages/modules/time-tracking/time-tracking-settings'),

  // Settings routes
  '/settings/email-config': () => import('@/pages/settings/email-config'),
  '/settings/account': () => import('@/pages/settings/account'),
  '/settings/appearance': () => import('@/pages/settings/appearance'),

  // Notifications routes
  '/notifications': () => import('@/pages/notifications/notifications-inbox'),
  '/notifications/archive': () => import('@/pages/notifications/notifications-archive'),
  '/notifications/settings': () => import('@/pages/notifications/notifications-settings'),
};

// Track which routes have been prefetched to avoid duplicate requests
const prefetched = new Set<string>();

/**
 * Prefetch a route's JavaScript chunk.
 * Safe to call multiple times - subsequent calls are no-ops.
 *
 * @param path - The route path to prefetch (e.g., '/admin/users')
 */
export function prefetchRoute(path: string): void {
  // Skip if already prefetched
  if (prefetched.has(path)) {
    return;
  }

  const loader = routeLoaders[path];
  if (loader) {
    prefetched.add(path);
    // Fire and forget - don't await, just trigger the import
    loader().catch(() => {
      // Remove from prefetched set on error so it can be retried
      prefetched.delete(path);
    });
  }
}

/**
 * Check if a route has been prefetched.
 *
 * @param path - The route path to check
 * @returns true if the route has been prefetched
 */
export function isRoutePrefetched(path: string): boolean {
  return prefetched.has(path);
}

/**
 * Get all available route paths that can be prefetched.
 *
 * @returns Array of route paths
 */
export function getPrefetchableRoutes(): string[] {
  return Object.keys(routeLoaders);
}
