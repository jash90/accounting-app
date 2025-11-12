import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * ModulesListPage - Admin modules management page
 */
export class ModulesListPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Modules")';
  private readonly moduleTable = 'table, [data-testid="modules-table"]';
  private readonly moduleRow = 'tr[data-testid*="module-"], tbody tr';
  private readonly moduleName = (name: string) => `td:has-text("${name}")`;
  private readonly enableButton = (moduleName: string, companyName: string) =>
    `tr:has(td:has-text("${moduleName}")):has(td:has-text("${companyName}")) button:has-text("Enable"), tr:has(td:has-text("${moduleName}")):has(td:has-text("${companyName}")) [data-testid="enable-button"]`;
  private readonly disableButton = (moduleName: string, companyName: string) =>
    `tr:has(td:has-text("${moduleName}")):has(td:has-text("${companyName}")) button:has-text("Disable"), tr:has(td:has-text("${moduleName}")):has(td:has-text("${companyName}")) [data-testid="disable-button"]`;
  private readonly statusBadge = (moduleName: string, companyName: string) =>
    `tr:has(td:has-text("${moduleName}")):has(td:has-text("${companyName}")) [data-testid="status-badge"]`;
  private readonly companyFilter = 'select[name="company"], [data-testid="company-filter"]';
  private readonly moduleFilter = 'select[name="module"], [data-testid="module-filter"]';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to modules page
   */
  async goto(): Promise<void> {
    await super.goto('/admin/modules');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForModulesPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on modules page
   */
  async expectToBeOnModulesPage(): Promise<void> {
    await this.expectURLContains('/admin/modules');
    await this.expectVisible(this.heading);
  }

  /**
   * Filter by company
   */
  async filterByCompany(companyName: string): Promise<void> {
    if (await this.isVisible(this.companyFilter)) {
      await this.page.selectOption(this.companyFilter, { label: companyName });
      await this.waitForPageLoad();
    }
  }

  /**
   * Filter by module
   */
  async filterByModule(moduleName: string): Promise<void> {
    if (await this.isVisible(this.moduleFilter)) {
      await this.page.selectOption(this.moduleFilter, { label: moduleName });
      await this.waitForPageLoad();
    }
  }

  /**
   * Enable module for company
   */
  async enableModule(moduleName: string, companyName: string): Promise<void> {
    const button = this.enableButton(moduleName, companyName);
    if (await this.isVisible(button)) {
      await this.click(button);
      await this.toast.expectSuccessToast();
    }
  }

  /**
   * Disable module for company
   */
  async disableModule(moduleName: string, companyName: string): Promise<void> {
    const button = this.disableButton(moduleName, companyName);
    if (await this.isVisible(button)) {
      await this.click(button);
      await this.toast.expectSuccessToast();
    }
  }

  /**
   * Check if module is enabled for company
   */
  async isModuleEnabled(moduleName: string, companyName: string): Promise<boolean> {
    const statusElement = this.page.locator(this.statusBadge(moduleName, companyName));
    if (await statusElement.isVisible()) {
      const status = await statusElement.textContent();
      return status?.toLowerCase().includes('enabled') || status?.toLowerCase().includes('active') || false;
    }
    return false;
  }

  /**
   * Expect module is enabled
   */
  async expectModuleEnabled(moduleName: string, companyName: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(moduleName, companyName);
    expect(isEnabled).toBe(true);
  }

  /**
   * Expect module is disabled
   */
  async expectModuleDisabled(moduleName: string, companyName: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(moduleName, companyName);
    expect(isEnabled).toBe(false);
  }

  /**
   * Get module row count
   */
  async getModuleRowCount(): Promise<number> {
    const rows = await this.page.locator(this.moduleRow).all();
    return rows.length;
  }

  /**
   * Check if module exists in list
   */
  async hasModule(name: string): Promise<boolean> {
    return await this.isVisible(this.moduleName(name));
  }

  /**
   * Expect module in list
   */
  async expectModuleInList(name: string): Promise<void> {
    await this.expectVisible(this.moduleName(name));
  }

  /**
   * Toggle module status (enable if disabled, disable if enabled)
   */
  async toggleModule(moduleName: string, companyName: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(moduleName, companyName);

    if (isEnabled) {
      await this.disableModule(moduleName, companyName);
    } else {
      await this.enableModule(moduleName, companyName);
    }
  }

  /**
   * Get all available module names
   */
  async getAllModuleNames(): Promise<string[]> {
    const moduleElements = await this.page.locator(this.moduleName('simple-text, tasks, reports')).all();
    const names: string[] = [];

    for (const element of moduleElements) {
      const name = await element.textContent();
      if (name) names.push(name.trim());
    }

    return [...new Set(names)]; // Remove duplicates
  }
}
