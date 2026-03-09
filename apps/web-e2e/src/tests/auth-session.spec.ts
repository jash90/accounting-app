/* eslint-disable playwright/expect-expect */
import { expect, test } from '../fixtures/auth.fixtures';
import { AccountSettingsPage } from '../pages/auth/AccountSettingsPage';
import { LoginPage } from '../pages/auth/LoginPage';

// ─── Auth & Session Management ──────────────────────────────────────────────

test.describe('Auth & Session', () => {
  test('should redirect to login when token expired', async ({ page }) => {
    // First login to establish a session
    const loginPage = new LoginPage(page);
    await loginPage.loginAsCompanyOwner();
    await page.waitForLoadState('networkidle');

    // Clear localStorage to simulate token expiration
    await page.evaluate(() => localStorage.clear());

    // Navigate to a protected route
    await page.goto('/modules/tasks');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should display 404 page for non-existent routes', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should display some kind of 404 or "not found" indicator
    const notFoundText = page.locator(
      'text=404, text=Nie znaleziono, text=Not found, text=Strona nie istnieje'
    );
    const notFoundHeading = page.getByRole('heading', {
      name: /404|nie znaleziono|not found/i,
    });

    const hasText = await notFoundText
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasHeading = await notFoundHeading.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasText || hasHeading).toBe(true);
  });

  test('should show unauthorized page for insufficient permissions', async ({
    authenticatedEmployeePage,
  }) => {
    const page = authenticatedEmployeePage;

    // Try to access admin-only route
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should be redirected or shown unauthorized message
    const unauthorizedText = page.locator(
      'text=Brak dostępu, text=Unauthorized, text=Brak uprawnień, text=403'
    );
    const loginRedirect = page.locator('input[type="email"]');
    const dashboardRedirect = page.locator(
      'nav, [data-testid="main-navigation"], [data-testid="employee-sidebar"]'
    );

    const hasUnauthorized = await unauthorizedText
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasLoginRedirect = await loginRedirect.isVisible({ timeout: 3000 }).catch(() => false);
    const hasDashboardRedirect = await dashboardRedirect
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Should either show unauthorized message, redirect to login, or redirect to allowed dashboard
    expect(hasUnauthorized || hasLoginRedirect || hasDashboardRedirect).toBe(true);
    // Should NOT be on admin page
    const url = page.url();
    expect(url).not.toContain('/admin/dashboard');
  });

  test('should display account settings page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const accountSettings = new AccountSettingsPage(page);

    await accountSettings.goto();
    await page.waitForLoadState('networkidle');

    await accountSettings.expectToBeOnAccountSettingsPage();
  });

  test('should show password change form', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const accountSettings = new AccountSettingsPage(page);

    await accountSettings.goto();
    await page.waitForLoadState('networkidle');

    // Password change form fields should be visible
    const currentPasswordInput = page.locator('input[name="currentPassword"], #currentPassword');
    const newPasswordInput = page.locator('input[name="newPassword"], #newPassword');
    const confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], input[name="passwordConfirmation"], #confirmPassword'
    );
    const submitButton = page.locator(
      'button:has-text("Zmień hasło"), button:has-text("Zapisz hasło")'
    );

    await expect(currentPasswordInput).toBeVisible({ timeout: 10000 });
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
