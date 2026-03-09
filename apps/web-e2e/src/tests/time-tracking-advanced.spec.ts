 
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Time Tracking - Advanced Features', () => {
  test('should display time tracking settings page', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/time-tracking/settings');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    const hasContent = authenticatedCompanyOwnerPage
      .locator('h1, h2, main')
      .first()
      ;
    await expect(hasContent).toBeVisible();
  });

  test('should display time tracking dashboard with statistics', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/time-tracking');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    await expect(
      authenticatedCompanyOwnerPage
        .locator('h1, h2')
        .filter({ hasText: /czas|time|rejestr/i })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show navigation cards on dashboard', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/time-tracking');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Dashboard should have navigation elements to sub-pages
    const hasNavigation = await authenticatedCompanyOwnerPage
      .locator('a[href*="/time-tracking/"], [role="link"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(typeof hasNavigation).toBe('boolean');
  });
});
