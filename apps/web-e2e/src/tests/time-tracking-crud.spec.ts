import { test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { TimeTrackingPage } from '../pages/modules/TimeTrackingPage';

const _BASE_PATH = '/company/modules/time-tracking';

// ─── Time Tracking CRUD ─────────────────────────────────────────────────────

test.describe.serial('Time Tracking - CRUD Operations', () => {
  let api: APIHelper;
  const entryDescription = `E2E Time Entry ${Date.now()}`;
  const editedDescription = `E2E Edited Entry ${Date.now()}`;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should display time tracking page with timer widget', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');
    await timeTracking.expectToBeOnTimeTrackingPage();
  });

  test('should create a manual time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.openAddEntryForm();
    await timeTracking.fillEntryForm({
      description: entryDescription,
      startTime: '09:00',
      endTime: '10:30',
    });
    await timeTracking.saveEntry();

    // Wait for the entry to appear in the list
    await page.waitForLoadState('networkidle');
    await timeTracking.expectEntryInList(entryDescription);
  });

  test('should edit a time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.editEntry(entryDescription);

    // Fill form with updated description
    await timeTracking.fillEntryForm({
      description: editedDescription,
    });
    await timeTracking.saveEntry();

    await page.waitForLoadState('networkidle');
    await timeTracking.expectEntryInList(editedDescription);
  });

  test('should delete a time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const timeTracking = new TimeTrackingPage(page);

    await timeTracking.goto();
    await page.waitForLoadState('networkidle');

    await timeTracking.deleteEntry(editedDescription);

    await page.waitForLoadState('networkidle');
    await timeTracking.expectEntryNotInList(editedDescription);
  });
});
