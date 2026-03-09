/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { LoginPage } from '../pages/auth/LoginPage';
import { ClientsPage } from '../pages/modules/ClientsPage';

test.describe('Multi-Tenant Isolation & RBAC', () => {
  test('should not show Company A data when logged as Company B', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyBEmployee.email,
      TEST_CREDENTIALS.companyBEmployee.password
    );

    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    await page.waitForLoadState('networkidle');

    // Search for a Company A specific term — should find nothing
    await clientsPage.searchClient('E2E CompanyA');
    await page.waitForLoadState('networkidle');
    await clientsPage.expectClientNotInList('E2E CompanyA');
  });

  test('should deny module access when module not enabled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyBEmployee.email,
      TEST_CREDENTIALS.companyBEmployee.password
    );

    // Try accessing a module that may not be enabled
    await page.goto('/employee/modules/ai-agent');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isRedirected = !url.includes('/ai-agent');
    const hasAccessDenied = await page
      .getByText(/brak dostępu|moduł niedostępny|nie masz uprawnień/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(isRedirected || hasAccessDenied).toBe(true);
  });

  test('should deny admin panel access for company owner', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/admin/dashboard');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    const url = authenticatedCompanyOwnerPage.url();
    const hasRedirected = !url.includes('/admin/dashboard');
    const hasUnauthorized = await authenticatedCompanyOwnerPage
      .getByText(/brak dostępu|unauthorized|403/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRedirected || hasUnauthorized).toBe(true);
  });

  test('should deny admin panel access for employee', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/admin/dashboard');
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    const url = authenticatedEmployeePage.url();
    const hasRedirected = !url.includes('/admin/dashboard');
    const hasUnauthorized = await authenticatedEmployeePage
      .getByText(/brak dostępu|unauthorized|403/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRedirected || hasUnauthorized).toBe(true);
  });
});
