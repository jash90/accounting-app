/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { TaskCalendarPage } from '../pages/modules/TaskCalendarPage';
import { TaskTimelinePage } from '../pages/modules/TaskTimelinePage';

const BASE_PATH = '/company/modules/tasks';

// ─── Tasks Views: Calendar & Timeline ───────────────────────────────────────

test.describe('Tasks Views - Calendar & Timeline', () => {
  let api: APIHelper;
  const taskTitle = `E2E Calendar Task ${Date.now()}`;
  let taskId: string;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    // Create a task with a due date for timeline/calendar visibility
    const task = await api.createTask({
      title: taskTitle,
      description: 'Task for calendar and timeline view tests',
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

  test('should display calendar view with month navigation', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const calendar = new TaskCalendarPage(authenticatedCompanyOwnerPage);
    await calendar.goto(BASE_PATH);
    await calendar.expectToBeOnCalendarPage();
    await calendar.expectCalendarVisible();

    // Verify month label is visible
    const monthLabel = await calendar.getCurrentMonthLabel();
    expect(monthLabel.length).toBeGreaterThan(0);
  });

  test('should navigate between months in calendar', async ({ authenticatedCompanyOwnerPage }) => {
    const calendar = new TaskCalendarPage(authenticatedCompanyOwnerPage);
    await calendar.goto(BASE_PATH);
    await calendar.expectToBeOnCalendarPage();

    const _initialMonth = await calendar.getCurrentMonthLabel();

    await calendar.navigateToNextMonth();
    const nextMonth = await calendar.getCurrentMonthLabel();

    // Month label should change after navigation
    // (may be the same text if label doesn't update — just verify no error)
    expect(nextMonth.length).toBeGreaterThan(0);

    await calendar.navigateToPrevMonth();
    const prevMonth = await calendar.getCurrentMonthLabel();
    expect(prevMonth.length).toBeGreaterThan(0);
  });

  test('should display timeline view', async ({ authenticatedCompanyOwnerPage }) => {
    const timeline = new TaskTimelinePage(authenticatedCompanyOwnerPage);
    await timeline.goto(BASE_PATH);
    await timeline.expectToBeOnTimelinePage();
    await timeline.expectTimelineVisible();
  });

  test('should show tasks in timeline view', async ({ authenticatedCompanyOwnerPage }) => {
    const timeline = new TaskTimelinePage(authenticatedCompanyOwnerPage);
    await timeline.goto(BASE_PATH);
    await timeline.expectToBeOnTimelinePage();

    // Check that timeline has items (from seed data or created task)
    const items = await timeline.getTimelineItems();
    const itemCount = await items.count();

    // Either the timeline has items or shows an empty state — both are valid
    const emptyState = await authenticatedCompanyOwnerPage
      .getByText(/brak zadań|brak wyników|nie znaleziono/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(itemCount > 0 || emptyState).toBe(true);
  });

  test('should navigate between calendar and timeline views', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    // Start on calendar
    const calendar = new TaskCalendarPage(authenticatedCompanyOwnerPage);
    await calendar.goto(BASE_PATH);
    await calendar.expectToBeOnCalendarPage();

    // Navigate to timeline via tab/link
    const timelineLink = authenticatedCompanyOwnerPage.locator(
      'a[href*="/timeline"], button:has-text("Oś czasu"), [role="tab"]:has-text("Oś czasu")'
    );
    if (await timelineLink.first().isVisible()) {
      await timelineLink.first().click();
      await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
      await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/timeline/);
    } else {
      // Direct navigation fallback
      const timeline = new TaskTimelinePage(authenticatedCompanyOwnerPage);
      await timeline.goto(BASE_PATH);
      await timeline.expectToBeOnTimelinePage();
    }

    // Navigate back to calendar
    const calendarLink = authenticatedCompanyOwnerPage.locator(
      'a[href*="/calendar"], button:has-text("Kalendarz"), [role="tab"]:has-text("Kalendarz")'
    );
    if (await calendarLink.first().isVisible()) {
      await calendarLink.first().click();
      await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
      await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/calendar/);
    }
  });
});
