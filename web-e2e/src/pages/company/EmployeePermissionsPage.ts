import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * EmployeePermissionsPage - Manage employee module permissions
 */
export class EmployeePermissionsPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Permissions"), h1:has-text("Employee Permissions")';
  private readonly employeeEmail = '[data-testid="employee-email"], h2';
  private readonly modulesList = '[data-testid="modules-list"], .modules-list';
  private readonly moduleCard = (moduleName: string) => `[data-testid="module-${moduleName}"], div:has-text("${moduleName}")`;
  private readonly readCheckbox = (moduleName: string) => `[data-testid="read-${moduleName}"], input[type="checkbox"][name*="read"]:near(text="${moduleName}")`;
  private readonly writeCheckbox = (moduleName: string) => `[data-testid="write-${moduleName}"], input[type="checkbox"][name*="write"]:near(text="${moduleName}")`;
  private readonly deleteCheckbox = (moduleName: string) => `[data-testid="delete-${moduleName}"], input[type="checkbox"][name*="delete"]:near(text="${moduleName}")`;
  private readonly saveButton = 'button:has-text("Save"), button[type="submit"]';
  private readonly backButton = 'button:has-text("Back"), a:has-text("Back")';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to employee permissions page
   */
  async goto(employeeId: string): Promise<void> {
    await super.goto(`/company/employees/${employeeId}/permissions`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForPermissionsPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on permissions page
   */
  async expectToBeOnPermissionsPage(): Promise<void> {
    await this.expectURLContains('/permissions');
    await this.expectVisible(this.heading);
  }

  /**
   * Get employee email from page
   */
  async getEmployeeEmail(): Promise<string> {
    return await this.getText(this.employeeEmail);
  }

  /**
   * Grant read permission for module
   */
  async grantReadPermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.readCheckbox(moduleName)).first();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  /**
   * Grant write permission for module
   */
  async grantWritePermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.writeCheckbox(moduleName)).first();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  /**
   * Grant delete permission for module
   */
  async grantDeletePermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.deleteCheckbox(moduleName)).first();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  /**
   * Revoke read permission for module
   */
  async revokeReadPermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.readCheckbox(moduleName)).first();
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  /**
   * Revoke write permission for module
   */
  async revokeWritePermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.writeCheckbox(moduleName)).first();
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  /**
   * Revoke delete permission for module
   */
  async revokeDeletePermission(moduleName: string): Promise<void> {
    const checkbox = this.page.locator(this.deleteCheckbox(moduleName)).first();
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  /**
   * Check if read permission is granted
   */
  async hasReadPermission(moduleName: string): Promise<boolean> {
    const checkbox = this.page.locator(this.readCheckbox(moduleName)).first();
    return await checkbox.isChecked();
  }

  /**
   * Check if write permission is granted
   */
  async hasWritePermission(moduleName: string): Promise<boolean> {
    const checkbox = this.page.locator(this.writeCheckbox(moduleName)).first();
    return await checkbox.isChecked();
  }

  /**
   * Check if delete permission is granted
   */
  async hasDeletePermission(moduleName: string): Promise<boolean> {
    const checkbox = this.page.locator(this.deleteCheckbox(moduleName)).first();
    return await checkbox.isChecked();
  }

  /**
   * Grant all permissions for module
   */
  async grantAllPermissions(moduleName: string): Promise<void> {
    await this.grantReadPermission(moduleName);
    await this.grantWritePermission(moduleName);
    await this.grantDeletePermission(moduleName);
  }

  /**
   * Revoke all permissions for module
   */
  async revokeAllPermissions(moduleName: string): Promise<void> {
    await this.revokeReadPermission(moduleName);
    await this.revokeWritePermission(moduleName);
    await this.revokeDeletePermission(moduleName);
  }

  /**
   * Save permissions
   */
  async savePermissions(): Promise<void> {
    await this.click(this.saveButton);
    await this.toast.expectSuccessToast();
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }

  /**
   * Grant permissions and save (full flow)
   */
  async grantAndSave(moduleName: string, permissions: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  }): Promise<void> {
    if (permissions.read) await this.grantReadPermission(moduleName);
    if (permissions.write) await this.grantWritePermission(moduleName);
    if (permissions.delete) await this.grantDeletePermission(moduleName);

    await this.savePermissions();
  }

  /**
   * Expect permission state
   */
  async expectPermissions(moduleName: string, expected: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  }): Promise<void> {
    if (expected.read !== undefined) {
      const hasRead = await this.hasReadPermission(moduleName);
      expect(hasRead).toBe(expected.read);
    }

    if (expected.write !== undefined) {
      const hasWrite = await this.hasWritePermission(moduleName);
      expect(hasWrite).toBe(expected.write);
    }

    if (expected.delete !== undefined) {
      const hasDelete = await this.hasDeletePermission(moduleName);
      expect(hasDelete).toBe(expected.delete);
    }
  }

  /**
   * Check if module card is visible
   */
  async expectModuleVisible(moduleName: string): Promise<void> {
    await this.expectVisible(this.moduleCard(moduleName));
  }

  /**
   * Get all visible module names
   */
  async getVisibleModules(): Promise<string[]> {
    const moduleCards = await this.page.locator(this.modulesList).locator('[data-testid^="module-"]').all();
    const names: string[] = [];

    for (const card of moduleCards) {
      const name = await card.textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }
}
