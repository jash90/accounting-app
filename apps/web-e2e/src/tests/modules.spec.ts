import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { WaitHelpers } from '../helpers/wait.helpers';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('Modules Page Tests', () => {
  test('Modules list with Otwórz buttons', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password,
      '/company'
    );

    await page.goto('http://localhost:4200/company/modules');
    await WaitHelpers.waitForNetworkIdle(page);
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('modules-list.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
