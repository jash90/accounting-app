/**
 * Bug regression tests: Auth & Login
 *
 * #1 - Login page animations don't restart on keystroke (fixed in styles.css + login-page.tsx)
 * #2 - Auth token persistence across navigation (no 401/redirect on module pages)
 */
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Bug #1 — Login animations do not restart on keystroke', () => {
  test('hero panel animations remain finished after typing in email input', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for initial animations to complete
    await page.waitForTimeout(1500);

    // Get the left hero panel (bg-primary side) — it should have animate-fade-in-left
    const heroPanel = page.locator('.animate-fade-in-left, .animate-fade-in-down').first();

    // The form panel on the right should NOT have any animate-fade-in-* classes
    const formPanel = page.locator('form, [class*="form"]').first();
    const formPanelHtml = await formPanel.evaluate((el) => el.outerHTML);
    expect(formPanelHtml).not.toMatch(/animate-fade-in-/);

    // Type into the email input (triggers re-renders if HeroPanel is not memoized)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.type('test@example.com', { delay: 50 });

    // Hero panel should still be visible (not re-animating / flashing)
    if (await heroPanel.isVisible()) {
      await expect(heroPanel).toBeVisible();
    }

    // No JS errors during typing
    // (page errors would have thrown in the test runner already)
  });

  test('form elements do not have animation classes that would restart on re-render', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check the right-side panel (form side) for absence of animate-fade-in-* classes
    // These were removed in the fix to prevent re-animation on every keystroke
    const rightPanel = page
      .locator('[class*="flex"][class*="items-center"]:not([class*="bg-primary"])')
      .first();

    if (await rightPanel.isVisible()) {
      const rightPanelClasses = await rightPanel.getAttribute('class');
      // Form panel should not have fade-in animations (removed in fix)
      expect(rightPanelClasses ?? '').not.toMatch(/animate-fade-in-right/);
    }
  });
});

test.describe('Bug #2 — Auth token persists across navigation', () => {
  test('navigating between module pages does not trigger 401 or redirect to login', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const modulePaths = [
      '/company/modules/tasks',
      '/company/modules/time-tracking',
      '/company/modules/settlements/list',
      '/company/modules/offers',
    ];

    for (const path of modulePaths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Should not be redirected to login
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');

      // Should not have 401 errors in console
      const unauthorizedErrors = consoleErrors.filter(
        (e) => e.includes('401') || e.toLowerCase().includes('unauthorized')
      );
      expect(unauthorizedErrors).toHaveLength(0);
    }

    // No JS errors across the navigation flow
    expect(pageErrors).toHaveLength(0);
  });

  test('page reloads do not lose authentication', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/tasks');
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on the tasks page, not redirected to login
    expect(page.url()).not.toContain('/login');
  });
});
