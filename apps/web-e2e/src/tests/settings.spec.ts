/* eslint-disable playwright/expect-expect */
import { expect, test } from '../fixtures/auth.fixtures';
import { AccountSettingsPage } from '../pages/auth/AccountSettingsPage';
import { AppearanceSettingsPage } from '../pages/auth/AppearanceSettingsPage';
import { EmailConfigPage } from '../pages/email/EmailConfigPage';

// ─── Settings Pages ─────────────────────────────────────────────────────────

test.describe('Settings - Account, Email & Appearance', () => {
  test('should display account settings page with user info', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const accountSettings = new AccountSettingsPage(page);

    await accountSettings.goto();
    await page.waitForLoadState('networkidle');

    await accountSettings.expectToBeOnAccountSettingsPage();

    // Should display user-related information
    const userEmail = await accountSettings.getUserEmail();
    expect(userEmail).toBeTruthy();
  });

  test('should display email configuration page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const emailConfig = new EmailConfigPage(page);

    await emailConfig.goto();
    await page.waitForLoadState('networkidle');

    await emailConfig.expectToBeOnEmailConfigPage();
  });

  test('should show SMTP/IMAP form fields on email config page', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const emailConfig = new EmailConfigPage(page);

    await emailConfig.goto();
    await page.waitForLoadState('networkidle');

    // SMTP fields should be present
    const smtpHost = page.locator('input[name="smtpHost"], #smtpHost');
    const smtpPort = page.locator('input[name="smtpPort"], #smtpPort');
    const smtpUsername = page.locator('input[name="smtpUsername"], #smtpUsername');

    await expect(smtpHost).toBeVisible({ timeout: 10000 });
    await expect(smtpPort).toBeVisible();
    await expect(smtpUsername).toBeVisible();

    // IMAP fields should be present
    const imapHost = page.locator('input[name="imapHost"], #imapHost');
    const imapPort = page.locator('input[name="imapPort"], #imapPort');

    await expect(imapHost).toBeVisible();
    await expect(imapPort).toBeVisible();
  });

  test('should display appearance settings page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const appearance = new AppearanceSettingsPage(page);

    await appearance.goto();
    await page.waitForLoadState('networkidle');

    await appearance.expectToBeOnAppearancePage();
  });

  test('should toggle between light and dark themes', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const appearance = new AppearanceSettingsPage(page);

    await appearance.goto();
    await page.waitForLoadState('networkidle');

    // Get current theme
    const initialTheme = await appearance.getCurrentTheme();

    // Switch to the opposite theme
    if (initialTheme === 'dark') {
      await appearance.selectTheme('light');
    } else {
      await appearance.selectTheme('dark');
    }

    // Wait for theme to be applied
    await page.waitForTimeout(500);

    // Verify theme changed
    const newTheme = await appearance.getCurrentTheme();
    expect(newTheme).not.toBe(initialTheme);

    // Switch back to original theme to leave state clean
    await appearance.selectTheme(initialTheme === 'dark' ? 'dark' : 'light');
    await page.waitForTimeout(500);

    const restoredTheme = await appearance.getCurrentTheme();
    expect(restoredTheme).toBe(initialTheme);
  });
});
