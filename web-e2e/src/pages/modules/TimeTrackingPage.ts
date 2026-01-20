import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * TimeTrackingPage - Page Object Model for Time Tracking module
 * Handles timer operations, time entries, and timesheet views
 */
export class TimeTrackingPage extends BasePage {
  // Selectors
  readonly timerWidget: Locator;
  readonly startTimerButton: Locator;
  readonly stopTimerButton: Locator;
  readonly timerDisplay: Locator;
  readonly timerDescriptionInput: Locator;
  readonly timeEntriesTable: Locator;
  readonly addEntryButton: Locator;
  readonly entryFormDialog: Locator;
  readonly saveEntryButton: Locator;
  readonly cancelEntryButton: Locator;
  readonly deleteEntryButton: Locator;
  readonly weeklyTab: Locator;
  readonly dailyTab: Locator;
  readonly entriesListTab: Locator;

  constructor(page: Page) {
    super(page);
    this.timerWidget = page.getByTestId('timer-widget');
    this.startTimerButton = page.getByRole('button', { name: /start|rozpocznij/i });
    this.stopTimerButton = page.getByRole('button', { name: /stop|zatrzymaj/i });
    this.timerDisplay = page.getByTestId('timer-display');
    this.timerDescriptionInput = page.getByPlaceholder(/opis|description/i);
    this.timeEntriesTable = page.getByTestId('time-entries-table');
    this.addEntryButton = page.getByRole('button', { name: /dodaj|add|nowy wpis/i });
    this.entryFormDialog = page.getByRole('dialog');
    this.saveEntryButton = page.getByRole('button', { name: /zapisz|save/i });
    this.cancelEntryButton = page.getByRole('button', { name: /anuluj|cancel/i });
    this.deleteEntryButton = page.getByRole('button', { name: /usuń|delete/i });
    this.weeklyTab = page.getByRole('tab', { name: /tydzień|weekly/i });
    this.dailyTab = page.getByRole('tab', { name: /dzień|daily/i });
    this.entriesListTab = page.getByRole('tab', { name: /lista|entries/i });
  }

  /**
   * Navigate to time tracking page
   */
  async goto(): Promise<void> {
    await super.goto('/modules/time-tracking');
  }

  /**
   * Check we're on the time tracking page
   */
  async expectToBeOnTimeTrackingPage(): Promise<void> {
    await this.expectURLContains('time-tracking');
  }

  /**
   * Start a timer with optional description
   */
  async startTimer(description?: string): Promise<void> {
    if (description) {
      await this.timerDescriptionInput.fill(description);
    }
    await this.startTimerButton.click();
    // Wait for timer to actually start by checking stop button visibility
    await expect(this.stopTimerButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Stop the running timer
   */
  async stopTimer(): Promise<void> {
    await this.stopTimerButton.click();
    // Wait for timer to stop by checking start button visibility
    await expect(this.startTimerButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if timer is running
   */
  async isTimerRunning(): Promise<boolean> {
    return await this.stopTimerButton.isVisible();
  }

  /**
   * Get timer elapsed time text
   */
  async getTimerElapsedTime(): Promise<string> {
    return await this.timerDisplay.textContent() || '';
  }

  /**
   * Expect timer to be running
   */
  async expectTimerRunning(): Promise<void> {
    await expect(this.stopTimerButton).toBeVisible();
  }

  /**
   * Expect timer to be stopped
   */
  async expectTimerStopped(): Promise<void> {
    await expect(this.startTimerButton).toBeVisible();
  }

  /**
   * Open add time entry form
   */
  async openAddEntryForm(): Promise<void> {
    await this.addEntryButton.click();
    await expect(this.entryFormDialog).toBeVisible();
  }

  /**
   * Fill time entry form
   */
  async fillEntryForm(data: {
    description: string;
    startTime?: string;
    endTime?: string;
    date?: string;
  }): Promise<void> {
    await this.entryFormDialog.getByLabel(/opis|description/i).fill(data.description);

    if (data.startTime) {
      await this.entryFormDialog.getByLabel(/początek|start/i).fill(data.startTime);
    }

    if (data.endTime) {
      await this.entryFormDialog.getByLabel(/koniec|end/i).fill(data.endTime);
    }

    if (data.date) {
      await this.entryFormDialog.getByLabel(/data|date/i).fill(data.date);
    }
  }

  /**
   * Save time entry
   */
  async saveEntry(): Promise<void> {
    await this.saveEntryButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cancel time entry form
   */
  async cancelEntry(): Promise<void> {
    await this.cancelEntryButton.click();
  }

  /**
   * Create a complete time entry
   */
  async createTimeEntry(data: {
    description: string;
    startTime?: string;
    endTime?: string;
    date?: string;
  }): Promise<void> {
    await this.openAddEntryForm();
    await this.fillEntryForm(data);
    await this.saveEntry();
  }

  /**
   * Get time entry row by description
   */
  getEntryRow(description: string): Locator {
    return this.page.locator('tr', { hasText: description });
  }

  /**
   * Expect time entry to be in list
   */
  async expectEntryInList(description: string): Promise<void> {
    await expect(this.getEntryRow(description)).toBeVisible();
  }

  /**
   * Expect time entry not in list
   */
  async expectEntryNotInList(description: string): Promise<void> {
    await expect(this.getEntryRow(description)).not.toBeVisible();
  }

  /**
   * Edit a time entry
   */
  async editEntry(description: string): Promise<void> {
    const row = this.getEntryRow(description);
    await row.getByRole('button', { name: /edytuj|edit/i }).click();
    await expect(this.entryFormDialog).toBeVisible();
  }

  /**
   * Delete a time entry
   */
  async deleteEntry(description: string): Promise<void> {
    const row = this.getEntryRow(description);
    await row.getByRole('button', { name: /usuń|delete/i }).click();
    // Confirm deletion if dialog appears
    const confirmButton = this.page.getByRole('button', { name: /potwierdź|confirm|tak|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to weekly view
   */
  async switchToWeeklyView(): Promise<void> {
    await this.weeklyTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to daily view
   */
  async switchToDailyView(): Promise<void> {
    await this.dailyTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to entries list view
   */
  async switchToEntriesListView(): Promise<void> {
    await this.entriesListTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get total hours displayed
   */
  async getTotalHours(): Promise<string> {
    const totalElement = this.page.getByTestId('total-hours');
    return await totalElement.textContent() || '0';
  }

  /**
   * Get count of time entries in list
   */
  async getEntriesCount(): Promise<number> {
    const rows = this.page.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Wait for entries to load
   */
  async waitForEntriesLoad(): Promise<void> {
    await this.page.waitForResponse(/\/api\/time-tracking/);
  }
}
