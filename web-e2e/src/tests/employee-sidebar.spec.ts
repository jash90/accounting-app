import { test, expect } from '../fixtures/auth.fixtures';
import { ModulesDashboardPage } from '../pages/employee/ModulesDashboardPage';

/**
 * Employee Sidebar E2E Tests
 *
 * Tests employee sidebar functionality including:
 * - Visibility of granted modules
 * - Navigation to modules
 * - Permission-based module filtering
 * - Sidebar toggle functionality
 *
 * Test Data (from seeder):
 * - bartlomiej.zimny@interia.pl: Has access to "AI Agent"
 */

test.describe('Employee Sidebar - Visibility', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should display sidebar on employee dashboard', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Wait for sidebar to be visible
    const sidebarVisible = await authenticatedEmployeePage.isVisible('aside');
    expect(sidebarVisible).toBe(true);
  });

  test('should show granted modules in sidebar', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Employee1.A has permissions for "AI Agent"
    await dashboard.nav.expectModuleInSidebar('AI Agent');

    // Verify it's in the module list
    const modules = await dashboard.nav.getSidebarModules();
    expect(modules).toContain('AI Agent');
  });

  test('should show AI Agent module in sidebar', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Employee1.A has permissions for AI Agent
    await dashboard.nav.expectModuleInSidebar('AI Agent');

    // Verify it's in the module list
    const modules = await dashboard.nav.getSidebarModules();
    expect(modules).toContain('AI Agent');
  });

  test('should always show Dashboard link', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Dashboard should always be visible
    await dashboard.nav.expectNavLinkVisible('Dashboard');
  });

  test('should display module icons and labels when expanded', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Check if sidebar is expanded
    const isExpanded = await dashboard.nav.isSidebarExpanded();
    expect(isExpanded).toBe(true);

    // When expanded, sidebar width should be ~256px (w-64)
    const width = await dashboard.nav.getSidebarWidth();
    expect(width).toBeGreaterThan(200);
    expect(width).toBeLessThan(300);

    // Module should have visible text
    const moduleLink = await authenticatedEmployeePage.$('aside nav a:has-text("AI Agent")');
    expect(moduleLink).toBeTruthy();
  });
});

test.describe('Employee Sidebar - Navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should navigate to module when sidebar link clicked', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Click on AI Agent module
    await dashboard.nav.navigateToModule('AI Agent');

    // Should navigate to /modules/ai-agent
    await expect(authenticatedEmployeePage).toHaveURL(/\/modules\/ai-agent/);
  });

  test('should highlight active module link', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Navigate to AI Agent
    await dashboard.nav.navigateToModule('AI Agent');

    // Wait for navigation
    await authenticatedEmployeePage.waitForTimeout(500);

    // AI Agent should be highlighted (has primary color class)
    const isActive = await dashboard.nav.isModuleActive('AI Agent');
    expect(isActive).toBe(true);
  });

  test('should navigate to dashboard from sidebar', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);

    // First navigate to a module
    await authenticatedEmployeePage.goto('/modules/ai-agent');
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    // Click Dashboard link in sidebar
    await dashboard.nav.navigateTo('Dashboard');

    // Should navigate back to /modules
    await expect(authenticatedEmployeePage).toHaveURL(/\/modules$/);
  });

  test('should sidebar reflect current URL', async ({ authenticatedEmployeePage }) => {
    // Navigate directly to ai-agent URL
    await authenticatedEmployeePage.goto('/modules/ai-agent');
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);

    // AI Agent should be highlighted
    const isActive = await dashboard.nav.isModuleActive('AI Agent');
    expect(isActive).toBe(true);
  });
});

test.describe('Employee Sidebar - Permissions', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('employee with permissions sees module', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // bartlomiej.zimny@interia.pl has read+write permissions for AI Agent
    await dashboard.nav.expectModuleInSidebar('AI Agent');

    const modules = await dashboard.nav.getSidebarModules();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules).toContain('AI Agent');
  });

  test('employee does not see admin-only links in sidebar', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Employees should not see admin-specific navigation items
    await dashboard.nav.expectModuleNotInSidebar('Companies');
    await dashboard.nav.expectModuleNotInSidebar('Modules Management');
  });

  test('only shows modules with explicit UserModulePermission', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Get all modules in sidebar
    const modules = await dashboard.nav.getSidebarModules();

    // Employee1.A should see AI Agent
    // (based on seeder data: has UserModulePermission)
    expect(modules).toContain('AI Agent');
    expect(modules.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Employee Sidebar - Interaction', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should toggle sidebar collapse/expand on button click', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Initially expanded
    let isExpanded = await dashboard.nav.isSidebarExpanded();
    expect(isExpanded).toBe(true);

    let width = await dashboard.nav.getSidebarWidth();
    const expandedWidth = width;

    // Toggle to collapse
    await dashboard.nav.toggleSidebar();

    isExpanded = await dashboard.nav.isSidebarExpanded();
    expect(isExpanded).toBe(false);

    width = await dashboard.nav.getSidebarWidth();
    expect(width).toBeLessThan(expandedWidth);
    expect(width).toBeLessThan(100); // Should be ~64px (w-16)
  });

  test('should remember sidebar state after page reload', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Collapse sidebar
    await dashboard.nav.toggleSidebar();

    let isExpanded = await dashboard.nav.isSidebarExpanded();
    expect(isExpanded).toBe(false);

    // Reload page
    await authenticatedEmployeePage.reload();
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    // Sidebar should still be collapsed (from localStorage)
    isExpanded = await dashboard.nav.isSidebarExpanded();
    expect(isExpanded).toBe(false);
  });

  test('should show icons always, labels only when expanded', async ({ authenticatedEmployeePage }) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();

    // Collapse sidebar
    await dashboard.nav.toggleSidebar();

    // Icons should still be visible
    const iconVisible = await authenticatedEmployeePage.isVisible('aside nav a svg, aside nav a [class*="lucide"]');
    expect(iconVisible).toBe(true);

    // Labels might be hidden or very small
    const width = await dashboard.nav.getSidebarWidth();
    expect(width).toBeLessThan(100);
  });
});
