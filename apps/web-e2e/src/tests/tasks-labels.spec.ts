 
import { expect, test } from '../fixtures/auth.fixtures';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';
const LABELS_PATH = '/company/modules/tasks/labels';

// ─── Task Labels CRUD ───────────────────────────────────────────────────────

test.describe('Tasks - Labels Management', () => {
  const labelName = `E2E Label ${Date.now()}`;

  test('should navigate to labels management', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    await page.goto(`${BASE_URL}${LABELS_PATH}`);
    await page.waitForLoadState('networkidle');

    // Verify we're on the labels page — look for heading or labels list
    const labelsHeading = page.getByText(/etykiety|labels/i).first();
    const hasHeading = await labelsHeading.isVisible().catch(() => false);

    // Alternatively, look for "Nowa etykieta" button or table/list of labels
    const addButton = page.getByRole('button', {
      name: /nowa etykieta|dodaj etykietę|add label/i,
    });
    const hasAddButton = await addButton.isVisible().catch(() => false);

    expect(hasHeading || hasAddButton).toBe(true);
  });

  test('should create a new task label', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    await page.goto(`${BASE_URL}${LABELS_PATH}`);
    await page.waitForLoadState('networkidle');

    // Click the create/add button
    const addButton = page.getByRole('button', {
      name: /nowa etykieta|dodaj etykietę|dodaj|add/i,
    });
    await expect(addButton.first()).toBeVisible({ timeout: 10000 });
    await addButton.first().click();

    // Wait for dialog or form
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill label name
    const nameInput = dialog
      .locator(
        'input[placeholder*="nazwa" i], input[placeholder*="etykiet" i], input[name="name"], input[type="text"]'
      )
      .first();
    await nameInput.fill(labelName);

    // Optionally select a color if color picker is available
    const colorInput = dialog
      .locator('input[type="color"], [data-testid="color-picker"], button[class*="color"]')
      .first();
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.click();
      await page.waitForTimeout(300);
    }

    // Submit the form
    const submitButton = dialog.getByRole('button', {
      name: /zapisz|utwórz|dodaj|save|create/i,
    });
    await submitButton.click();

    // Wait for dialog to close and data to refresh
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Verify the label appears in the list
    await expect(page.getByText(labelName).first()).toBeVisible({ timeout: 10000 });
  });

  test('should delete a task label', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    await page.goto(`${BASE_URL}${LABELS_PATH}`);
    await page.waitForLoadState('networkidle');

    // Find the label we created
    const labelRow = page
      .locator('tr, [class*="item"], [class*="card"]', {
        hasText: labelName,
      })
      .first();
    const isVisible = await labelRow.isVisible().catch(() => false);
    if (!isVisible) return;

    // Click delete button or open actions menu
    const deleteBtn = labelRow.getByRole('button', { name: /usuń|delete/i });
    const actionsBtn = labelRow.locator('td:last-child button, button[class*="more"]').first();

    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    } else if (await actionsBtn.isVisible().catch(() => false)) {
      await actionsBtn.click();
      await page.waitForTimeout(300);

      const deleteMenuItem = page.locator('[role="menuitem"]:has-text("Usuń")');
      if (await deleteMenuItem.isVisible()) {
        await deleteMenuItem.click();
      }
    }

    // Confirm deletion if dialog appears
    const confirmDialog = page.locator('[role="alertdialog"]');
    const hasConfirmDialog = await confirmDialog.isVisible().catch(() => false);
    if (hasConfirmDialog) {
      const confirmBtn = confirmDialog.getByRole('button', {
        name: /potwierdź|usuń|tak|yes|confirm/i,
      });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }

    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Verify label is removed
    await expect(page.getByText(labelName).first()).not.toBeVisible({ timeout: 5000 });
  });
});
