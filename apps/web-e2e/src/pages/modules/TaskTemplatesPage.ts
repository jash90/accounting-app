import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * TaskTemplatesPage - Page Object for Task Templates
 */
export class TaskTemplatesPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'h1:has-text("Szablony zadań")';
  private readonly createButton = 'button:has-text("Nowy szablon")';
  private readonly emptyState = 'text=Brak szablonów zadań';
  private readonly table = 'table';
  private readonly tableRow = 'tbody tr';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';
  private readonly alertDialog = '[role="alertdialog"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/templates`);
    await this.waitForPageLoad();
  }

  async expectToBeOnPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  async clickCreateTemplate(): Promise<void> {
    await this.click(this.createButton);
    await this.waitForVisible(this.dialog);
  }

  async fillTemplateForm(data: {
    title: string;
    description?: string;
    hasRecurrence?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
  }): Promise<void> {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const dialog = this.page.locator('[role="dialog"]');

    await dialog.locator('#tmpl-title').fill(data.title);

    if (data.description) {
      await dialog.locator('#tmpl-desc').fill(data.description);
    }

    if (data.hasRecurrence) {
      await this.toggleRecurrence(true);
      if (data.frequency) {
        await this.selectFrequencyInDialog(data.frequency);
      }
    }
  }

  async toggleRecurrence(enabled: boolean): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const checkbox = dialog.locator('#tmpl-recur');
    const isChecked = await checkbox.isChecked();
    if (isChecked !== enabled) {
      await checkbox.click();
    }
  }

  async selectFrequencyInDialog(freq: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const freqLabels = { daily: 'Dziennie', weekly: 'Tygodniowo', monthly: 'Miesięcznie' };
    // Click the frequency SelectTrigger (inside recurrence panel)
    const selectTriggers = dialog.locator('button[role="combobox"]');
    await selectTriggers.last().click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${freqLabels[freq]}")`).click();
  }

  async selectFrequency(freq: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    await this.selectFrequencyInDialog(freq);
  }

  async selectDaysOfWeek(days: number[]): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const dayLabels = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    for (const day of days) {
      await dialog.locator(`button:has-text("${dayLabels[day]}")`).click();
    }
  }

  async submitTemplateForm(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    // Click the submit button (not "Anuluj")
    await dialog
      .locator('button:not([variant="outline"]):has-text("Utwórz"), button:has-text("Zapisz")')
      .first()
      .click();
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async editTemplate(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    // Edit icon button (second of the action buttons)
    await row.locator('button[title=""], button').nth(1).click();
    await this.waitForVisible(this.dialog);
  }

  async deleteTemplate(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    // Trash icon is last button in the row
    await row.locator('button').last().click();
    // ConfirmDialog
    await this.waitForVisible(this.alertDialog);
    await this.page.locator(`${this.alertDialog} button:has-text("Usuń")`).click();
    await this.waitForPageLoad();
  }

  async createTaskFromTemplate(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    // Copy icon is first action button
    await row.locator('button').first().click();
    await this.waitForPageLoad();
  }

  async expectTemplateInList(title: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${title}")`)).toBeVisible();
  }

  async expectTemplateNotInList(title: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${title}")`)).not.toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }

  async expectRecurrenceBadge(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    await expect(
      row.locator(
        '[class*="badge"], span:has-text("Dziennie"), span:has-text("Tygodniowo"), span:has-text("Miesięcznie")'
      )
    ).toBeVisible();
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(this.tableRow).count();
  }
}
