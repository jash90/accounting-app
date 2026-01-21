import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * EmployeesListPage - Company Owner employees management
 */
export class EmployeesListPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Employees")';
  private readonly createEmployeeButton = 'button:has-text("Create Employee"), button:has-text("Add Employee"), button:has-text("Invite Employee")';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly employeeTable = 'table, [data-testid="employees-table"]';
  private readonly employeeRow = 'tr[data-testid*="employee-"], tbody tr';
  private readonly employeeEmail = (email: string) => `td:has-text("${email}")`;
  private readonly editButton = (email: string) => `tr:has(td:has-text("${email}")) button:has-text("Edit"), tr:has(td:has-text("${email}")) [data-testid="edit-button"]`;
  private readonly deleteButton = (email: string) => `tr:has(td:has-text("${email}")) button:has-text("Delete"), tr:has(td:has-text("${email}")) [data-testid="delete-button"]`;
  private readonly permissionsButton = (email: string) => `tr:has(td:has-text("${email}")) button:has-text("Permissions"), tr:has(td:has-text("${email}")) [data-testid="permissions-button"], tr:has(td:has-text("${email}")) a[href*="permissions"]`;
  private readonly confirmDeleteButton = 'button:has-text("Confirm"), button:has-text("Delete")';
  private readonly cancelDeleteButton = 'button:has-text("Cancel")';
  private readonly deleteModal = '[role="dialog"]:has-text("Delete"), [data-testid="delete-modal"]';
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No employees found")';

  // Form selectors (inline or modal)
  private readonly formModal = '[role="dialog"], [data-testid="employee-form"]';
  private readonly emailInput = 'input[name="email"], input#email';
  private readonly passwordInput = 'input[name="password"], input#password';
  private readonly submitButton = 'button[type="submit"]:has-text("Create"), button:has-text("Save"), button:has-text("Invite")';
  private readonly cancelFormButton = 'button:has-text("Cancel")';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to employees page
   */
  async goto(): Promise<void> {
    await super.goto('/company/employees');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForEmployeesPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on employees page
   */
  async expectToBeOnEmployeesPage(): Promise<void> {
    await this.expectURLContains('/company/employees');
    await this.expectVisible(this.heading);
  }

  /**
   * Click create employee button
   */
  async clickCreateEmployee(): Promise<void> {
    await this.click(this.createEmployeeButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for employee
   */
  async searchEmployee(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.page.waitForTimeout(500);
    await this.waitForPageLoad();
  }

  /**
   * Get employee row count
   */
  async getEmployeeCount(): Promise<number> {
    const rows = await this.page.locator(this.employeeRow).all();
    return rows.length;
  }

  /**
   * Check if employee exists in list
   */
  async hasEmployee(email: string): Promise<boolean> {
    return await this.isVisible(this.employeeEmail(email));
  }

  /**
   * Expect employee is in list
   */
  async expectEmployeeInList(email: string): Promise<void> {
    await this.expectVisible(this.employeeEmail(email));
  }

  /**
   * Expect employee is not in list
   */
  async expectEmployeeNotInList(email: string): Promise<void> {
    await this.expectHidden(this.employeeEmail(email));
  }

  /**
   * Click edit button for employee
   */
  async clickEditEmployee(email: string): Promise<void> {
    await this.click(this.editButton(email));
    await this.page.waitForTimeout(500);
  }

  /**
   * Click delete button for employee
   */
  async clickDeleteEmployee(email: string): Promise<void> {
    await this.click(this.deleteButton(email));
    await this.waitForVisible(this.deleteModal);
  }

  /**
   * Click permissions button for employee
   */
  async clickManagePermissions(email: string): Promise<void> {
    await this.click(this.permissionsButton(email));
    await this.waitForPageLoad();
  }

  /**
   * Confirm delete action
   */
  async confirmDelete(): Promise<void> {
    await this.click(this.confirmDeleteButton);
    await this.waitForHidden(this.deleteModal);
  }

  /**
   * Cancel delete action
   */
  async cancelDelete(): Promise<void> {
    await this.click(this.cancelDeleteButton);
    await this.waitForHidden(this.deleteModal);
  }

  /**
   * Delete employee (full flow)
   */
  async deleteEmployee(email: string): Promise<void> {
    await this.clickDeleteEmployee(email);
    await this.confirmDelete();
    await this.toast.expectSuccessToast();
  }

  /**
   * Create new employee (full flow)
   */
  async createEmployee(email: string, password: string): Promise<void> {
    await this.clickCreateEmployee();
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
    await this.toast.expectSuccessToast();
  }

  /**
   * Check if empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }

  /**
   * Check if table has rows
   */
  async expectTableHasRows(): Promise<void> {
    const count = await this.getEmployeeCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Get all employee emails from current page
   */
  async getAllEmployeeEmails(): Promise<string[]> {
    const rows = await this.page.locator(this.employeeRow).all();
    const emails: string[] = [];

    for (const row of rows) {
      const emailCell = row.locator('td').first();
      const email = await emailCell.textContent();
      if (email) emails.push(email.trim());
    }

    return emails;
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.fill(this.searchInput, '');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to employee permissions page
   */
  async goToEmployeePermissions(email: string): Promise<void> {
    await this.clickManagePermissions(email);
  }
}
