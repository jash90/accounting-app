import { test as base, Page } from '@playwright/test';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { CompanyDashboardPage } from '../pages/company/CompanyDashboardPage';
import { ModulesDashboardPage } from '../pages/employee/ModulesDashboardPage';

/**
 * Authentication fixtures for pre-authenticated test contexts
 */

type AuthFixtures = {
  loginPage: LoginPage;
  authenticatedAdminPage: Page;
  authenticatedCompanyOwnerPage: Page;
  authenticatedEmployeePage: Page;
  adminDashboard: AdminDashboardPage;
  companyDashboard: CompanyDashboardPage;
  employeeDashboard: ModulesDashboardPage;
};

export const test = base.extend<AuthFixtures>({
  /**
   * LoginPage fixture
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * Pre-authenticated admin user
   */
  authenticatedAdminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsAdmin();

    // Wait for page to be fully loaded and auth ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await use(page);
  },

  /**
   * Pre-authenticated company owner user
   */
  authenticatedCompanyOwnerPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsCompanyOwner();

    // Wait for page to be fully loaded and auth ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await use(page);
  },

  /**
   * Pre-authenticated employee user
   */
  authenticatedEmployeePage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsEmployee();

    // Wait for page to be fully loaded and auth ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await use(page);
  },

  /**
   * Admin dashboard page (pre-authenticated)
   */
  adminDashboard: async ({ authenticatedAdminPage }, use) => {
    const dashboard = new AdminDashboardPage(authenticatedAdminPage);
    await dashboard.goto();
    await use(dashboard);
  },

  /**
   * Company dashboard page (pre-authenticated)
   */
  companyDashboard: async ({ authenticatedCompanyOwnerPage }, use) => {
    const dashboard = new CompanyDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto();
    await use(dashboard);
  },

  /**
   * Employee dashboard page (pre-authenticated)
   */
  employeeDashboard: async ({ authenticatedEmployeePage }, use) => {
    const dashboard = new ModulesDashboardPage(authenticatedEmployeePage);
    await dashboard.goto();
    await use(dashboard);
  },
});

export { expect } from '@playwright/test';

/**
 * Test data credentials
 */
export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.SEED_ADMIN_EMAIL ?? '',
    password: process.env.SEED_ADMIN_PASSWORD ?? '',
  },
  companyOwner: {
    email: process.env.SEED_OWNER_EMAIL ?? '',
    password: process.env.SEED_OWNER_PASSWORD ?? '',
  },
  employee: {
    email: process.env.SEED_EMPLOYEE_EMAIL ?? '',
    password: process.env.SEED_EMPLOYEE_PASSWORD ?? '',
  },
  // Placeholder for Company B (if seeded)
  companyBEmployee: {
    email: 'employee-b@example.com',
    password: 'password',
  },
};
