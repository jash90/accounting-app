import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * TimeTrackingSettingsPage - Page Object for Time Tracking settings
 * Handles settings configuration at /modules/time-tracking/settings
 */
export class TimeTrackingSettingsPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly settingsTitle = 'h1:has-text("Ustawienia"), h1:has-text("Śledzenie czasu")';
  private readonly saveButton = 'button:has-text("Zapisz")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(basePath: string = '/company/modules/time-tracking'): Promise<void> {
    await super.goto(`${basePath}/settings`);
    await this.waitForPageLoad();
  }

  async expectToBeOnSettingsPage(): Promise<void> {
    await this.expectURLContains('time-tracking/settings');
  }

  getSettingField(label: string): Locator {
    return this.page.getByLabel(label);
  }

  async updateSetting(label: string, value: string): Promise<void> {
    const field = this.getSettingField(label);
    await field.clear();
    await field.fill(value);
  }

  async saveSetting(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async expectSettingValue(label: string, value: string): Promise<void> {
    const field = this.getSettingField(label);
    await expect(field).toHaveValue(value);
  }

  async expectSuccessToast(message?: string): Promise<void> {
    await this.toast.expectSuccessToast(message);
  }
}
