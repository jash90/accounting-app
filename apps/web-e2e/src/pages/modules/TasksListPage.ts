import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * TasksListPage - Page Object for Tasks List view
 */
export class TasksListPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'h1:has-text("Zadania")';
  private readonly createButton = 'button:has-text("Nowe zadanie")';
  private readonly searchInput = 'input[placeholder="Szukaj zadań..."]';
  private readonly exportButton = 'button:has-text("Eksportuj CSV")';
  private readonly tableRow = 'tbody tr';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';
  private readonly alertDialog = '[role="alertdialog"]';

  // Form selectors
  private readonly formTitle = 'input[placeholder="Wpisz tytuł zadania"]';
  private readonly formDescription = 'textarea[placeholder="Opisz zadanie..."]';
  private readonly formBlockingReason =
    'textarea[placeholder="Opisz powód zablokowania zadania..."]';
  private readonly formCancellationReason =
    'textarea[placeholder="Opisz powód anulowania zadania..."]';
  private readonly submitCreate = 'button:has-text("Utwórz zadanie")';
  private readonly submitEdit = 'button:has-text("Zapisz zmiany")';
  private readonly cancelButton = 'button:has-text("Anuluj")';

  // Table actions
  private readonly menuEdit = '[role="menuitem"]:has-text("Edytuj")';
  private readonly menuDelete = '[role="menuitem"]:has-text("Usuń")';
  private readonly deleteConfirm = '[role="alertdialog"] button:has-text("Usuń")';

  // Bulk operations (shadcn Checkbox renders as button[role="checkbox"])
  private readonly selectAllCheckbox = 'thead button[role="checkbox"]';
  private readonly bulkBarText = 'text=Zaznaczono';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/list`);
    await this.waitForPageLoad();
  }

  async expectToBeOnPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  // --- Create ---

  async clickCreateTask(): Promise<void> {
    await this.click(this.createButton);
    await this.waitForVisible(this.dialog);
  }

  async fillTaskForm(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
  }): Promise<void> {
    const dialog = this.page.locator(this.dialog);

    await dialog.locator(this.formTitle).fill(data.title);

    if (data.description) {
      await dialog.locator(this.formDescription).fill(data.description);
    }

    if (data.status) {
      await this.selectComboboxInDialog('Status', data.status);
    }

    if (data.priority) {
      await this.selectComboboxInDialog('Priorytet', data.priority);
    }
  }

  async submitCreateForm(): Promise<void> {
    await this.page.locator(this.dialog).locator(this.submitCreate).click();
    await this.page
      .waitForSelector(this.dialog, { state: 'hidden', timeout: 15000 })
      .catch(() => {});
    // Wait for React Query refetch after mutation
    await this.page.waitForTimeout(1000);
    await this.waitForPageLoad();
  }

  async submitEditForm(): Promise<void> {
    await this.page.locator(this.dialog).locator(this.submitEdit).click();
    await this.page
      .waitForSelector(this.dialog, { state: 'hidden', timeout: 15000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async cancelForm(): Promise<void> {
    await this.page.locator(this.dialog).locator(this.cancelButton).click();
    await this.page
      .waitForSelector(this.dialog, { state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  // --- Read ---

  async expectTaskInList(title: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${title}")`)).toBeVisible();
  }

  async expectTaskNotInList(title: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${title}")`)).not.toBeVisible();
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(this.tableRow).count();
  }

  // --- Actions menu ---

  async openActionsMenu(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    await row.locator('td:last-child button').click();
    await this.page.waitForSelector('[role="menu"]', { state: 'visible' });
  }

  async clickEditTask(title: string): Promise<void> {
    await this.openActionsMenu(title);
    await this.page.locator(this.menuEdit).click();
    await this.waitForVisible(this.dialog);
  }

  async clickDeleteTask(title: string): Promise<void> {
    await this.openActionsMenu(title);
    await this.page.locator(this.menuDelete).click();
    await this.waitForVisible(this.alertDialog);
  }

  async confirmDelete(): Promise<void> {
    await this.page.locator(this.deleteConfirm).click();
    await this.waitForPageLoad();
  }

  // --- Search & Filters ---

  async searchTasks(query: string): Promise<void> {
    const input = this.page.locator(this.searchInput);
    await input.click();
    await input.fill('');
    await input.pressSequentially(query, { delay: 30 });
    // Wait for debounce (300ms) + API response
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async selectStatusFilter(label: string): Promise<void> {
    // Status filter is the first combobox in the filter bar
    const triggers = this.page.locator('button[role="combobox"]');
    await triggers.first().click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${label}")`).click();
    await this.waitForPageLoad();
  }

  async selectPriorityFilter(label: string): Promise<void> {
    // Priority filter is the second combobox
    const triggers = this.page.locator('button[role="combobox"]');
    await triggers.nth(1).click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${label}")`).click();
    await this.waitForPageLoad();
  }

  async clearFilters(): Promise<void> {
    const clearBtn = this.page.locator('button:has-text("Wyczyść")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.waitForPageLoad();
    }
  }

  // --- Bulk operations ---

  async selectTaskCheckbox(title: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${title}")`);
    await row.locator('button[role="checkbox"]').click();
  }

  async selectAllCheckboxes(): Promise<void> {
    await this.page.locator(this.selectAllCheckbox).click();
  }

  async expectBulkBarVisible(count: number): Promise<void> {
    await expect(this.page.locator(this.bulkBarText).first()).toBeVisible();
    await expect(this.page.getByText(`${count}`).first()).toBeVisible();
  }

  // --- Export ---

  async clickExportCsv(): Promise<void> {
    await this.click(this.exportButton);
  }

  // --- Reason fields ---

  async fillBlockingReason(reason: string): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await dialog.locator(this.formBlockingReason).fill(reason);
  }

  async fillCancellationReason(reason: string): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await dialog.locator(this.formCancellationReason).fill(reason);
  }

  async expectBlockingReasonVisible(): Promise<void> {
    await expect(this.page.locator(this.dialog).locator(this.formBlockingReason)).toBeVisible();
  }

  async expectCancellationReasonVisible(): Promise<void> {
    await expect(this.page.locator(this.dialog).locator(this.formCancellationReason)).toBeVisible();
  }

  async expectNoReasonFields(): Promise<void> {
    await expect(this.page.locator(this.dialog).locator(this.formBlockingReason)).not.toBeVisible();
    await expect(
      this.page.locator(this.dialog).locator(this.formCancellationReason)
    ).not.toBeVisible();
  }

  // --- Helpers ---

  private async selectComboboxInDialog(label: string, value: string): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    // FormItem contains both FormLabel and SelectTrigger
    const formItem = dialog.locator(`div:has(> label:has-text("${label}"))`).first();
    const combobox = formItem.locator('button[role="combobox"]');
    await combobox.click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${value}")`).click();
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }
}
