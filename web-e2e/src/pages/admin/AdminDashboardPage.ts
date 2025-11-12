import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

/**
 * AdminDashboardPage - Admin dashboard page object
 */
export class AdminDashboardPage extends BasePage {
  readonly nav: NavigationComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Admin Dashboard")';
  private readonly usersCard = '[data-testid="users-card"], .shadow-sm:has-text("Total Users")';
  private readonly companiesCard = '[data-testid="companies-card"], .shadow-sm:has-text("Total Companies")';
  private readonly modulesCard = '[data-testid="modules-card"], .shadow-sm:has-text("Modules")';
  private readonly statsContainer = '[data-testid="stats-container"], .stats, .grid';
  private readonly userCount = '[data-testid="user-count"], .text-4xl';
  private readonly companyCount = '[data-testid="company-count"], .text-4xl';
  private readonly moduleCount = '[data-testid="module-count"], .text-4xl';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  /**
   * Navigate to admin dashboard
   */
  async goto(): Promise<void> {
    await super.goto('/admin');
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboard(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on admin dashboard
   */
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectURL('/admin');

    // Wait for content to load (indicates auth is ready)
    await this.page.waitForSelector('h1', { state: 'visible', timeout: 10000 });

    await this.expectVisible(this.heading);
  }

  /**
   * Ensure sidebar is expanded (not collapsed)
   */
  async ensureSidebarOpen(): Promise<void> {
    // Wait for sidebar to be present
    const sidebar = this.page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 5000 });

    // Check if sidebar is collapsed (small width)
    const width = await sidebar.evaluate((el) => el.clientWidth);

    if (width < 100) {
      // Look for menu toggle button and click it
      const menuButton = this.page.locator('button:has(svg)').first();
      await menuButton.click();
      await this.page.waitForTimeout(300); // Wait for animation
    }
  }

  /**
   * Navigate to Users page
   */
  async goToUsers(): Promise<void> {
    await this.nav.goToUsers();
  }

  /**
   * Navigate to Companies page
   */
  async goToCompanies(): Promise<void> {
    await this.nav.goToCompanies();
  }

  /**
   * Navigate to Modules page
   */
  async goToModules(): Promise<void> {
    await this.nav.goToModules();
  }

  /**
   * Click users card
   */
  async clickUsersCard(): Promise<void> {
    await this.click(this.usersCard);
    await this.waitForPageLoad();
  }

  /**
   * Click companies card
   */
  async clickCompaniesCard(): Promise<void> {
    await this.click(this.companiesCard);
    await this.waitForPageLoad();
  }

  /**
   * Click modules card
   */
  async clickModulesCard(): Promise<void> {
    await this.click(this.modulesCard);
    await this.waitForPageLoad();
  }

  /**
   * Check if users card is visible
   */
  async expectUsersCardVisible(): Promise<void> {
    await this.expectVisible(this.usersCard);
  }

  /**
   * Check if companies card is visible
   */
  async expectCompaniesCardVisible(): Promise<void> {
    await this.expectVisible(this.companiesCard);
  }

  /**
   * Check if modules card is visible
   */
  async expectModulesCardVisible(): Promise<void> {
    await this.expectVisible(this.modulesCard);
  }

  /**
   * Get user count from stats
   */
  async getUserCount(): Promise<number> {
    const countText = await this.getText(this.userCount);
    return parseInt(countText) || 0;
  }

  /**
   * Get company count from stats
   */
  async getCompanyCount(): Promise<number> {
    const countText = await this.getText(this.companyCount);
    return parseInt(countText) || 0;
  }

  /**
   * Get module count from stats
   */
  async getModuleCount(): Promise<number> {
    const countText = await this.getText(this.moduleCount);
    return parseInt(countText) || 0;
  }

  /**
   * Expect stats are displayed
   */
  async expectStatsVisible(): Promise<void> {
    const hasStats = await this.isVisible(this.statsContainer);
    expect(hasStats).toBe(true);
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.nav.logout();
  }
}
