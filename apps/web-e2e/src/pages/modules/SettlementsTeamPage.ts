import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * SettlementsTeamPage - Page Object for Settlements Team Management
 */
export class SettlementsTeamPage extends BasePage {
  private readonly pageTitle = 'h1:has-text("Zarządzanie zespołem")';

  constructor(page: Page) {
    super(page);
  }

  override async goto(basePath: string = '/company/modules/settlements'): Promise<void> {
    await super.goto(`${basePath}/team`);
    await this.waitForPageLoad();
  }

  async expectToBeOnTeamPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  async expectEmployeeStatsSection(): Promise<void> {
    await expect(this.page.getByText('Statystyki pracowników').first()).toBeVisible();
  }

  async expectBulkAssignSection(): Promise<void> {
    await expect(this.page.getByText('Masowe przypisywanie').first()).toBeVisible();
  }

  async expectTargetEmployeeSelector(): Promise<void> {
    await expect(this.page.getByText('Wybierz pracownika').first()).toBeVisible();
  }

  async expectSelectAllCheckbox(): Promise<void> {
    await expect(this.page.getByText('Zaznacz wszystkie').first()).toBeVisible();
  }

  async selectTargetEmployee(name: string): Promise<void> {
    const trigger = this.page.locator('button[role="combobox"]:has-text("Wybierz pracownika")');
    await trigger.click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${name}")`).click();
  }

  async toggleSelectAll(): Promise<void> {
    const checkbox = this.page
      .locator('label:has-text("Zaznacz wszystkie") input, button[role="checkbox"]')
      .first();
    await checkbox.click();
  }

  async clickBulkAssign(): Promise<void> {
    await this.page.locator('button:has-text("Przypisz wybrane")').click();
    await this.waitForPageLoad();
  }
}
