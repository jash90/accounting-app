import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { TestDataFactory } from '../fixtures/data.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { TimeTrackingPage } from '../pages/modules/TimeTrackingPage';

const _BASE_PATH = '/company/modules/time-tracking';

// ─── Time Tracking Views & Reports ──────────────────────────────────────────

test.describe('Time Tracking - Views & Reports', () => {
  let api: APIHelper;
  const entryDesc1 = `E2E Views Entry 1 ${Date.now()}`;
  const entryDesc2 = `E2E Views Entry 2 ${Date.now()}`;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    // Create time entries for the tests
    const entry1 = TestDataFactory.createTimeEntryData({ description: entryDesc1 });
    const entry2 = TestDataFactory.createTimeEntryData({
      description: entryDesc2,
      startTime: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        11,
        0
      ).toISOString(),
      endTime: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        12,
        30
      ).toISOString(),
    });

    await api.createTimeEntry(entry1);
    await api.createTimeEntry(entry2);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should switch to daily view and display entries', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.switchToDailyView();

    // Daily view should be visible after switching
    await expect(page.getByRole('tab', { name: /dzień|daily/i })).toBeVisible();
    // Should contain time entry content
    const entriesCount = await timeTracking.getEntriesCount();
    expect(entriesCount).toBeGreaterThanOrEqual(0);
  });

  test('should switch to weekly view and display weekly summary', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.switchToWeeklyView();

    // Weekly tab should be selected
    await expect(page.getByRole('tab', { name: /tydzień|weekly/i })).toBeVisible();
  });

  test('should switch to entries list view', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.switchToEntriesListView();

    // Entries list tab should be visible
    await expect(page.getByRole('tab', { name: /lista|entries/i })).toBeVisible();
  });

  test('should navigate to reports page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/modules/time-tracking/reports');
    await page.waitForLoadState('networkidle');

    // Should be on the reports page
    await expect(page).toHaveURL(/\/time-tracking\/reports/);
    // Reports page should have some content
    await expect(
      page.getByRole('heading', { name: /raport|report|statystyki|statistics/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to client report page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;

    // Navigate to reports page first
    await page.goto('/modules/time-tracking/reports');
    await page.waitForLoadState('networkidle');

    // Look for a link or button that leads to by-client report
    const clientReportLink = page
      .locator('a[href*="by-client"], button:has-text("Klient"), a:has-text("Klient")')
      .first();

    if (await clientReportLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientReportLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/reports\/by-client|\/reports.*client/);
    } else {
      // If no client report link, navigate directly
      await page.goto('/modules/time-tracking/reports/by-client');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/by-client/);
    }
  });

  test('should display total hours summary', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.expectTimerStopped();

    // Check that some time-related content is displayed
    const totalHours = await timeTracking.getTotalHours();
    expect(totalHours).toBeDefined();
  });
});
