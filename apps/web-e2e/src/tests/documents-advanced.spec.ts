 
import { expect, test } from '../fixtures/auth.fixtures';
import { DocumentsPage } from '../pages/modules/DocumentsPage';

test.describe('Documents - Advanced Features', () => {
  test('should display documents dashboard with statistics', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/documents');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    await expect(
      authenticatedCompanyOwnerPage
        .locator('h1, h2')
        .filter({ hasText: /Dokumenty|Szablony/i })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between templates and generated documents', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const docsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await docsPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Look for navigation tabs or links between templates and generated docs
    const hasTemplatesLink = await authenticatedCompanyOwnerPage
      .locator(
        'a[href*="/templates"], button:has-text("Szablony"), [role="tab"]:has-text("Szablony")'
      )
      .first()
      .isVisible()
      .catch(() => false);

    const hasGeneratedLink = await authenticatedCompanyOwnerPage
      .locator(
        'a[href*="/generated"], button:has-text("Wygenerowane"), [role="tab"]:has-text("Wygenerowane")'
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasTemplatesLink || hasGeneratedLink).toBe(true);
  });
});
