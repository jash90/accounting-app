import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * UsersListPage - Admin users management page
 */
export class UsersListPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Users")';
  private readonly createUserButton = 'button:has-text("Create User"), button:has-text("Add User"), button:has-text("New User")';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly roleFilter = 'select[name="role"], [data-testid="role-filter"]';
  private readonly userTable = 'table, [data-testid="users-table"]';
  private readonly userRow = 'tr[data-testid*="user-"], tbody tr';
  private readonly userEmail = (email: string) => `td:has-text("${email}")`;
  private readonly editButton = (email: string) => `tr:has(td:has-text("${email}")) button:has-text("Edit"), tr:has(td:has-text("${email}")) [data-testid="edit-button"]`;
  private readonly deleteButton = (email: string) => `tr:has(td:has-text("${email}")) button:has-text("Delete"), tr:has(td:has-text("${email}")) [data-testid="delete-button"]`;
  private readonly confirmDeleteButton = 'button:has-text("Confirm"), button:has-text("Delete")';
  private readonly cancelDeleteButton = 'button:has-text("Cancel")';
  private readonly deleteModal = '[role="dialog"]:has-text("Delete"), [data-testid="delete-modal"]';
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No users found")';
  private readonly paginationNext = 'button[aria-label="Next"], button:has-text("Next")';
  private readonly paginationPrev = 'button[aria-label="Previous"], button:has-text("Previous")';
  private readonly sortHeader = (column: string) => `th:has-text("${column}")`;

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to users page
   */
  async goto(): Promise<void> {
    await super.goto('/admin/users');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForUsersPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on users page
   */
  async expectToBeOnUsersPage(): Promise<void> {
    await this.expectURLContains('/admin/users');
    await this.expectVisible(this.heading);
  }

  /**
   * Click create user button
   */
  async clickCreateUser(): Promise<void> {
    await this.click(this.createUserButton);
    await this.page.waitForTimeout(500); // Wait for modal/form
  }

  /**
   * Search for user
   */
  async searchUser(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.page.waitForTimeout(500); // Debounce
    await this.waitForPageLoad();
  }

  /**
   * Filter by role
   */
  async filterByRole(role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE' | 'ALL'): Promise<void> {
    await this.selectOption(this.roleFilter, role);
    await this.waitForPageLoad();
  }

  /**
   * Get user row count
   */
  async getUserCount(): Promise<number> {
    const rows = await this.page.locator(this.userRow).all();
    return rows.length;
  }

  /**
   * Check if user exists in list
   */
  async hasUser(email: string): Promise<boolean> {
    return await this.isVisible(this.userEmail(email));
  }

  /**
   * Expect user is in list
   */
  async expectUserInList(email: string): Promise<void> {
    await this.expectVisible(this.userEmail(email));
  }

  /**
   * Expect user is not in list
   */
  async expectUserNotInList(email: string): Promise<void> {
    await this.expectHidden(this.userEmail(email));
  }

  /**
   * Click edit button for user
   */
  async clickEditUser(email: string): Promise<void> {
    await this.click(this.editButton(email));
    await this.page.waitForTimeout(500); // Wait for modal/form
  }

  /**
   * Click delete button for user
   */
  async clickDeleteUser(email: string): Promise<void> {
    await this.click(this.deleteButton(email));
    await this.waitForVisible(this.deleteModal);
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
   * Delete user (full flow)
   */
  async deleteUser(email: string): Promise<void> {
    await this.clickDeleteUser(email);
    await this.confirmDelete();
    await this.toast.expectSuccessToast();
  }

  /**
   * Get user role from row
   */
  async getUserRole(email: string): Promise<string> {
    const row = this.page.locator(`tr:has(td:has-text("${email}"))`);
    const roleCell = row.locator('td').nth(2); // Assuming role is 3rd column
    return await roleCell.textContent() || '';
  }

  /**
   * Sort by column
   */
  async sortBy(column: string): Promise<void> {
    await this.click(this.sortHeader(column));
    await this.waitForPageLoad();
  }

  /**
   * Go to next page
   */
  async goToNextPage(): Promise<void> {
    await this.click(this.paginationNext);
    await this.waitForPageLoad();
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.click(this.paginationPrev);
    await this.waitForPageLoad();
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
    const count = await this.getUserCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Get all user emails from current page
   */
  async getAllUserEmails(): Promise<string[]> {
    const rows = await this.page.locator(this.userRow).all();
    const emails: string[] = [];

    for (const row of rows) {
      const emailCell = row.locator('td').first();
      const email = await emailCell.textContent();
      if (email) emails.push(email.trim());
    }

    return emails;
  }

  /**
   * Expect specific user count
   */
  async expectUserCount(count: number): Promise<void> {
    const actualCount = await this.getUserCount();
    expect(actualCount).toBe(count);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.fill(this.searchInput, '');
    await this.waitForPageLoad();
  }

  /**
   * Check if create button is visible
   */
  async expectCreateButtonVisible(): Promise<void> {
    await this.expectVisible(this.createUserButton);
  }
}
