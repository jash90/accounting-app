import { Page, Locator } from '@playwright/test';

/**
 * NavigationComponent - Handles navigation menu interactions
 * Used across Admin, Company Owner, and Employee layouts
 */
export class NavigationComponent {
  readonly page: Page;

  // Navigation selectors
  private readonly navContainer = '[role="navigation"], aside nav, nav';
  private readonly navLink = (text: string) => `a:has-text("${text}"), a:has(span:text-is("${text}"))`;
  private readonly userMenuButton = '[data-testid="user-menu-button"], button:has(div[class*="avatar"]), button.rounded-full, button.relative.h-10.w-10';
  private readonly logoutButton = '[role="menuitem"]:has-text("Logout"), button:has-text("Logout"), [data-testid="logout-button"]';

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
    // Click user menu (Avatar button) to open dropdown
    await this.page.click(this.userMenuButton);

    // Wait for dropdown menu to appear
    await this.page.waitForSelector(this.logoutButton, { state: 'visible', timeout: 5000 });

    // Click logout button
    await this.page.click(this.logoutButton);

    // Wait for redirect to login page
    await this.page.waitForURL('**/login', { timeout: 5000 });
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

  // ============================================
  // Employee Sidebar Specific Methods
  // ============================================

  private readonly sidebarContainer = 'aside';
  private readonly sidebarToggle = 'button[aria-label*="sidebar" i], button[aria-label*="Collapse" i], button[aria-label*="Expand" i], aside button:has(svg)';
  private readonly moduleLink = (moduleName: string) => `aside nav a:has-text("${moduleName}")`;

  /**
   * Get all modules visible in the sidebar
   */
  async getSidebarModules(): Promise<string[]> {
    // Wait for sidebar to be visible
    await this.page.waitForSelector(this.sidebarContainer, { state: 'visible' });

    // Get all nav links except Dashboard
    const modules = await this.page.$$eval(
      `${this.sidebarContainer} nav a`,
      (elements) => elements
        .map((el) => el.textContent?.trim() || '')
        .filter((text) => text && text !== 'Dashboard')
    );

    return modules;
  }

  /**
   * Check if module is visible in sidebar
   */
  async expectModuleInSidebar(moduleName: string): Promise<void> {
    const selector = this.moduleLink(moduleName);
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: 5000
    });
  }

  /**
   * Check if module is NOT visible in sidebar
   */
  async expectModuleNotInSidebar(moduleName: string): Promise<void> {
    const selector = this.moduleLink(moduleName);
    const isVisible = await this.page.isVisible(selector);

    if (isVisible) {
      throw new Error(`Expected module "${moduleName}" NOT to be in sidebar, but it's visible`);
    }
  }

  /**
   * Check if sidebar is expanded (showing labels)
   */
  async isSidebarExpanded(): Promise<boolean> {
    const sidebar = await this.page.$(this.sidebarContainer);
    if (!sidebar) return false;

    // Check if sidebar has expanded width (w-64 = 256px)
    const width = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    return width > 100; // Collapsed is w-16 (64px), expanded is w-64 (256px)
  }

  /**
   * Get sidebar width in pixels
   */
  async getSidebarWidth(): Promise<number> {
    const sidebar = await this.page.$(this.sidebarContainer);
    if (!sidebar) return 0;

    return await sidebar.evaluate((el) => el.getBoundingClientRect().width);
  }

  /**
   * Toggle sidebar collapse/expand
   */
  async toggleSidebar(): Promise<void> {
    await this.page.click(this.sidebarToggle);
    // Wait for animation to complete
    await this.page.waitForTimeout(300);
  }

  /**
   * Navigate to a specific module from sidebar
   */
  async navigateToModule(moduleName: string): Promise<void> {
    const selector = this.moduleLink(moduleName);
    await this.page.click(selector);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if module link is active (highlighted)
   */
  async isModuleActive(moduleName: string): Promise<boolean> {
    const selector = `${this.moduleLink(moduleName)}[class*="primary"], ${this.moduleLink(moduleName)}[class*="bg-primary"]`;
    return await this.page.isVisible(selector);
  }
}
