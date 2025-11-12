import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

/**
 * ModulesDashboardPage - Employee modules dashboard
 */
export class ModulesDashboardPage extends BasePage {
  readonly nav: NavigationComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Modules"), h1:has-text("My Modules")';
  private readonly moduleCard = (moduleName: string) => `[data-testid="module-${moduleName}"], a:has-text("${moduleName}"), div:has-text("${moduleName}")`;
  private readonly modulesList = '[data-testid="modules-list"], .modules-grid';
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No modules"), div:has-text("Coming soon")';
  private readonly accessButton = (moduleName: string) => `a[href*="${moduleName}"], button:has-text("Access"):near(text="${moduleName}")`;

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  /**
   * Navigate to modules dashboard
   */
  async goto(): Promise<void> {
    await super.goto('/modules');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForDashboard(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on modules dashboard
   */
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectURLContains('/modules');
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
    const isVisible = await this.hasModule(moduleName);
    expect(isVisible).toBe(false);
  }

  /**
   * Click on module to access it
   */
  async accessModule(moduleName: string): Promise<void> {
    // Try clicking the module card or access button
    const cardVisible = await this.isVisible(this.moduleCard(moduleName));

    if (cardVisible) {
      await this.click(this.moduleCard(moduleName));
    } else {
      await this.click(this.accessButton(moduleName));
    }

    await this.waitForPageLoad();
  }

  /**
   * Get count of visible modules
   */
  async getModuleCount(): Promise<number> {
    const isEmptyState = await this.isVisible(this.emptyState);

    if (isEmptyState) {
      return 0;
    }

    const modules = await this.page.locator(`${this.modulesList} > *, [data-testid^="module-"]`).all();
    return modules.length;
  }

  /**
   * Expect empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }

  /**
   * Expect modules are visible (not empty state)
   */
  async expectModulesVisible(): Promise<void> {
    const count = await this.getModuleCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Get all visible module names
   */
  async getAllModuleNames(): Promise<string[]> {
    const moduleCards = await this.page.locator('[data-testid^="module-"]').all();
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
   * Navigate to Simple Text module
   */
  async goToSimpleText(): Promise<void> {
    await this.accessModule('simple-text');
  }

  /**
   * Expect specific module count
   */
  async expectModuleCount(count: number): Promise<void> {
    const actualCount = await this.getModuleCount();
    expect(actualCount).toBe(count);
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.nav.logout();
  }
}
