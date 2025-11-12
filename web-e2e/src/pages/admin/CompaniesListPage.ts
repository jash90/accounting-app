import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * CompaniesListPage - Admin companies management page
 */
export class CompaniesListPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Companies")';
  private readonly createCompanyButton = 'button:has-text("Create Company"), button:has-text("Add Company"), button:has-text("New Company")';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly companyTable = 'table, [data-testid="companies-table"]';
  private readonly companyRow = 'tr[data-testid*="company-"], tbody tr';
  private readonly companyName = (name: string) => `td:has-text("${name}")`;
  private readonly editButton = (name: string) => `tr:has(td:has-text("${name}")) button:has-text("Edit"), tr:has(td:has-text("${name}")) [data-testid="edit-button"]`;
  private readonly deleteButton = (name: string) => `tr:has(td:has-text("${name}")) button:has-text("Delete"), tr:has(td:has-text("${name}")) [data-testid="delete-button"]`;
  private readonly modulesButton = (name: string) => `tr:has(td:has-text("${name}")) button:has-text("Modules"), tr:has(td:has-text("${name}")) [data-testid="modules-button"]`;
  private readonly confirmDeleteButton = 'button:has-text("Confirm"), button:has-text("Delete")';
  private readonly cancelDeleteButton = 'button:has-text("Cancel")';
  private readonly deleteModal = '[role="dialog"]:has-text("Delete"), [data-testid="delete-modal"]';
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No companies found")';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to companies page
   */
  async goto(): Promise<void> {
    await super.goto('/admin/companies');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForCompaniesPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on companies page
   */
  async expectToBeOnCompaniesPage(): Promise<void> {
    await this.expectURLContains('/admin/companies');
    await this.expectVisible(this.heading);
  }

  /**
   * Click create company button
   */
  async clickCreateCompany(): Promise<void> {
    await this.click(this.createCompanyButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for company
   */
  async searchCompany(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.page.waitForTimeout(500);
    await this.waitForPageLoad();
  }

  /**
   * Get company row count
   */
  async getCompanyCount(): Promise<number> {
    const rows = await this.page.locator(this.companyRow).all();
    return rows.length;
  }

  /**
   * Check if company exists in list
   */
  async hasCompany(name: string): Promise<boolean> {
    return await this.isVisible(this.companyName(name));
  }

  /**
   * Expect company is in list
   */
  async expectCompanyInList(name: string): Promise<void> {
    await this.expectVisible(this.companyName(name));
  }

  /**
   * Expect company is not in list
   */
  async expectCompanyNotInList(name: string): Promise<void> {
    await this.expectHidden(this.companyName(name));
  }

  /**
   * Click edit button for company
   */
  async clickEditCompany(name: string): Promise<void> {
    await this.click(this.editButton(name));
    await this.page.waitForTimeout(500);
  }

  /**
   * Click delete button for company
   */
  async clickDeleteCompany(name: string): Promise<void> {
    await this.click(this.deleteButton(name));
    await this.waitForVisible(this.deleteModal);
  }

  /**
   * Click modules button for company
   */
  async clickManageModules(name: string): Promise<void> {
    await this.click(this.modulesButton(name));
    await this.page.waitForTimeout(500);
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
   * Delete company (full flow)
   */
  async deleteCompany(name: string): Promise<void> {
    await this.clickDeleteCompany(name);
    await this.confirmDelete();
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
    const count = await this.getCompanyCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Get all company names from current page
   */
  async getAllCompanyNames(): Promise<string[]> {
    const rows = await this.page.locator(this.companyRow).all();
    const names: string[] = [];

    for (const row of rows) {
      const nameCell = row.locator('td').first();
      const name = await nameCell.textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.fill(this.searchInput, '');
    await this.waitForPageLoad();
  }
}
