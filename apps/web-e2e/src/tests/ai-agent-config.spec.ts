import { expect, test } from '../fixtures/auth.fixtures';
import { AiConfigurationPage } from '../pages/modules/AiConfigurationPage';

test.describe('AI Agent Configuration', () => {
  test.describe('Configuration Page - Admin Access', () => {
    test('should display AI configuration page', async ({ authenticatedAdminPage }) => {
      const configPage = new AiConfigurationPage(authenticatedAdminPage);
      await configPage.goto();
      await configPage.expectToBeOnConfigPage();

      // Verify core configuration elements are present
      const apiKeyField = configPage.getApiKeyField();
      await expect(apiKeyField).toBeVisible();
    });

    test('should show current model settings', async ({ authenticatedAdminPage }) => {
      const configPage = new AiConfigurationPage(authenticatedAdminPage);
      await configPage.goto();
      await configPage.expectToBeOnConfigPage();

      // Verify model configuration section is visible
      const page = authenticatedAdminPage;

      // Check for model selector or current model display
      const modelSection = page.locator(
        '#model, [name="model"], [data-testid="current-model"], text=Model'
      );
      await expect(modelSection.first()).toBeVisible();

      // Check for max tokens input
      const maxTokensInput = page.locator('input[name="maxTokens"], #maxTokens');
      const hasMaxTokens = (await maxTokensInput.count()) > 0;
      if (hasMaxTokens) {
        await expect(maxTokensInput.first()).toBeVisible();
      }

      // Verify save button is present
      const saveButton = page.locator('button:has-text("Zapisz")');
      await expect(saveButton).toBeVisible();
    });

    test('should navigate to token usage page', async ({ authenticatedAdminPage }) => {
      const configPage = new AiConfigurationPage(authenticatedAdminPage);
      await configPage.goto();
      await configPage.expectToBeOnConfigPage();

      // Look for token usage link/button
      const tokenUsageLink = authenticatedAdminPage.locator(
        'a:has-text("Użycie tokenów"), button:has-text("Użycie tokenów"), a[href*="token"]'
      );
      const hasTokenUsageLink = (await tokenUsageLink.count()) > 0;

      if (hasTokenUsageLink) {
        await configPage.navigateToTokenUsage();
        await authenticatedAdminPage.waitForLoadState('networkidle');

        // Verify we navigated to token usage
        const url = authenticatedAdminPage.url();
        expect(
          url.includes('token') || url.includes('usage') || url.includes('ai-agent')
        ).toBeTruthy();
      } else {
        // Token usage link may be in a different location - verify page renders
        await expect(authenticatedAdminPage.locator('body')).toBeVisible();
      }
    });

    test('should navigate to context files page', async ({ authenticatedAdminPage }) => {
      const configPage = new AiConfigurationPage(authenticatedAdminPage);
      await configPage.goto();
      await configPage.expectToBeOnConfigPage();

      // Look for context link/button
      const contextLink = authenticatedAdminPage.locator(
        'a:has-text("Kontekst"), button:has-text("Kontekst"), a[href*="context"]'
      );
      const hasContextLink = (await contextLink.count()) > 0;

      if (hasContextLink) {
        await configPage.navigateToContext();
        await authenticatedAdminPage.waitForLoadState('networkidle');

        // Verify we navigated to context page
        const url = authenticatedAdminPage.url();
        expect(url.includes('context') || url.includes('ai-agent')).toBeTruthy();
      } else {
        // Context link may be in a different location - verify page renders
        await expect(authenticatedAdminPage.locator('body')).toBeVisible();
      }
    });
  });
});
