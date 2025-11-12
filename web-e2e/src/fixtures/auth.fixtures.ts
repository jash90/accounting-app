import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
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
    await use(page);
  },

  /**
   * Pre-authenticated company owner user
   */
  authenticatedCompanyOwnerPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsCompanyOwner();
    await use(page);
  },

  /**
   * Pre-authenticated employee user
   */
  authenticatedEmployeePage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAsEmployee();
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
    email: 'admin@system.com',
    password: 'Admin123!',
  },
  companyOwner: {
    email: 'owner.a@company.com',
    password: 'Owner123!',
  },
  employee: {
    email: 'employee1.a@company.com',
    password: 'Employee123!',
  },
  employee2: {
    email: 'employee2.a@company.com',
    password: 'Employee123!',
  },
  companyBOwner: {
    email: 'owner.b@company.com',
    password: 'Owner123!',
  },
  companyBEmployee: {
    email: 'employee1.b@company.com',
    password: 'Employee123!',
  },
};
