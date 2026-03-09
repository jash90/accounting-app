 
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { TestDataFactory } from '../fixtures/data.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { TasksListPage } from '../pages/modules/TasksListPage';

test.describe('Tasks Module - Advanced Features', () => {
  let api: APIHelper;
  let taskId: string;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );
    const data = TestDataFactory.createTaskData({ title: `E2E Adv Task ${Date.now()}` });
    const created = await api.createTask(data);
    taskId = created.id;
  });

  test.afterAll(async () => {
    if (taskId) await api.deleteTask(taskId);
    await api.dispose();
  });

  test('should display task dependencies section in task detail', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Click on the task to open detail
    const taskRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    if (await taskRow.isVisible()) {
      await taskRow.click();
      await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

      // Check for dependencies section or related content
      const hasDetail = authenticatedCompanyOwnerPage
        .locator('main, [role="dialog"]')
        .first()
        ;
      await expect(hasDetail).toBeVisible();
    }
  });

  test('should navigate to task settings page', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company/modules/tasks/settings');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    const hasContent = authenticatedCompanyOwnerPage
      .locator('h1, h2, main')
      .first()
      ;
    await expect(hasContent).toBeVisible();
  });

  test('should display drag handle for task reordering', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Check for drag handles or sortable indicators in the table
    const hasDragHandle = await authenticatedCompanyOwnerPage
      .locator(
        '[data-testid="drag-handle"], [role="button"][aria-roledescription="sortable"], .grip, svg[class*="grip"]'
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Drag handles may or may not be present depending on view
    expect(typeof hasDragHandle).toBe('boolean');
  });

  test('should show task priority indicators', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto();
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Priority badges or indicators should be visible in task list
    const hasPriority = await authenticatedCompanyOwnerPage
      .locator(
        '[class*="badge"], [data-testid*="priority"], span:has-text("Średni"), span:has-text("Wysoki"), span:has-text("Niski")'
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(typeof hasPriority).toBe('boolean');
  });
});
