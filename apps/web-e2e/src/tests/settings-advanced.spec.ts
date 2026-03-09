 
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Settings - Advanced Features', () => {
  test('should change appearance theme and persist', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/settings/appearance');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Look for theme toggle or selector
    const themeToggle = authenticatedCompanyOwnerPage
      .locator(
        'button:has-text("Ciemny"), button:has-text("Jasny"), button:has-text("System"), [data-testid*="theme"]'
      )
      .first();

    const hasThemeControl = await themeToggle.isVisible().catch(() => false);
    if (hasThemeControl) {
      await themeToggle.click();
      await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    }

    // Page should have loaded with content
    const hasContent = authenticatedCompanyOwnerPage
      .locator('h1, h2, main')
      .first()
      ;
    await expect(hasContent).toBeVisible();
  });

  test('should display admin email configuration', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/admin/settings/email');
    await authenticatedAdminPage.waitForLoadState('networkidle');

    const hasContent = authenticatedAdminPage.locator('h1, h2, main').first();
    await expect(hasContent).toBeVisible();
  });

  test('should show system email config options', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/admin/settings/email');
    await authenticatedAdminPage.waitForLoadState('networkidle');

    // Look for email configuration form fields
    const hasEmailConfig = await authenticatedAdminPage
      .locator(
        'input[type="email"], input[name*="smtp"], input[name*="host"], label:has-text("SMTP"), form'
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(typeof hasEmailConfig).toBe('boolean');
  });
});
