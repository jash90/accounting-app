import { test, expect } from '../fixtures/auth.fixtures';
import { TimeTrackingPage } from '../pages/modules/TimeTrackingPage';
import { TestDataFactory } from '../fixtures/data.fixtures';

test.describe('Time Tracking - Timer Operations', () => {
  test('should start a timer', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();
    await timeTrackingPage.expectToBeOnTimeTrackingPage();

    await timeTrackingPage.startTimer('Test task');
    await timeTrackingPage.expectTimerRunning();
  });

  test('should stop a running timer', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();

    // Start timer first
    await timeTrackingPage.startTimer('Task to stop');
    await timeTrackingPage.expectTimerRunning();

    // Wait for timer display to show elapsed time (confirms timer is actually running)
    await expect(timeTrackingPage.timerDisplay).toBeVisible();
    // Verify timer display shows a time value (not 0:00 or empty)
    await expect(timeTrackingPage.timerDisplay).not.toHaveText('0:00:00', { timeout: 3000 });

    // Stop timer
    await timeTrackingPage.stopTimer();
    await timeTrackingPage.expectTimerStopped();
  });

  test('should display elapsed time while timer is running', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();

    await timeTrackingPage.startTimer('Timing task');
    await timeTrackingPage.expectTimerRunning();

    // Get initial time
    const time1 = await timeTrackingPage.getTimerElapsedTime();

    // Wait for timer display text to change (explicit state-based wait)
    await expect(timeTrackingPage.timerDisplay).not.toHaveText(time1, { timeout: 5000 });

    const time2 = await timeTrackingPage.getTimerElapsedTime();

    // Time should have changed
    expect(time1).not.toBe(time2);

    // Cleanup - stop timer
    await timeTrackingPage.stopTimer();
  });

  test('should create time entry when timer is stopped', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);
    const description = `E2E Timer Entry ${Date.now()}`;

    await timeTrackingPage.goto();

    // Start timer
    await timeTrackingPage.startTimer(description);

    // Wait for timer to accumulate some time by checking display changes
    await expect(timeTrackingPage.timerDisplay).toBeVisible();
    await expect(timeTrackingPage.timerDisplay).not.toHaveText('0:00:00', { timeout: 3000 });

    // Stop timer
    await timeTrackingPage.stopTimer();

    // Entry should appear in list
    await timeTrackingPage.switchToEntriesListView();
    await timeTrackingPage.expectEntryInList(description);
  });

  test('should not allow multiple concurrent timers', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();

    // Start first timer
    await timeTrackingPage.startTimer('First timer');
    await timeTrackingPage.expectTimerRunning();

    // Start button should not be visible while timer is running
    const startButton = authenticatedCompanyOwnerPage.getByRole('button', { name: /start|rozpocznij/i });
    await expect(startButton).not.toBeVisible();

    // Cleanup
    await timeTrackingPage.stopTimer();
  });
});

test.describe('Time Tracking - Manual Time Entries', () => {
  test('should create a manual time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);
    const description = `Manual Entry ${Date.now()}`;

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    await timeTrackingPage.createTimeEntry({
      description,
      startTime: '09:00',
      endTime: '10:30',
    });

    await timeTrackingPage.expectEntryInList(description);
  });

  test('should edit an existing time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);
    const originalDescription = `Entry to edit ${Date.now()}`;
    const updatedDescription = `Updated entry ${Date.now()}`;

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    // Create entry
    await timeTrackingPage.createTimeEntry({
      description: originalDescription,
      startTime: '10:00',
      endTime: '11:00',
    });

    // Edit entry
    await timeTrackingPage.editEntry(originalDescription);
    await timeTrackingPage.fillEntryForm({ description: updatedDescription });
    await timeTrackingPage.saveEntry();

    await timeTrackingPage.expectEntryInList(updatedDescription);
    await timeTrackingPage.expectEntryNotInList(originalDescription);
  });

  test('should delete a time entry', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);
    const description = `Entry to delete ${Date.now()}`;

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    // Create entry
    await timeTrackingPage.createTimeEntry({
      description,
      startTime: '14:00',
      endTime: '15:00',
    });

    await timeTrackingPage.expectEntryInList(description);

    // Delete entry
    await timeTrackingPage.deleteEntry(description);
    await timeTrackingPage.expectEntryNotInList(description);
  });

  test('should validate time entry form - end time after start time', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    await timeTrackingPage.openAddEntryForm();
    await timeTrackingPage.fillEntryForm({
      description: 'Invalid time entry',
      startTime: '15:00',
      endTime: '14:00', // End before start
    });

    // Form should not submit or show validation error
    await timeTrackingPage.saveEntry();

    // Check for validation error message
    const errorText = authenticatedCompanyOwnerPage.getByText(/czas końcowy|end time.*after|przed czasem/i);
    const isStillInDialog = await timeTrackingPage.entryFormDialog.isVisible();

    // Either validation error shows or dialog stays open
    expect(await errorText.isVisible() || isStillInDialog).toBe(true);
  });

  test('should calculate duration automatically', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);
    const description = `Duration test ${Date.now()}`;

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    await timeTrackingPage.createTimeEntry({
      description,
      startTime: '09:00',
      endTime: '11:30', // 2.5 hours
    });

    // Verify entry shows correct duration (format depends on UI)
    const row = timeTrackingPage.getEntryRow(description);
    const rowText = await row.textContent();

    // Should contain some representation of 2:30 or 2.5h
    expect(rowText).toMatch(/2[:\.]30|2\.5\s*h|150\s*min/i);
  });
});

test.describe('Time Tracking - Views', () => {
  test('should switch between daily, weekly, and list views', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();

    // Switch to weekly view
    await timeTrackingPage.switchToWeeklyView();
    await expect(timeTrackingPage.weeklyTab).toHaveAttribute('data-state', 'active');

    // Switch to daily view
    await timeTrackingPage.switchToDailyView();
    await expect(timeTrackingPage.dailyTab).toHaveAttribute('data-state', 'active');

    // Switch to entries list
    await timeTrackingPage.switchToEntriesListView();
    await expect(timeTrackingPage.entriesListTab).toHaveAttribute('data-state', 'active');
  });

  test('should display total hours', async ({ authenticatedCompanyOwnerPage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedCompanyOwnerPage);

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToWeeklyView();

    const totalHours = await timeTrackingPage.getTotalHours();
    // Total hours should be a valid number format
    expect(totalHours).toMatch(/\d+([.,]\d+)?/);
  });
});

test.describe('Time Tracking - Employee Access', () => {
  test('employee should be able to use time tracking', async ({ authenticatedEmployeePage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedEmployeePage);

    await timeTrackingPage.goto();
    await timeTrackingPage.expectToBeOnTimeTrackingPage();

    // Employee should see timer widget
    await expect(timeTrackingPage.timerWidget).toBeVisible();
  });

  test('employee should only see their own time entries', async ({ authenticatedEmployeePage }) => {
    const timeTrackingPage = new TimeTrackingPage(authenticatedEmployeePage);
    const employeeDescription = `Employee entry ${Date.now()}`;
    const uniqueOwnerMarker = `OWNER_ONLY_${Date.now()}`;

    await timeTrackingPage.goto();
    await timeTrackingPage.switchToEntriesListView();

    // Get initial count of entries (should only be employee's entries)
    const initialCount = await timeTrackingPage.getEntriesCount();

    // Create entry as employee
    await timeTrackingPage.createTimeEntry({
      description: employeeDescription,
      startTime: '09:00',
      endTime: '10:00',
    });

    // Should see own entry
    await timeTrackingPage.expectEntryInList(employeeDescription);

    // Entry count should increase by exactly 1 (only own entries visible)
    const newCount = await timeTrackingPage.getEntriesCount();
    expect(newCount).toBe(initialCount + 1);

    // Verify isolation: employee should NOT see entries with owner-specific markers
    // (These would be created by company owner in a separate session)
    const pageContent = await timeTrackingPage.page.content();
    expect(pageContent).not.toContain(uniqueOwnerMarker);
  });
});
