import { expect, test } from '../fixtures/auth.fixtures';
import { WaitHelpers } from '../helpers/wait.helpers';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('Visual Regression Tests', () => {
  test('Login Page Visual Test', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await WaitHelpers.waitForNetworkIdle(page);
    await loginPage.waitForLoginPage();

    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 1,
    });
  });
});
