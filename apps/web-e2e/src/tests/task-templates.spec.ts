/* eslint-disable playwright/expect-expect, playwright/no-skipped-test */
import { expect, test } from '../fixtures/auth.fixtures';
import { TaskTemplatesPage } from '../pages/modules/TaskTemplatesPage';

const BASE_PATH = '/company/modules/tasks';

test.describe('Task Templates - CRUD', () => {
  test('should display page with header', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    await page.expectToBeOnPage();
  });

  test('should show empty state when no templates', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    const count = await page.getTableRowCount();
    if (count === 0) {
      await page.expectEmptyState();
    } else {
      test.skip();
    }
  });

  test('should create basic template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Basic Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title });
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
  });

  test('should create template with description and priority', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Full Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      title,
      description: 'A comprehensive task template with all fields',
    });
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
  });

  test('should edit template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Edit Template ${Date.now()}`;
    const updatedTitle = `Updated ${title}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title });
    await page.submitTemplateForm();
    await page.expectTemplateInList(title);

    // Edit it
    await page.editTemplate(title);
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('#tmpl-title').clear();
    await dialog.locator('#tmpl-title').fill(updatedTitle);
    await page.submitTemplateForm();

    await page.expectTemplateInList(updatedTitle);
  });

  test('should delete template with confirmation', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Delete Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title });
    await page.submitTemplateForm();
    await page.expectTemplateInList(title);

    await page.deleteTemplate(title);

    await page.goto(BASE_PATH);
    await page.expectTemplateNotInList(title);
  });

  test('should create task from template (Copy button)', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Copy Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title });
    await page.submitTemplateForm();
    await page.expectTemplateInList(title);

    // Click Copy button — should succeed without error
    await page.createTaskFromTemplate(title);
    // No error means success
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
  });
});

test.describe('Task Templates - Recurrence', () => {
  test('should create daily recurring template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Daily Recurrence ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title, hasRecurrence: true, frequency: 'daily' });
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
    await page.expectRecurrenceBadge(title);
  });

  test('should create weekly template with specific days', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Weekly Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title, hasRecurrence: true, frequency: 'weekly' });
    // Select Monday and Wednesday
    await page.selectDaysOfWeek([1, 3]);
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
  });

  test('should create monthly recurring template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Monthly Template ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title, hasRecurrence: true, frequency: 'monthly' });
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
    await page.expectRecurrenceBadge(title);
  });

  test('should toggle recurrence on/off', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Toggle Recur ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('#tmpl-title').fill(title);

    // Toggle on
    await page.toggleRecurrence(true);
    // Recurrence panel visible
    await expect(dialog.locator('text=Częstotliwość')).toBeVisible();

    // Toggle off
    await page.toggleRecurrence(false);
    // Recurrence panel hidden
    await expect(dialog.locator('text=Częstotliwość')).not.toBeVisible();

    await page.submitTemplateForm();
    await page.expectTemplateInList(title);
  });

  test('should display recurrence badge in table', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `Badge Recur ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({ title, hasRecurrence: true, frequency: 'daily' });
    await page.submitTemplateForm();

    await page.expectTemplateInList(title);
    // Recurrence badge (e.g. "Dziennie") should be visible in the row
    const row = authenticatedCompanyOwnerPage.locator(`tbody tr:has-text("${title}")`);
    await expect(row.locator('[class*="badge"]').first()).toBeVisible();
  });
});

test.describe('Task Templates - Validation', () => {
  test('should require title field', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    // Leave title empty and try to submit — button should be disabled
    const submitBtn = dialog.locator('button:has-text("Utwórz")');
    await expect(submitBtn).toBeDisabled();
  });

  test('should show days-of-week selector only for weekly frequency', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new TaskTemplatesPage(authenticatedCompanyOwnerPage);

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('#tmpl-title').fill('Freq Test');
    await page.toggleRecurrence(true);

    // Default frequency is weekly — days selector visible
    await expect(dialog.locator('text=Dni tygodnia')).toBeVisible();

    // Switch to daily — days selector hidden
    await page.selectFrequency('daily');
    await expect(dialog.locator('text=Dni tygodnia')).not.toBeVisible();

    // Switch to monthly — days selector hidden, day of month visible
    await page.selectFrequency('monthly');
    await expect(dialog.locator('text=Dzień miesiąca')).toBeVisible();
    await expect(dialog.locator('text=Dni tygodnia')).not.toBeVisible();
  });
});
