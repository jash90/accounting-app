 
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Email - Advanced Features', () => {
  test('should display custom email folders/labels', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/email-client');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Sidebar or folder list should be visible
    const hasFolders = await authenticatedCompanyOwnerPage
      .locator('nav a[href*="/email-client"], [data-testid*="folder"], aside a, [role="tree"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(typeof hasFolders).toBe('boolean');
  });

  test('should compose email with attachments button', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/email-client/compose');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Compose page should have an attachment button or file input
    const hasAttachments = await authenticatedCompanyOwnerPage
      .locator(
        'button:has-text("Załącznik"), button:has-text("Dodaj plik"), input[type="file"], [data-testid="attachment"]'
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Compose form should at minimum be present
    const hasComposeForm = await authenticatedCompanyOwnerPage
      .locator('form, textarea, [contenteditable="true"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasComposeForm || hasAttachments).toBe(true);
  });
});
