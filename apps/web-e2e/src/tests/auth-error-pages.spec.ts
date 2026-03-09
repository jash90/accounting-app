import { expect, test } from '../fixtures/auth.fixtures';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('Error Pages & Access Control', () => {
  test('should display 404 page for non-existent route', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/non-existent-route-12345');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    await expect(
      authenticatedCompanyOwnerPage.getByText(/404|Nie znaleziono|Strona nie istnieje/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display unauthorized page when accessing admin route as employee', async ({
    authenticatedEmployeePage,
  }) => {
    await authenticatedEmployeePage.goto('/admin/dashboard');
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    // Should redirect away or show unauthorized
    const url = authenticatedEmployeePage.url();
    const hasRedirected = !url.includes('/admin/dashboard');
    const hasUnauthorizedText = await authenticatedEmployeePage
      .getByText(/brak dostępu|unauthorized|403/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRedirected || hasUnauthorizedText).toBe(true);
  });

  test('should display module access denied when module not enabled', async ({
    authenticatedEmployeePage,
  }) => {
    // Navigate to a module that may not be enabled for employee
    await authenticatedEmployeePage.goto('/employee/modules/ai-agent');
    await authenticatedEmployeePage.waitForLoadState('networkidle');

    // Should show access denied or redirect
    const url = authenticatedEmployeePage.url();
    const isRedirected = !url.includes('/ai-agent');
    const hasAccessDenied = await authenticatedEmployeePage
      .getByText(/brak dostępu|moduł niedostępny|nie masz uprawnień/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(isRedirected || hasAccessDenied).toBe(true);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/company/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login page
    const _loginPage = new LoginPage(page);
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should show proper error page layout with navigation', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/non-existent-route-12345');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Error page should still have some navigation or a "go back" link
    const hasNav = await authenticatedCompanyOwnerPage
      .locator('nav, a[href="/"], button:has-text("Powrót"), a:has-text("Strona główna")')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasNav).toBe(true);
  });
});
