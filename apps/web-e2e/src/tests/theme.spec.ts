import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { WaitHelpers } from '../helpers/wait.helpers';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('Theme Tests', () => {
  test('Dashboard theme - Company Owner', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password,
      '/company'
    );

    await WaitHelpers.waitForNetworkIdle(page);
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('dashboard-company-owner.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('Sidebar theme - Admin', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsAdmin();

    await WaitHelpers.waitForNetworkIdle(page);
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('dashboard-admin.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('Theme switching - appearance settings', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password,
      '/company'
    );

    await WaitHelpers.waitForNetworkIdle(page);

    // Navigate to appearance settings
    await page.goto('http://localhost:4200/settings/appearance');
    await WaitHelpers.waitForNetworkIdle(page);
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('appearance-settings.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
