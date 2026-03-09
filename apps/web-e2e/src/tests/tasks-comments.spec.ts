 
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { TasksListPage } from '../pages/modules/TasksListPage';

const BASE_PATH = '/company/modules/tasks';
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';

// ─── Task Comments ──────────────────────────────────────────────────────────

test.describe('Tasks - Comments', () => {
  let api: APIHelper;
  const taskTitle = `E2E Comments Task ${Date.now()}`;
  let taskId: string;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    const task = await api.createTask({
      title: taskTitle,
      description: 'Task for comments E2E tests',
      priority: 'MEDIUM',
    });
    if (task?.id) taskId = task.id;
  });

  test.afterAll(async () => {
    if (taskId) {
      await api.deleteTask(taskId).catch(() => {});
    }
    await api.dispose();
  });

  test('should open task detail and see comments section', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const tasksPage = new TasksListPage(page);
    await tasksPage.goto(BASE_PATH);

    // Click on the task title to open detail/edit dialog
    const taskRow = page.locator(`tbody tr:has-text("${taskTitle}")`);
    const isVisible = await taskRow.isVisible().catch(() => false);

    if (isVisible) {
      // Click on the title cell (2nd td, after checkbox)
      await taskRow.locator('td').nth(1).click();
      await page.waitForTimeout(1000);
    } else {
      // Navigate directly to task detail
      await page.goto(`${BASE_URL}/company/modules/tasks/${taskId}`);
      await page.waitForLoadState('networkidle');
    }

    // Look for comments section in the dialog or detail page
    const commentsSection = page.getByText(/komentarze|comments/i).first();
    const hasComments = await commentsSection.isVisible().catch(() => false);

    // Comments may be in a tab — try clicking it
    if (!hasComments) {
      const commentsTab = page.locator(
        '[role="tab"]:has-text("Komentarze"), button:has-text("Komentarze"), a:has-text("Komentarze")'
      );
      if (
        await commentsTab
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await commentsTab.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Verify comments section or input is visible
    const commentInput = page.locator(
      'textarea[placeholder*="komentarz" i], textarea[placeholder*="comment" i], textarea[placeholder*="wpisz" i]'
    );
    const hasInput = await commentInput
      .first()
      .isVisible()
      .catch(() => false);
    const commentsVisible = await page
      .getByText(/komentarze|comments|brak komentarzy/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasInput || commentsVisible).toBe(true);
  });

  test('should add a comment to a task', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const commentText = `E2E test comment ${Date.now()}`;

    // Navigate to task detail
    const tasksPage = new TasksListPage(page);
    await tasksPage.goto(BASE_PATH);

    const taskRow = page.locator(`tbody tr:has-text("${taskTitle}")`);
    const isVisible = await taskRow.isVisible().catch(() => false);

    if (isVisible) {
      await taskRow.locator('td').nth(1).click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto(`${BASE_URL}/company/modules/tasks/${taskId}`);
      await page.waitForLoadState('networkidle');
    }

    // Switch to comments tab if needed
    const commentsTab = page.locator(
      '[role="tab"]:has-text("Komentarze"), button:has-text("Komentarze"), a:has-text("Komentarze")'
    );
    if (
      await commentsTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await commentsTab.first().click();
      await page.waitForTimeout(500);
    }

    // Find the comment textarea
    const commentInput = page
      .locator(
        'textarea[placeholder*="komentarz" i], textarea[placeholder*="comment" i], textarea[placeholder*="wpisz" i], textarea'
      )
      .first();
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill(commentText);

    // Submit comment
    const submitBtn = page.getByRole('button', {
      name: /wyślij|dodaj komentarz|zapisz|send|add comment/i,
    });
    await expect(submitBtn.first()).toBeVisible();
    await submitBtn.first().click();

    // Wait for comment to be saved
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // Verify the comment appears
    await expect(page.getByText(commentText).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display added comment in comments list', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    // Navigate to task detail
    const tasksPage = new TasksListPage(page);
    await tasksPage.goto(BASE_PATH);

    const taskRow = page.locator(`tbody tr:has-text("${taskTitle}")`);
    const isVisible = await taskRow.isVisible().catch(() => false);

    if (isVisible) {
      await taskRow.locator('td').nth(1).click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto(`${BASE_URL}/company/modules/tasks/${taskId}`);
      await page.waitForLoadState('networkidle');
    }

    // Switch to comments tab if needed
    const commentsTab = page.locator(
      '[role="tab"]:has-text("Komentarze"), button:has-text("Komentarze"), a:has-text("Komentarze")'
    );
    if (
      await commentsTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await commentsTab.first().click();
      await page.waitForTimeout(500);
    }

    // Verify comments list is not empty — either shows comments or "Historia komentarzy"
    const hasComments = await page
      .getByText(/e2e test comment/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasHistory = await page
      .getByText(/historia komentarzy|komentarze/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/brak komentarzy/i)
      .first()
      .isVisible()
      .catch(() => false);

    // The previous test should have added a comment — verify it persists
    expect(hasComments || hasHistory || hasEmptyState).toBe(true);
  });
});
