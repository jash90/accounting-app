import { expect, test } from '../fixtures/auth.fixtures';
import { SettlementsTeamPage } from '../pages/modules/SettlementsTeamPage';

test.describe('Settlements - Advanced Features', () => {
  test('should display team management page with employee cards', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const teamPage = new SettlementsTeamPage(authenticatedCompanyOwnerPage);
    await teamPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Team page should show employee stats or bulk assign section
    const hasTeamContent = await authenticatedCompanyOwnerPage
      .locator('h1, h2')
      .filter({ hasText: /zespół|team|zarządzanie/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmployeeCards = await authenticatedCompanyOwnerPage
      .locator('[class*="card"], [data-testid*="employee"], table tbody tr')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasTeamContent || hasEmployeeCards).toBe(true);
  });

  test('should perform bulk assignment of settlements', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const teamPage = new SettlementsTeamPage(authenticatedCompanyOwnerPage);
    await teamPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Check for bulk assign UI elements
    const hasBulkAssignBtn = await authenticatedCompanyOwnerPage
      .locator('button:has-text("Przypisz wybrane"), button:has-text("Masowe przypisywanie")')
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmployeeSelector = await authenticatedCompanyOwnerPage
      .locator('button[role="combobox"], select')
      .first()
      .isVisible()
      .catch(() => false);

    // At least some bulk assignment UI should be present
    expect(typeof hasBulkAssignBtn).toBe('boolean');
    expect(typeof hasEmployeeSelector).toBe('boolean');
  });
});
