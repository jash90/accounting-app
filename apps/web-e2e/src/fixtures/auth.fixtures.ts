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
    // Wait for the main navigation to be visible as a reliable indicator the page is ready
    await page.waitForSelector(
      'nav, [data-testid="main-navigation"], [data-testid="admin-sidebar"]',
      {
        state: 'visible',
        timeout: 10000,
      }
    );

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
    // Wait for the main navigation to be visible as a reliable indicator the page is ready
    await page.waitForSelector(
      'nav, [data-testid="main-navigation"], [data-testid="company-sidebar"]',
      {
        state: 'visible',
        timeout: 10000,
      }
    );

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
    // Wait for the main navigation to be visible as a reliable indicator the page is ready
    await page.waitForSelector(
      'nav, [data-testid="main-navigation"], [data-testid="employee-sidebar"]',
      {
        state: 'visible',
        timeout: 10000,
      }
    );

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
 * Get environment variable with runtime validation.
 * Throws an error if the variable is not defined.
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not defined. ` +
        `Please check your .env file or environment configuration.`
    );
  }
  return value;
}

/**
 * Get optional environment variable with a fallback value.
 */
function getOptionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const TEST_CREDENTIALS = {
  admin: {
    email: getRequiredEnv('SEED_ADMIN_EMAIL'),
    password: getRequiredEnv('SEED_ADMIN_PASSWORD'),
  },
  companyOwner: {
    email: getRequiredEnv('SEED_OWNER_EMAIL'),
    password: getRequiredEnv('SEED_OWNER_PASSWORD'),
  },
  employee: {
    email: getRequiredEnv('SEED_EMPLOYEE_EMAIL'),
    password: getRequiredEnv('SEED_EMPLOYEE_PASSWORD'),
  },
  companyBEmployee: {
    // Optional: uses fallback if not defined (for backwards compatibility)
    email: getOptionalEnv('SEED_COMPANY_B_EMPLOYEE_EMAIL', 'employee.companyb@example.com'),
    password: getOptionalEnv('SEED_COMPANY_B_EMPLOYEE_PASSWORD', 'EmployeeB123456!'),
  },
};
