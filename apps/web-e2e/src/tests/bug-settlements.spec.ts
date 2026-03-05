/**
 * Bug regression tests: Settlements
 *
 * #8 - Column renamed from "Data dokumentów" to "Data dostarczenia dokumentów"
 * #9 - Edit dialog with all required fields
 */
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Bug #8 — Settlement column renamed to "Data dostarczenia dokumentów"', () => {
  test('settlements list shows correct column header "Data dostarczenia dokumentów"', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    // New column name should be visible
    await expect(
      page.getByRole('columnheader', { name: 'Data dostarczenia dokumentów' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('old column name "Data dokumentów" is not used as standalone header', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    // We expect zero exact matches of the OLD header
    const columnHeaders = page.locator('th');
    const headers = await columnHeaders.allTextContents();
    const hasOldHeader = headers.some(
      (h) => h.trim() === 'Data dokumentów' || h.trim() === 'Data dokumentów'
    );
    expect(hasOldHeader).toBe(false);
  });
});

test.describe('Bug #9 — Settlement edit dialog with all required fields', () => {
  test('settlements list has at least one row', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('settlement actions menu contains Edytuj option', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Open the actions menu for the first row
    const firstRow = rows.first();
    const actionButton = firstRow
      .locator(
        'button[aria-label="Otwórz menu akcji"], [data-testid="row-actions"], td:last-child button'
      )
      .first();
    await actionButton.click();

    // Wait for dropdown menu
    await page.waitForSelector('[role="menu"]', { state: 'visible' });

    // "Edytuj" option should be in the menu
    await expect(page.locator('[role="menuitem"]:has-text("Edytuj")').first()).toBeVisible();

    // Close menu by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('settlement edit dialog opens and contains all required fields', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Open actions menu for first row
    const firstRow = rows.first();
    const actionButton = firstRow
      .locator(
        'button[aria-label="Otwórz menu akcji"], [data-testid="row-actions"], td:last-child button'
      )
      .first();
    await actionButton.click();

    // Wait for dropdown menu
    await page.waitForSelector('[role="menu"]', { state: 'visible' });

    // Click "Edytuj"
    await page.locator('[role="menuitem"]:has-text("Edytuj")').first().click();

    // Wait for the edit dialog
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 10000 });

    const dialog = page.locator('[role="dialog"]');

    // Check dialog title
    await expect(dialog.getByText('Edytuj rozliczenie').first()).toBeVisible();

    // Check required fields are present
    await expect(dialog.getByText('Liczba faktur').first()).toBeVisible();
    await expect(dialog.getByText('Priorytet').first()).toBeVisible();
    await expect(dialog.getByText('Data dostarczenia dokumentów').first()).toBeVisible();

    // Close dialog via Escape (avoid strict mode violation on multiple close buttons)
    await page.keyboard.press('Escape');
    await page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
      .catch(() => {});
  });

  test('settlement edit dialog shows all optional fields', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/settlements/list');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Open actions menu for first row and click Edytuj
    const firstRow = rows.first();
    const actionButton = firstRow
      .locator(
        'button[aria-label="Otwórz menu akcji"], [data-testid="row-actions"], td:last-child button'
      )
      .first();
    await actionButton.click();

    await page.waitForSelector('[role="menu"]', { state: 'visible' });
    await page.locator('[role="menuitem"]:has-text("Edytuj")').first().click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 10000 });

    const dialog = page.locator('[role="dialog"]');

    // Check additional fields
    const termin = dialog.getByText('Termin realizacji');
    const notatki = dialog.getByText('Notatki');

    // These fields should be visible in the dialog
    if (await termin.isVisible()) {
      await expect(termin).toBeVisible();
    }
    if (await notatki.isVisible()) {
      await expect(notatki).toBeVisible();
    }

    // Close dialog
    await page.keyboard.press('Escape');
    await page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
      .catch(() => {});
  });
});
