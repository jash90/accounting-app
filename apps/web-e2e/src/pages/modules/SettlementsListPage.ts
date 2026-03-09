import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * SettlementsListPage - Page Object for Settlements List view
 */
export class SettlementsListPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'h1:has-text("Rozliczenia")';
  private readonly searchInput = 'input[placeholder="Nazwa klienta, NIP..."]';
  private readonly exportButton = 'button:has-text("Eksportuj CSV")';
  private readonly initMonthButton = 'button:has-text("Zainicjalizuj miesiąc")';
  private readonly tableRow = 'tbody tr';
  private readonly clearFiltersButton = 'button:has-text("Wyczyść filtry")';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';
  private readonly alertDialog = '[role="alertdialog"]';

  // Edit dialog selectors
  private readonly editDialogTitle = 'text=Edytuj rozliczenie';
  private readonly editSubmitButton = 'button:has-text("Zapisz")';
  private readonly editCancelButton = '[role="dialog"] button:has-text("Anuluj")';

  // Email dialog selectors
  private readonly sendEmailBtn =
    '[role="alertdialog"] button:has-text("Wyślij email i zmień status")';
  private readonly changeStatusOnlyBtn =
    '[role="alertdialog"] button:has-text("Tylko zmień status")';
  private readonly cancelStatusChangeBtn = '[role="alertdialog"] button:has-text("Anuluj zmianę")';

  // Actions menu
  private readonly menuEdit = '[role="menuitem"]:has-text("Edytuj")';
  private readonly menuComments = '[role="menuitem"]:has-text("Komentarze")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  override async goto(basePath: string = '/company/modules/settlements'): Promise<void> {
    await super.goto(`${basePath}/list`);
    await this.waitForPageLoad();
  }

  async expectToBeOnListPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  // --- Table ---

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(this.tableRow).count();
  }

  // --- Buttons ---

  async clickExportCsv(): Promise<void> {
    await this.click(this.exportButton);
  }

  async clickInitializeMonth(): Promise<void> {
    await this.click(this.initMonthButton);
  }

  // --- Search & Filters ---

  async searchByText(text: string): Promise<void> {
    const input = this.page.locator(this.searchInput);
    await input.click();
    await input.fill('');
    await input.pressSequentially(text, { delay: 30 });
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async selectStatusFilter(label: string): Promise<void> {
    // Status filter — find the combobox next to "Status" label
    const statusSection = this.page.locator('div:has(> label:has-text("Status"))').first();
    const trigger = statusSection.locator('button[role="combobox"]');
    await trigger.click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${label}")`).click();
    await this.waitForPageLoad();
  }

  async toggleRequiresAttention(): Promise<void> {
    const switchEl = this.page.locator('button[role="switch"]').first();
    await switchEl.click();
    await this.waitForPageLoad();
  }

  async clearFilters(): Promise<void> {
    const clearBtn = this.page.locator(this.clearFiltersButton);
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.waitForPageLoad();
    }
  }

  async expectClearFiltersVisible(): Promise<void> {
    await expect(this.page.locator(this.clearFiltersButton)).toBeVisible();
  }

  // --- Actions menu ---

  async openActionsMenu(rowIndex: number): Promise<void> {
    const row = this.page.locator(this.tableRow).nth(rowIndex);
    await row.locator('td:last-child button').click();
    await this.page.waitForSelector('[role="menu"]', { state: 'visible' });
  }

  async openEditDialogFromActions(rowIndex: number): Promise<void> {
    await this.openActionsMenu(rowIndex);
    await this.page.locator(this.menuEdit).click();
    await this.waitForVisible(this.dialog);
  }

  async navigateToCommentsFromActions(rowIndex: number): Promise<void> {
    await this.openActionsMenu(rowIndex);
    await this.page.locator(this.menuComments).click();
    await this.waitForPageLoad();
  }

  // --- Edit Dialog ---

  async expectEditDialogOpen(): Promise<void> {
    await this.expectVisible(this.dialog);
    await expect(this.page.locator(this.editDialogTitle)).toBeVisible();
  }

  async fillEditForm(data: {
    invoiceCount?: string;
    priority?: string;
    notes?: string;
    documentsDate?: string;
    deadline?: string;
  }): Promise<void> {
    const dialog = this.page.locator(this.dialog);

    if (data.invoiceCount !== undefined) {
      const invoiceInput = dialog.locator('div:has(> label:has-text("Liczba faktur")) input');
      await invoiceInput.clear();
      await invoiceInput.fill(data.invoiceCount);
    }

    if (data.priority !== undefined) {
      const priorityInput = dialog.locator('div:has(> label:has-text("Priorytet")) input');
      await priorityInput.clear();
      await priorityInput.fill(data.priority);
    }

    if (data.notes !== undefined) {
      const notesArea = dialog.locator('textarea[placeholder="Dodaj notatki..."]');
      await notesArea.fill(data.notes);
    }

    if (data.documentsDate !== undefined) {
      const docDateInput = dialog.locator(
        'div:has(> label:has-text("Data dostarczenia dokumentów")) input'
      );
      await docDateInput.fill(data.documentsDate);
    }

    if (data.deadline !== undefined) {
      const deadlineInput = dialog.locator('div:has(> label:has-text("Termin realizacji")) input');
      await deadlineInput.fill(data.deadline);
    }
  }

  async toggleDocumentsComplete(): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    const docCompleteRow = dialog.locator('div:has(> label:has-text("Dokumenty kompletne"))');
    await docCompleteRow.locator('button[role="checkbox"]').click();
  }

  async toggleRequiresAttentionInDialog(): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    const attentionRow = dialog.locator('div:has(> label:has-text("Wymaga uwagi"))');
    await attentionRow.locator('button[role="checkbox"]').click();
  }

  async expectAttentionReasonVisible(): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await expect(dialog.locator('input[placeholder="Opisz powód..."]')).toBeVisible();
  }

  async expectAttentionReasonHidden(): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await expect(dialog.locator('input[placeholder="Opisz powód..."]')).not.toBeVisible();
  }

  async fillAttentionReason(reason: string): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await dialog.locator('input[placeholder="Opisz powód..."]').fill(reason);
  }

  async submitEditForm(): Promise<void> {
    await this.page.locator(this.dialog).locator(this.editSubmitButton).click();
    await this.page
      .waitForSelector(this.dialog, { state: 'hidden', timeout: 15000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async cancelEditForm(): Promise<void> {
    await this.page.locator(this.editCancelButton).click();
    await this.page
      .waitForSelector(this.dialog, { state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  // --- Status Dropdown ---

  async triggerStatusChange(rowIndex: number, statusLabel: string): Promise<void> {
    const row = this.page.locator(this.tableRow).nth(rowIndex);
    // Status dropdown is the button with chevron in the status cell
    const statusButton = row.locator('button[class*="min-w"]').first();
    await statusButton.click();
    await this.page.waitForSelector('[role="menu"]', { state: 'visible' });
    await this.page.locator(`[role="menuitem"]:has-text("${statusLabel}")`).first().click();
  }

  async expectStatusDropdownInRow(rowIndex: number): Promise<void> {
    const row = this.page.locator(this.tableRow).nth(rowIndex);
    await expect(row.locator('button[class*="min-w"]').first()).toBeVisible();
  }

  // --- Email Dialog ---

  async expectEmailDialog(): Promise<void> {
    await this.expectVisible(this.alertDialog);
  }

  async clickSendEmailAndChangeStatus(): Promise<void> {
    await this.click(this.sendEmailBtn);
    await this.waitForPageLoad();
  }

  async clickChangeStatusOnly(): Promise<void> {
    await this.click(this.changeStatusOnlyBtn);
    await this.waitForPageLoad();
  }

  async clickCancelStatusChange(): Promise<void> {
    await this.click(this.cancelStatusChangeBtn);
    await this.page.waitForSelector(this.alertDialog, { state: 'hidden' }).catch(() => {});
  }

  // --- Edit form field checks ---

  async expectEditFormFields(): Promise<void> {
    const dialog = this.page.locator(this.dialog);
    await expect(dialog.getByText('Liczba faktur')).toBeVisible();
    await expect(dialog.getByText('Priorytet')).toBeVisible();
    await expect(dialog.getByText('Notatki')).toBeVisible();
    await expect(dialog.getByText('Dokumenty kompletne')).toBeVisible();
    await expect(dialog.getByText('Wymaga uwagi')).toBeVisible();
  }
}
