import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * SettlementsPage - Page Object for Settlements module (settings and email dialog)
 */
export class SettlementsPage extends BasePage {
  readonly toast: ToastComponent;

  // Settings page selectors
  private readonly settingsTitle = 'text=Ustawienia modułu Rozliczenia';
  private readonly saveSettingsButton = 'button:has-text("Zapisz ustawienia")';
  private readonly defaultPrioritySelect = '#defaultPriority';
  private readonly defaultDeadlineDayInput = '#defaultDeadlineDay';
  private readonly autoAssignSwitch = '#autoAssignEnabled';
  private readonly notifyStatusSwitch = '#notifyOnStatusChange';
  private readonly notifyDeadlineSwitch = '#notifyOnDeadlineApproaching';
  private readonly deadlineWarningDaysInput = '#deadlineWarningDays';

  // Settlements list selectors
  private readonly table = 'table';
  private readonly tableRow = 'tbody tr';
  private readonly exportButton = 'button:has-text("Eksport CSV"), button:has-text("CSV")';

  // Email dialog selectors (AlertDialog for MISSING_INVOICE status)
  private readonly emailAlertDialog = '[role="alertdialog"]';
  private readonly sendEmailAndChangeBtn =
    '[role="alertdialog"] button:has-text("Wyślij email i zmień status")';
  private readonly changeStatusOnlyBtn =
    '[role="alertdialog"] button:has-text("Tylko zmień status")';
  private readonly cancelStatusChangeBtn = '[role="alertdialog"] button:has-text("Anuluj zmianę")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async gotoSettings(basePath: string = '/company/modules/settlements'): Promise<void> {
    await super.goto(`${basePath}/settings`);
    await this.waitForPageLoad();
  }

  async gotoList(basePath: string = '/company/modules/settlements'): Promise<void> {
    await super.goto(`${basePath}/list`);
    await this.waitForPageLoad();
  }

  async expectToBeOnSettingsPage(): Promise<void> {
    await this.expectVisible(this.settingsTitle);
  }

  async expectAllSettingsSections(): Promise<void> {
    await this.expectVisible('text=Domyślne wartości');
    await this.expectVisible('text=Automatyzacja');
    await expect(this.page.getByRole('heading', { name: 'Powiadomienia' })).toBeVisible();
  }

  async setDefaultPriority(priority: '0' | '1' | '2' | '3'): Promise<void> {
    await this.page.locator(this.defaultPrioritySelect).click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    const labels: Record<string, string> = {
      '0': 'Normalny',
      '1': 'Wysoki',
      '2': 'Pilny',
      '3': 'Krytyczny',
    };
    await this.page.locator(`[role="option"]:has-text("${labels[priority]}")`).click();
  }

  async setDeadlineDay(day: string): Promise<void> {
    await this.page.locator(this.defaultDeadlineDayInput).fill(day);
  }

  async toggleAutoAssign(): Promise<void> {
    await this.page.locator(this.autoAssignSwitch).click();
  }

  async toggleNotifyOnStatusChange(): Promise<void> {
    await this.page.locator(this.notifyStatusSwitch).click();
  }

  async toggleNotifyOnDeadlineApproaching(): Promise<void> {
    await this.page.locator(this.notifyDeadlineSwitch).click();
  }

  async setWarningDays(days: string): Promise<void> {
    const input = this.page.locator(this.deadlineWarningDaysInput);
    await input.clear();
    await input.fill(days);
  }

  async saveSettings(): Promise<void> {
    await this.click(this.saveSettingsButton);
    await this.waitForPageLoad();
  }

  async clickExportCsv(): Promise<void> {
    await this.click(this.exportButton);
  }

  async expectEmailDialog(): Promise<void> {
    await this.expectVisible(this.emailAlertDialog);
  }

  async clickSendEmailAndChangeStatus(): Promise<void> {
    await this.click(this.sendEmailAndChangeBtn);
    await this.waitForPageLoad();
  }

  async clickChangeStatusOnly(): Promise<void> {
    await this.click(this.changeStatusOnlyBtn);
    await this.waitForPageLoad();
  }

  async clickCancelStatusChange(): Promise<void> {
    await this.click(this.cancelStatusChangeBtn);
    await this.page.waitForSelector(this.emailAlertDialog, { state: 'hidden' }).catch(() => {});
  }

  async triggerMissingInvoiceStatus(): Promise<void> {
    // Click a status dropdown in the settlements list and select MISSING_INVOICE
    const statusDropdown = this.page.locator('button[class*="min-w"]').first();
    await statusDropdown.click();
    await this.page.waitForSelector('[role="menu"]', { state: 'visible' });
    await this.page.locator('[role="menuitem"]:has-text("Brak faktury")').first().click();
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(this.tableRow).count();
  }

  async expectSettlementInList(title: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${title}")`)).toBeVisible();
  }
}
