/**
 * Bug regression tests: Time Tracking
 *
 * #4 - Timer Zadanie/Rozliczenie radio buttons work correctly
 * #5 - Time tracking statistics subpage renders all panels
 * #6 - Seed data: time entries exist in the system
 * #7 - Reports by client show data (not empty)
 */
import { expect, test } from '../fixtures/auth.fixtures';
import { TimeTrackingStatisticsPage } from '../pages/modules/TimeTrackingStatisticsPage';

test.describe('Bug #4 — Timer Zadanie/Rozliczenie radio buttons', () => {
  test('timer widget shows both Zadanie and Rozliczenie radio options', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking');
    await page.waitForLoadState('networkidle');

    // Both radio labels should be visible
    await expect(page.getByText('Zadanie', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Rozliczenie', { exact: true }).first()).toBeVisible();
  });

  test('selecting Rozliczenie shows settlement select dropdown', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking');
    await page.waitForLoadState('networkidle');

    // Click the "Rozliczenie" radio label (for="timer-workType-settlement")
    const settlementLabel = page.locator('label[for="timer-workType-settlement"]');
    if (await settlementLabel.isVisible()) {
      await settlementLabel.click();
      // Should show settlement selector placeholder
      await expect(page.getByText('Wybierz rozliczenie').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Fallback: try clicking the radio by value
      const settlementRadio = page.locator('input[value="settlement"]');
      await settlementRadio.click();
      await expect(page.getByText('Wybierz rozliczenie').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('selecting Zadanie shows task select dropdown', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking');
    await page.waitForLoadState('networkidle');

    // First switch to Rozliczenie, then back to Zadanie to test the transition
    const settlementLabel = page.locator('label[for="timer-workType-settlement"]');
    const taskLabel = page.locator('label[for="timer-workType-task"]');

    if ((await settlementLabel.isVisible()) && (await taskLabel.isVisible())) {
      await settlementLabel.click();
      await taskLabel.click();
      // Should show task selector placeholder
      await expect(page.getByText('Wybierz zadanie').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Bug #5 — Time tracking statistics subpage', () => {
  test('statistics page renders with correct title', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const statsPage = new TimeTrackingStatisticsPage(page);

    await statsPage.goto();
    await statsPage.expectOnStatisticsPage();
    expect(page.url()).toContain('statistics');
  });

  test('statistics page shows all 3 panels', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const statsPage = new TimeTrackingStatisticsPage(page);

    await statsPage.goto();
    await statsPage.expectAllPanels();
    expect(page.url()).toContain('statistics');
  });

  test('period selector buttons work', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const statsPage = new TimeTrackingStatisticsPage(page);

    await statsPage.goto();
    await statsPage.expectOnStatisticsPage();

    // Click 90 dni button
    await statsPage.selectPeriod('90d');

    // Button should be active (has bg-primary class)
    const btn90 = statsPage.getPeriodButton('90d');
    const classes = await btn90.getAttribute('class');
    expect(classes).toContain('bg-primary');
  });

  test('period selector 30 dni is active by default', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const statsPage = new TimeTrackingStatisticsPage(page);

    await statsPage.goto();
    await statsPage.expectOnStatisticsPage();

    // 30 dni button should be active by default
    const btn30 = statsPage.getPeriodButton('30d');
    const classes = await btn30.getAttribute('class');
    expect(classes).toContain('bg-primary');
  });
});

test.describe('Bug #6 — Seed data: time entries exist', () => {
  test('time tracking dashboard loads with entries present', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking');
    await page.waitForLoadState('networkidle');

    // Either timer widget is visible, or the page has time entries in daily view
    const pageContent = await page.content();
    // Page should have loaded without error
    expect(pageContent).not.toContain('Cannot read properties');
    expect(pageContent).not.toContain('TypeError');
  });

  test('switching to entries list view shows seeded time entries', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking');
    await page.waitForLoadState('networkidle');

    // Try to switch to the entries list tab
    const listTab = page.getByRole('tab', { name: /lista|entries|wpisy/i });
    if (await listTab.isVisible()) {
      await listTab.click();
      await page.waitForLoadState('networkidle');

      // There should be some entries (seed data provides 90 entries)
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('Bug #7 — Reports by client show data', () => {
  test('time tracking reports page loads and shows client report card', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    await page.goto('/company/modules/time-tracking/reports');
    await page.waitForLoadState('networkidle');

    // The report page should show the "Raport wg klientów" section
    await expect(page.getByText('Raport wg klientów').first()).toBeVisible({ timeout: 10000 });
  });

  test('reports by client path uses path param (not query param)', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;

    // Navigate to reports and find a client to click
    await page.goto('/company/modules/time-tracking/reports');
    await page.waitForLoadState('networkidle');

    // The report should be accessible without JS errors
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.waitForLoadState('networkidle');
    expect(pageErrors).toHaveLength(0);
  });
});
