import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

/**
 * CompanyModulesListPage - Company Owner view of available modules
 */
export class CompanyModulesListPage extends BasePage {
  readonly nav: NavigationComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Modules")';
  private readonly moduleCard = (moduleName: string) => `[data-testid="module-${moduleName}"], div:has-text("${moduleName}")`;
  private readonly modulesList = '[data-testid="modules-list"], .modules-grid';
  private readonly enabledBadge = '[data-testid="enabled-badge"], .badge:has-text("Enabled")';
  private readonly disabledBadge = '[data-testid="disabled-badge"], .badge:has-text("Disabled")';
  private readonly accessButton = (moduleName: string) => `[data-testid="access-${moduleName}"], button:has-text("Access"):near(text="${moduleName}")`;
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No modules")';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  /**
   * Navigate to company modules page
   */
  async goto(): Promise<void> {
    await super.goto('/company/modules');
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
    await this.expectURLContains('/company/modules');
    await this.expectVisible(this.heading);
  }

  /**
   * Check if module card is visible
   */
  async hasModule(moduleName: string): Promise<boolean> {
    return await this.isVisible(this.moduleCard(moduleName));
  }

  /**
   * Expect module is visible
   */
  async expectModuleVisible(moduleName: string): Promise<void> {
    await this.expectVisible(this.moduleCard(moduleName));
  }

  /**
   * Expect module is not visible
   */
  async expectModuleNotVisible(moduleName: string): Promise<void> {
    await this.expectHidden(this.moduleCard(moduleName));
  }

  /**
   * Click access button for module
   */
  async accessModule(moduleName: string): Promise<void> {
    await this.click(this.accessButton(moduleName));
    await this.waitForPageLoad();
  }

  /**
   * Get count of visible modules
   */
  async getModuleCount(): Promise<number> {
    const modules = await this.page.locator(`${this.modulesList} > *`).all();
    return modules.length;
  }

  /**
   * Expect empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }

  /**
   * Check if module is enabled
   */
  async isModuleEnabled(moduleName: string): Promise<boolean> {
    const moduleCardLoc = this.page.locator(this.moduleCard(moduleName));
    const enabledBadge = moduleCardLoc.locator(this.enabledBadge);

    return await enabledBadge.isVisible();
  }

  /**
   * Expect module is enabled
   */
  async expectModuleEnabled(moduleName: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(moduleName);
    expect(isEnabled).toBe(true);
  }

  /**
   * Expect module is disabled
   */
  async expectModuleDisabled(moduleName: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(moduleName);
    expect(isEnabled).toBe(false);
  }

  /**
   * Get all visible module names
   */
  async getAllModuleNames(): Promise<string[]> {
    const moduleCards = await this.page.locator(`${this.modulesList} [data-testid^="module-"]`).all();
    const names: string[] = [];

    for (const card of moduleCards) {
      const testId = await card.getAttribute('data-testid');
      if (testId) {
        const moduleName = testId.replace('module-', '');
        names.push(moduleName);
      }
    }

    return names;
  }

  /**
   * Expect specific module count
   */
  async expectModuleCount(count: number): Promise<void> {
    const actualCount = await this.getModuleCount();
    expect(actualCount).toBe(count);
  }
}
