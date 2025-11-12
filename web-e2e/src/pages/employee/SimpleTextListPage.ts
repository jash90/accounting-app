import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';
import { ToastComponent } from '../components/ToastComponent';

/**
 * SimpleTextListPage - Simple text module list page
 */
export class SimpleTextListPage extends BasePage {
  readonly nav: NavigationComponent;
  readonly toast: ToastComponent;

  // Selectors
  private readonly heading = 'h1:has-text("Simple Text"), h1:has-text("Text Entries")';
  private readonly createButton = 'button:has-text("Create"), button:has-text("Add"), button:has-text("New")';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly textTable = 'table, [data-testid="text-table"]';
  private readonly textRow = 'tr[data-testid*="text-"], tbody tr';
  private readonly textTitle = (title: string) => `td:has-text("${title}")`;
  private readonly editButton = (title: string) => `tr:has(td:has-text("${title}")) button:has-text("Edit"), tr:has(td:has-text("${title}")) [data-testid="edit-button"]`;
  private readonly deleteButton = (title: string) => `tr:has(td:has-text("${title}")) button:has-text("Delete"), tr:has(td:has-text("${title}")) [data-testid="delete-button"]`;
  private readonly viewButton = (title: string) => `tr:has(td:has-text("${title}")) button:has-text("View"), tr:has(td:has-text("${title}")) [data-testid="view-button"]`;
  private readonly confirmDeleteButton = 'button:has-text("Confirm"), button:has-text("Delete")';
  private readonly cancelDeleteButton = 'button:has-text("Cancel")';
  private readonly deleteModal = '[role="dialog"]:has-text("Delete"), [data-testid="delete-modal"]';
  private readonly emptyState = '[data-testid="empty-state"], div:has-text("No text entries"), div:has-text("No texts found")';
  private readonly paginationNext = 'button[aria-label="Next"], button:has-text("Next")';
  private readonly paginationPrev = 'button[aria-label="Previous"], button:has-text("Previous")';
  private readonly sortHeader = (column: string) => `th:has-text("${column}")`;

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to simple text list page
   */
  async goto(): Promise<void> {
    await super.goto('/modules/simple-text');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForSimpleTextPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on simple text page
   */
  async expectToBeOnSimpleTextPage(): Promise<void> {
    await this.expectURLContains('/modules/simple-text');
    await this.expectVisible(this.heading);
  }

  /**
   * Click create button
   */
  async clickCreate(): Promise<void> {
    await this.click(this.createButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if create button is visible
   */
  async isCreateButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.createButton);
  }

  /**
   * Expect create button is visible
   */
  async expectCreateButtonVisible(): Promise<void> {
    await this.expectVisible(this.createButton);
  }

  /**
   * Expect create button is hidden
   */
  async expectCreateButtonHidden(): Promise<void> {
    await this.expectHidden(this.createButton);
  }

  /**
   * Search for text
   */
  async searchText(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.page.waitForTimeout(500);
    await this.waitForPageLoad();
  }

  /**
   * Get text row count
   */
  async getTextCount(): Promise<number> {
    const rows = await this.page.locator(this.textRow).all();
    return rows.length;
  }

  /**
   * Check if text exists in list
   */
  async hasText(title: string): Promise<boolean> {
    return await this.isVisible(this.textTitle(title));
  }

  /**
   * Expect text is in list
   */
  async expectTextInList(title: string): Promise<void> {
    await this.expectVisible(this.textTitle(title));
  }

  /**
   * Expect text is not in list
   */
  async expectTextNotInList(title: string): Promise<void> {
    await this.expectHidden(this.textTitle(title));
  }

  /**
   * Click edit button for text
   */
  async clickEdit(title: string): Promise<void> {
    await this.click(this.editButton(title));
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if edit button is visible for text
   */
  async isEditButtonVisible(title: string): Promise<boolean> {
    return await this.isVisible(this.editButton(title));
  }

  /**
   * Click delete button for text
   */
  async clickDelete(title: string): Promise<void> {
    await this.click(this.deleteButton(title));
    await this.waitForVisible(this.deleteModal);
  }

  /**
   * Check if delete button is visible for text
   */
  async isDeleteButtonVisible(title: string): Promise<boolean> {
    return await this.isVisible(this.deleteButton(title));
  }

  /**
   * Expect delete button is visible
   */
  async expectDeleteButtonVisible(title: string): Promise<void> {
    await this.expectVisible(this.deleteButton(title));
  }

  /**
   * Expect delete button is hidden
   */
  async expectDeleteButtonHidden(title: string): Promise<void> {
    await this.expectHidden(this.deleteButton(title));
  }

  /**
   * Click view button for text
   */
  async clickView(title: string): Promise<void> {
    if (await this.isVisible(this.viewButton(title))) {
      await this.click(this.viewButton(title));
      await this.page.waitForTimeout(500);
    }
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
   * Delete text (full flow)
   */
  async deleteText(title: string): Promise<void> {
    await this.clickDelete(title);
    await this.confirmDelete();
    await this.toast.expectSuccessToast();
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
    const count = await this.getTextCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Get all text titles from current page
   */
  async getAllTextTitles(): Promise<string[]> {
    const rows = await this.page.locator(this.textRow).all();
    const titles: string[] = [];

    for (const row of rows) {
      const titleCell = row.locator('td').first();
      const title = await titleCell.textContent();
      if (title) titles.push(title.trim());
    }

    return titles;
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.fill(this.searchInput, '');
    await this.waitForPageLoad();
  }

  /**
   * Expect specific text count
   */
  async expectTextCount(count: number): Promise<void> {
    const actualCount = await this.getTextCount();
    expect(actualCount).toBe(count);
  }

  /**
   * Expect to be denied access (unauthorized)
   */
  async expectAccessDenied(): Promise<void> {
    // Check if redirected to unauthorized or if page shows access denied message
    const currentURL = this.getCurrentURL();

    if (currentURL.includes('unauthorized')) {
      await this.expectURLContains('/unauthorized');
    } else {
      // Check for access denied message on page
      const accessDenied = await this.page.getByText(/access denied|forbidden|no permission/i).isVisible();
      expect(accessDenied).toBe(true);
    }
  }
}
