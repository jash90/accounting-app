import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * ClientsPage - Page Object Model for Clients module
 * Handles client CRUD, PKD code selection, and AML group management
 */
export class ClientsPage extends BasePage {
  // Selectors
  readonly clientsTable: Locator;
  readonly addClientButton: Locator;
  readonly clientFormDialog: Locator;
  readonly saveClientButton: Locator;
  readonly cancelClientButton: Locator;
  readonly deleteClientButton: Locator;
  readonly searchInput: Locator;
  readonly pkdCodeSelect: Locator;
  readonly amlGroupSelect: Locator;
  readonly nameInput: Locator;
  readonly nipInput: Locator;
  readonly emailInput: Locator;
  readonly filterButton: Locator;

  constructor(page: Page) {
    super(page);
    this.clientsTable = page.getByTestId('clients-table');
    this.addClientButton = page.getByRole('button', {
      name: /dodaj klienta|add client|nowy klient/i,
    });
    this.clientFormDialog = page.getByRole('dialog');
    this.saveClientButton = page.getByRole('button', { name: /zapisz|save/i });
    this.cancelClientButton = page.getByRole('button', { name: /anuluj|cancel/i });
    this.deleteClientButton = page.getByRole('button', { name: /usuń|delete/i });
    this.searchInput = page.getByPlaceholder(/szukaj|search/i);
    this.pkdCodeSelect = page.locator('[data-testid="pkd-code-select"], [name="pkdCode"]');
    this.amlGroupSelect = page.locator('[data-testid="aml-group-select"], [name="amlGroup"]');
    this.nameInput = page.getByLabel(/nazwa|name/i).first();
    this.nipInput = page.getByLabel(/nip/i);
    this.emailInput = page.getByLabel(/email/i);
    this.filterButton = page.getByRole('button', { name: /filtry|filters/i });
  }

  /**
   * Navigate to clients page
   */
  async goto(): Promise<void> {
    await super.goto('/modules/clients');
  }

  /**
   * Check we're on the clients page
   */
  async expectToBeOnClientsPage(): Promise<void> {
    await this.expectURLContains('clients');
  }

  /**
   * Open add client form
   */
  async openAddClientForm(): Promise<void> {
    await this.addClientButton.click();
    await expect(this.clientFormDialog).toBeVisible();
  }

  /**
   * Fill client form with basic data
   */
  async fillClientForm(data: {
    name: string;
    nip?: string;
    email?: string;
    pkdCode?: string;
    amlGroup?: string;
  }): Promise<void> {
    await this.clientFormDialog
      .getByLabel(/nazwa|name/i)
      .first()
      .fill(data.name);

    if (data.nip) {
      await this.clientFormDialog.getByLabel(/nip/i).fill(data.nip);
    }

    if (data.email) {
      await this.clientFormDialog.getByLabel(/email/i).fill(data.email);
    }

    if (data.pkdCode) {
      await this.selectPkdCode(data.pkdCode);
    }

    if (data.amlGroup) {
      await this.selectAmlGroup(data.amlGroup);
    }
  }

  /**
   * Select PKD code from dropdown/combobox
   */
  async selectPkdCode(pkdCode: string): Promise<void> {
    // Try to find the PKD code combobox/select in the dialog
    const pkdInput = this.clientFormDialog.locator(
      '[data-testid="pkd-code-select"], input[name="pkdCode"], [aria-label*="PKD"]'
    );

    if (await pkdInput.isVisible()) {
      await pkdInput.click();
      await this.page.waitForTimeout(300);

      // Type to search for the code
      await pkdInput.fill(pkdCode);
      await this.page.waitForTimeout(500);

      // Select from dropdown
      const option = this.page.getByRole('option', { name: new RegExp(pkdCode) });
      if (await option.isVisible()) {
        await option.click();
      } else {
        // Try clicking on listbox item
        const listItem = this.page.locator(`[role="listbox"] >> text=${pkdCode}`);
        if (await listItem.isVisible()) {
          await listItem.click();
        } else {
          throw new Error(
            `PKD code "${pkdCode}" not found in dropdown. Neither option nor listbox item is visible.`
          );
        }
      }
    }
  }

  /**
   * Select AML group from dropdown
   */
  async selectAmlGroup(amlGroup: string): Promise<void> {
    const amlInput = this.clientFormDialog.locator(
      '[data-testid="aml-group-select"], select[name="amlGroup"], [aria-label*="AML"]'
    );

    if (await amlInput.isVisible()) {
      // If it's a select element
      const tagName = await amlInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await amlInput.selectOption({ label: amlGroup });
      } else {
        // It's a combobox-style input
        await amlInput.click();
        await this.page.waitForTimeout(300);

        const option = this.page.getByRole('option', { name: new RegExp(amlGroup, 'i') });
        if (await option.isVisible()) {
          await option.click();
        }
      }
    }
  }

  /**
   * Save client
   */
  async saveClient(): Promise<void> {
    await this.saveClientButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cancel client form
   */
  async cancelClient(): Promise<void> {
    await this.cancelClientButton.click();
  }

  /**
   * Create a complete client
   */
  async createClient(data: {
    name: string;
    nip?: string;
    email?: string;
    pkdCode?: string;
    amlGroup?: string;
  }): Promise<void> {
    await this.openAddClientForm();
    await this.fillClientForm(data);
    await this.saveClient();
  }

  /**
   * Get client row by name
   */
  getClientRow(name: string): Locator {
    return this.page.locator('tr', { hasText: name });
  }

  /**
   * Expect client to be in list
   */
  async expectClientInList(name: string): Promise<void> {
    await expect(this.getClientRow(name)).toBeVisible();
  }

  /**
   * Expect client not in list
   */
  async expectClientNotInList(name: string): Promise<void> {
    await expect(this.getClientRow(name)).not.toBeVisible();
  }

  /**
   * Search for client
   */
  async searchClient(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Edit a client
   */
  async editClient(name: string): Promise<void> {
    const row = this.getClientRow(name);
    await row.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Delete a client
   */
  async deleteClient(name: string): Promise<void> {
    const row = this.getClientRow(name);
    await row.getByRole('button', { name: /usuń|delete/i }).click();

    // Confirm deletion - use waitFor to avoid race condition
    const confirmButton = this.page.getByRole('button', { name: /potwierdź|confirm|tak|yes/i });
    try {
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click();
    } catch {
      // Confirmation dialog did not appear - deletion may proceed without confirmation
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open client detail page
   */
  async openClientDetail(name: string): Promise<void> {
    const row = this.getClientRow(name);
    await row.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get PKD code from client detail
   */
  async getClientPkdCode(): Promise<string> {
    const pkdElement = this.page.getByTestId('client-pkd-code');
    return (await pkdElement.textContent()) || '';
  }

  /**
   * Get AML group from client detail
   */
  async getClientAmlGroup(): Promise<string> {
    const amlElement = this.page.getByTestId('client-aml-group');
    return (await amlElement.textContent()) || '';
  }

  /**
   * Update PKD code on existing client
   */
  async updateClientPkdCode(clientName: string, newPkdCode: string): Promise<void> {
    await this.editClient(clientName);
    await this.page.waitForTimeout(500);

    // Clear and select new PKD code
    await this.selectPkdCode(newPkdCode);
    await this.saveClient();
  }

  /**
   * Update AML group on existing client
   */
  async updateClientAmlGroup(clientName: string, newAmlGroup: string): Promise<void> {
    await this.editClient(clientName);
    await this.page.waitForTimeout(500);

    await this.selectAmlGroup(newAmlGroup);
    await this.saveClient();
  }

  /**
   * Get count of clients in list
   */
  async getClientsCount(): Promise<number> {
    const rows = this.page.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Open filters panel
   */
  async openFilters(): Promise<void> {
    await this.filterButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter by AML group
   */
  async filterByAmlGroup(amlGroup: string): Promise<void> {
    await this.openFilters();
    const filterSelect = this.page.getByLabel(/grupa aml|aml group/i);
    await filterSelect.selectOption({ label: amlGroup });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: /wyczyść|clear/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Verify PKD code validation message
   */
  async expectPkdValidationError(): Promise<void> {
    const errorMessage = this.page.getByText(/nieprawidłowy.*pkd|invalid.*pkd/i);
    await expect(errorMessage).toBeVisible();
  }

  /**
   * Wait for clients to load
   */
  async waitForClientsLoad(): Promise<void> {
    await this.page.waitForResponse(/\/api\/clients/);
  }
}
