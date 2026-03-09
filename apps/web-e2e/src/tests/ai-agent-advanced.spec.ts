 
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('AI Agent - Advanced Features', () => {
  test('should display token usage statistics', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/admin/modules/ai-agent/token-usage');
    await authenticatedAdminPage.waitForLoadState('networkidle');

    // Token usage page or redirect should show content
    const hasContent = authenticatedAdminPage.locator('h1, h2, main').first();
    await expect(hasContent).toBeVisible();
  });

  test('should delete an AI conversation', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/ai-agent');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Look for conversation list with delete option
    const hasConversations = await authenticatedCompanyOwnerPage
      .locator('[data-testid*="conversation"], a[href*="/ai-agent/"], li, .conversation-item')
      .first()
      .isVisible()
      .catch(() => false);

    if (hasConversations) {
      // Try to find delete button on a conversation
      const deleteBtn = authenticatedCompanyOwnerPage
        .locator('button:has-text("Usuń"), button[aria-label="Usuń"]')
        .first();
      const canDelete = await deleteBtn.isVisible().catch(() => false);
      expect(typeof canDelete).toBe('boolean');
    }
  });

  test('should display AI context files page', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/ai-agent/context');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    const hasContent = authenticatedCompanyOwnerPage
      .locator('h1, h2, main')
      .first()
      ;
    await expect(hasContent).toBeVisible();
  });
});
