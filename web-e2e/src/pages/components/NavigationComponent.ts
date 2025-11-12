import { Page, Locator } from '@playwright/test';

/**
 * NavigationComponent - Handles navigation menu interactions
 * Used across Admin, Company Owner, and Employee layouts
 */
export class NavigationComponent {
  readonly page: Page;

  // Navigation selectors
  private readonly navContainer = '[role="navigation"]';
  private readonly navLink = (text: string) => `a:has-text("${text}")`;
  private readonly userMenuButton = '[data-testid="user-menu-button"], button:has-text("admin@"), button:has-text("owner"), button:has-text("employee")';
  private readonly logoutButton = 'button:has-text("Logout"), [data-testid="logout-button"]';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific route by clicking nav link
   */
  async navigateTo(linkText: string): Promise<void> {
    await this.page.click(this.navLink(linkText));
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if navigation link exists
   */
  async hasNavLink(linkText: string): Promise<boolean> {
    return await this.page.isVisible(this.navLink(linkText));
  }

  /**
   * Open user menu
   */
  async openUserMenu(): Promise<void> {
    await this.page.click(this.userMenuButton);
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Try to find and click user menu if visible
    const userMenuVisible = await this.page.isVisible(this.userMenuButton);
    if (userMenuVisible) {
      await this.openUserMenu();
      await this.page.waitForTimeout(500); // Wait for menu animation
    }

    // Click logout button
    await this.page.click(this.logoutButton);
    await this.page.waitForURL('**/login');
  }

  /**
   * Get all visible navigation links
   */
  async getVisibleNavLinks(): Promise<string[]> {
    const links = await this.page.$$eval(
      `${this.navContainer} a`,
      (elements) => elements.map((el) => el.textContent?.trim() || '')
    );
    return links.filter(Boolean);
  }

  /**
   * Check if specific navigation link is visible
   */
  async expectNavLinkVisible(linkText: string): Promise<void> {
    await this.page.waitForSelector(this.navLink(linkText), { state: 'visible' });
  }

  /**
   * Check if specific navigation link is hidden
   */
  async expectNavLinkHidden(linkText: string): Promise<void> {
    const isVisible = await this.hasNavLink(linkText);
    if (isVisible) {
      throw new Error(`Expected nav link "${linkText}" to be hidden, but it's visible`);
    }
  }

  /**
   * Admin navigation - Navigate to Users
   */
  async goToUsers(): Promise<void> {
    await this.navigateTo('Users');
  }

  /**
   * Admin navigation - Navigate to Companies
   */
  async goToCompanies(): Promise<void> {
    await this.navigateTo('Companies');
  }

  /**
   * Admin navigation - Navigate to Modules
   */
  async goToModules(): Promise<void> {
    await this.navigateTo('Modules');
  }

  /**
   * Admin navigation - Navigate to Dashboard
   */
  async goToDashboard(): Promise<void> {
    await this.navigateTo('Dashboard');
  }

  /**
   * Company Owner navigation - Navigate to Employees
   */
  async goToEmployees(): Promise<void> {
    await this.navigateTo('Employees');
  }

  /**
   * Employee/Company Owner navigation - Navigate to Modules
   */
  async goToModulesPage(): Promise<void> {
    await this.navigateTo('Modules');
  }

  /**
   * Get current active navigation item
   */
  async getActiveNavItem(): Promise<string | null> {
    const activeLink = await this.page.$eval(
      `${this.navContainer} a[aria-current="page"], ${this.navContainer} a.active`,
      (el) => el.textContent?.trim() || null
    ).catch(() => null);

    return activeLink;
  }
}
