import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

/**
 * CompanyDashboardPage - Company Owner dashboard
 */
export class CompanyDashboardPage extends BasePage {
  readonly nav: NavigationComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Company Dashboard"), h1:has-text("Dashboard")';
  private readonly employeesCard = '[data-testid="employees-card"], div:has-text("Employees")';
  private readonly modulesCard = '[data-testid="modules-card"], div:has-text("Modules")';
  private readonly statsContainer = '[data-testid="stats-container"], .stats';
  private readonly employeeCount = '[data-testid="employee-count"]';
  private readonly moduleCount = '[data-testid="module-count"]';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  /**
   * Navigate to company dashboard
   */
  async goto(): Promise<void> {
    await super.goto('/company');
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboard(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on company dashboard
   */
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectURL('/company');
    await this.expectVisible(this.heading);
  }

  /**
   * Navigate to Employees page
   */
  async goToEmployees(): Promise<void> {
    await this.nav.goToEmployees();
  }

  /**
   * Navigate to Modules page
   */
  async goToModules(): Promise<void> {
    await this.nav.goToModulesPage();
  }

  /**
   * Click employees card
   */
  async clickEmployeesCard(): Promise<void> {
    if (await this.isVisible(this.employeesCard)) {
      await this.click(this.employeesCard);
      await this.waitForPageLoad();
    }
  }

  /**
   * Click modules card
   */
  async clickModulesCard(): Promise<void> {
    if (await this.isVisible(this.modulesCard)) {
      await this.click(this.modulesCard);
      await this.waitForPageLoad();
    }
  }

  /**
   * Check if employees card is visible
   */
  async expectEmployeesCardVisible(): Promise<void> {
    await this.expectVisible(this.employeesCard);
  }

  /**
   * Check if modules card is visible
   */
  async expectModulesCardVisible(): Promise<void> {
    await this.expectVisible(this.modulesCard);
  }

  /**
   * Get employee count from stats
   */
  async getEmployeeCount(): Promise<number> {
    if (await this.isVisible(this.employeeCount)) {
      const countText = await this.getText(this.employeeCount);
      return parseInt(countText) || 0;
    }
    return 0;
  }

  /**
   * Get module count from stats
   */
  async getModuleCount(): Promise<number> {
    if (await this.isVisible(this.moduleCount)) {
      const countText = await this.getText(this.moduleCount);
      return parseInt(countText) || 0;
    }
    return 0;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.nav.logout();
  }
}
