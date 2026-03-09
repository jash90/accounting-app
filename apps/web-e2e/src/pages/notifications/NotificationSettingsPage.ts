import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * NotificationSettingsPage - Page Object for notification settings
 */
export class NotificationSettingsPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly settingsTitle = 'text=Ustawienia powiadomień';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly notificationTypeSwitch = (type: string) =>
    `[data-testid="notification-type-${type}"] input[type="checkbox"], label:has-text("${type}") input[type="checkbox"]`;
  private readonly notificationTypeRow = (type: string) =>
    `[data-testid="notification-type-${type}"], tr:has-text("${type}"), div:has-text("${type}")`;
  private readonly notificationTypesList =
    '[data-testid="notification-types"], table tbody tr, [role="list"] > div';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/notifications/settings');
    await this.waitForPageLoad();
  }

  async expectToBeOnSettingsPage(): Promise<void> {
    await this.expectURLContains('/notifications/settings');
    await this.expectVisible(this.settingsTitle);
  }

  async toggleNotificationType(type: string): Promise<void> {
    const row = this.page.locator(this.notificationTypeRow(type)).first();
    const toggle = row.locator('button[role="switch"], input[type="checkbox"]').first();
    await toggle.click();
  }

  async isNotificationTypeEnabled(type: string): Promise<boolean> {
    const row = this.page.locator(this.notificationTypeRow(type)).first();
    const toggle = row.locator('button[role="switch"], input[type="checkbox"]').first();
    const checked = await toggle.getAttribute('aria-checked');
    if (checked !== null) {
      return checked === 'true';
    }
    return await toggle.isChecked();
  }

  async saveSettings(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async expectSaveSuccess(): Promise<void> {
    await this.toast.expectSuccessToast();
  }

  async getNotificationTypes(): Promise<string[]> {
    const rows = await this.page.locator(this.notificationTypesList).all();
    const types: string[] = [];
    for (const row of rows) {
      const text = await row.textContent();
      if (text?.trim()) {
        types.push(text.trim());
      }
    }
    return types;
  }
}
