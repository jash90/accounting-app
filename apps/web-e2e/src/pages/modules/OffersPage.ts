import { expect, Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * OffersPage - Page Object for Offers module
 * Handles offers dashboard, leads list, templates list, and offers list
 */
export class OffersPage extends BasePage {
  readonly toast: ToastComponent;

  // Dashboard selectors
  private readonly dashboardTitle = 'h1:has-text("Moduł Oferty")';
  private readonly offersStatsCard = 'text=Wszystkie oferty';
  private readonly leadsStatsCard = 'text=Wszystkie leady';
  private readonly offersListCard = 'text=Lista ofert';
  private readonly leadsCard = 'text=Leady';
  private readonly templatesCard = 'text=Szablony';

  // Common selectors
  private readonly pageTitle = 'h1';
  private readonly addButton =
    'button:has-text("Dodaj"), button:has-text("Nowy"), button:has-text("Nowa")';
  private readonly refreshButton = 'button:has([class*="lucide-refresh"])';
  private readonly backButton = 'button:has([class*="lucide-arrow-left"])';
  private readonly table = 'table';
  private readonly tableRow = 'tbody tr';
  private readonly tableCell = 'td';
  private readonly emptyState = 'text=Brak';
  private readonly searchInput = 'input[placeholder*="Szukaj"]';
  private readonly statusFilter =
    '[data-testid="status-filter"], button:has-text("Wszystkie statusy")';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';
  private readonly dialogTitle = '[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]';
  private readonly dialogContent = '[role="dialog"] [class*="DialogContent"]';
  private readonly dialogCloseButton = '[role="dialog"] button:has-text("Anuluj")';
  private readonly dialogSubmitButton = '[role="dialog"] button[type="submit"]';
  private readonly alertDialog = '[role="alertdialog"]';
  private readonly alertDialogConfirm =
    '[role="alertdialog"] button:has-text("Usuń"), [role="alertdialog"] button:has-text("Przekonwertuj")';
  private readonly alertDialogCancel = '[role="alertdialog"] button:has-text("Anuluj")';

  // Form fields
  private readonly nameInput =
    'input[name="name"], input[placeholder*="nazwa" i], input[placeholder*="Nazwa"]';
  private readonly emailInput = 'input[name="email"], input[type="email"]';
  private readonly phoneInput = 'input[name="phone"], input[placeholder*="telefon" i]';
  private readonly nipInput = 'input[name="nip"]';
  private readonly titleInput = 'input[name="title"]';
  private readonly descriptionTextarea = 'textarea[name="description"], textarea[name="notes"]';

  // Dropdown menu
  private readonly dropdownTrigger = 'td:last-child button';
  private readonly dropdownMenu = '[role="menu"]';
  private readonly dropdownMenuItem = '[role="menuitem"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  // Navigation methods
  async gotoDashboard(basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async gotoLeadsList(basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(`${basePath}/leads`);
    await this.waitForPageLoad();
  }

  async gotoTemplatesList(basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(`${basePath}/templates`);
    await this.waitForPageLoad();
  }

  async gotoOffersList(basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(`${basePath}/list`);
    await this.waitForPageLoad();
  }

  async gotoOfferDetail(
    offerId: string,
    basePath: string = '/company/modules/offers'
  ): Promise<void> {
    await super.goto(`${basePath}/${offerId}`);
    await this.waitForPageLoad();
  }

  async gotoLeadDetail(
    leadId: string,
    basePath: string = '/company/modules/offers'
  ): Promise<void> {
    await super.goto(`${basePath}/leads/${leadId}`);
    await this.waitForPageLoad();
  }

  // Dashboard methods
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectVisible(this.dashboardTitle);
  }

  async expectDashboardStats(): Promise<void> {
    await this.expectVisible(this.offersStatsCard);
    await this.expectVisible(this.leadsStatsCard);
  }

  async navigateToOffersList(): Promise<void> {
    await this.click(`a:has-text("Lista ofert"), a[href*="/list"]`);
    await this.waitForPageLoad();
  }

  async navigateToLeadsList(): Promise<void> {
    await this.click(`a:has-text("Leady"), a[href*="/leads"]`);
    await this.waitForPageLoad();
  }

  async navigateToTemplatesList(): Promise<void> {
    await this.click(`a:has-text("Szablony"), a[href*="/templates"]`);
    await this.waitForPageLoad();
  }

  // Leads list methods
  async expectToBeOnLeadsPage(): Promise<void> {
    await expect(this.page.locator(this.pageTitle)).toContainText('Leady');
  }

  async clickAddLead(): Promise<void> {
    await this.click('button:has-text("Dodaj leada")');
    await this.waitForVisible(this.dialog);
  }

  async fillLeadForm(data: {
    name: string;
    email?: string;
    phone?: string;
    nip?: string;
    notes?: string;
  }): Promise<void> {
    // Wait for dialog to be ready
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Fill form fields within dialog
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.locator('input[name="name"]').fill(data.name);
    if (data.email) {
      await dialog.locator('input[name="email"]').fill(data.email);
    }
    if (data.phone) {
      await dialog.locator('input[name="phone"]').fill(data.phone);
    }
    if (data.nip) {
      await dialog.locator('input[name="nip"]').fill(data.nip);
    }
    if (data.notes) {
      await dialog.locator('textarea[name="notes"]').fill(data.notes);
    }
  }

  async submitLeadForm(): Promise<void> {
    // Click the submit button inside the dialog, not on the page
    const dialogSubmit = this.page.locator('[role="dialog"] button[type="submit"]');
    await dialogSubmit.click();
    // Wait for dialog to close
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async createLead(data: {
    name: string;
    email?: string;
    phone?: string;
    nip?: string;
    notes?: string;
  }): Promise<void> {
    await this.clickAddLead();
    await this.fillLeadForm(data);
    await this.submitLeadForm();
  }

  async searchLeads(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    // Wait for debounce and data loading
    await this.page.waitForTimeout(500);
    await this.waitForPageLoad();
  }

  async expectLeadInList(name: string): Promise<void> {
    await expect(this.page.locator(`${this.table} a:has-text("${name}")`)).toBeVisible();
  }

  async expectLeadNotInList(name: string): Promise<void> {
    await expect(this.page.locator(`${this.table} a:has-text("${name}")`)).not.toBeVisible();
  }

  async openLeadActions(name: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${name}")`);
    await row.locator(this.dropdownTrigger).click();
  }

  async clickLeadAction(name: string, action: string): Promise<void> {
    await this.openLeadActions(name);
    await this.page.locator(`${this.dropdownMenuItem}:has-text("${action}")`).click();
  }

  async deleteLead(name: string): Promise<void> {
    await this.clickLeadAction(name, 'Usuń');
    await this.waitForVisible(this.alertDialog);
    await this.click(this.alertDialogConfirm);
    await this.waitForPageLoad();
  }

  async editLead(name: string): Promise<void> {
    await this.clickLeadAction(name, 'Edytuj');
    await this.waitForVisible(this.dialog);
  }

  async viewLeadDetails(name: string): Promise<void> {
    await this.clickLeadAction(name, 'Szczegóły');
    await this.waitForPageLoad();
  }

  async clickLeadLink(name: string): Promise<void> {
    await this.click(`${this.table} a:has-text("${name}")`);
    await this.waitForPageLoad();
  }

  async convertLeadToClient(name: string): Promise<void> {
    await this.clickLeadAction(name, 'Przekonwertuj na klienta');
    await this.waitForVisible(this.alertDialog);
    await this.click(this.alertDialogConfirm);
    await this.waitForPageLoad();
  }

  // Lead detail methods
  async expectToBeOnLeadDetailPage(): Promise<void> {
    await this.expectVisible('h1');
    await this.expectURLContains('/leads/');
  }

  async editLeadFromDetail(): Promise<void> {
    await this.click('button:has-text("Edytuj")');
    await this.waitForVisible(this.dialog);
  }

  async convertLeadFromDetail(): Promise<void> {
    await this.click('button:has-text("Przekonwertuj")');
    await this.waitForVisible(this.alertDialog);
    await this.click(this.alertDialogConfirm);
    await this.waitForPageLoad();
  }

  // Templates list methods
  async expectToBeOnTemplatesPage(): Promise<void> {
    await expect(this.page.locator(this.pageTitle)).toContainText('Szablony');
  }

  async clickAddTemplate(): Promise<void> {
    await this.click('button:has-text("Nowy szablon")');
    await this.waitForVisible(this.dialog);
  }

  async fillTemplateForm(data: {
    name: string;
    description?: string;
    validityDays?: number;
    vatRate?: number;
  }): Promise<void> {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const dialog = this.page.locator('[role="dialog"]');

    await dialog.locator('input[name="name"]').fill(data.name);
    if (data.description) {
      await dialog.locator('textarea[name="description"]').fill(data.description);
    }
    if (data.validityDays !== undefined) {
      await dialog.locator('input[name="defaultValidityDays"]').fill(data.validityDays.toString());
    }
    if (data.vatRate !== undefined) {
      await dialog.locator('input[name="defaultVatRate"]').fill(data.vatRate.toString());
    }
  }

  async submitTemplateForm(): Promise<void> {
    const dialogSubmit = this.page.locator('[role="dialog"] button[type="submit"]');
    await dialogSubmit.click();
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    validityDays?: number;
    vatRate?: number;
  }): Promise<void> {
    await this.clickAddTemplate();
    await this.fillTemplateForm(data);
    await this.submitTemplateForm();
  }

  async expectTemplateInList(name: string): Promise<void> {
    await expect(this.page.locator(`${this.tableRow}:has-text("${name}")`)).toBeVisible();
  }

  async deleteTemplate(name: string): Promise<void> {
    await this.openTemplateActions(name);
    await this.page.locator(`${this.dropdownMenuItem}:has-text("Usuń")`).click();
    await this.waitForVisible(this.alertDialog);
    await this.click(this.alertDialogConfirm);
    await this.waitForPageLoad();
  }

  async openTemplateActions(name: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${name}")`);
    await row.locator(this.dropdownTrigger).click();
  }

  async editTemplate(name: string): Promise<void> {
    await this.openTemplateActions(name);
    await this.page.locator(`${this.dropdownMenuItem}:has-text("Edytuj")`).click();
    await this.waitForVisible(this.dialog);
  }

  // Offers list methods
  async expectToBeOnOffersPage(): Promise<void> {
    await expect(this.page.locator(this.pageTitle)).toContainText('Lista ofert');
  }

  async clickAddOffer(): Promise<void> {
    await this.click('button:has-text("Nowa oferta")');
    await this.waitForVisible(this.dialog);
  }

  async fillOfferForm(data: {
    title: string;
    leadName?: string;
    templateName?: string;
    description?: string;
    vatRate?: number;
    serviceItems?: Array<{
      name: string;
      unitPrice: number;
      quantity: number;
      unit?: string;
    }>;
  }): Promise<void> {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const dialog = this.page.locator('[role="dialog"]');

    // Fill title
    await dialog.locator('input[name="title"]').fill(data.title);

    // Select lead if provided
    if (data.leadName) {
      await dialog.locator('button[role="combobox"]').first().click();
      await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
      // Use first() to avoid strict mode violation if multiple elements match
      await this.page.locator(`[role="option"]:has-text("${data.leadName}")`).first().click();
    }

    // Select template if provided
    if (data.templateName) {
      const templateButton = dialog.locator('button[role="combobox"]').nth(1);
      await templateButton.click();
      await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
      await this.page.locator(`[role="option"]:has-text("${data.templateName}")`).click();
    }

    // Fill description if provided
    if (data.description) {
      await dialog.locator('textarea[name="description"]').fill(data.description);
    }

    // Fill VAT rate if provided
    if (data.vatRate !== undefined) {
      await dialog.locator('input[name="vatRate"]').fill(data.vatRate.toString());
    }

    // Fill service items if provided
    if (data.serviceItems && data.serviceItems.length > 0) {
      for (let i = 0; i < data.serviceItems.length; i++) {
        const item = data.serviceItems[i];
        const itemSelector = `input[name="serviceTerms.items.${i}.name"]`;

        // Check if item row exists, if not add new one
        if (i > 0 && !(await dialog.locator(itemSelector).isVisible())) {
          await dialog.locator('button:has-text("Dodaj pozycję")').click();
          await dialog.locator(itemSelector).waitFor({ state: 'visible' });
        }

        await dialog.locator(`input[name="serviceTerms.items.${i}.name"]`).fill(item.name);
        await dialog
          .locator(`input[name="serviceTerms.items.${i}.unitPrice"]`)
          .fill(item.unitPrice.toString());
        await dialog
          .locator(`input[name="serviceTerms.items.${i}.quantity"]`)
          .fill(item.quantity.toString());
        if (item.unit) {
          await dialog.locator(`input[name="serviceTerms.items.${i}.unit"]`).fill(item.unit);
        }
      }
    }
  }

  async submitOfferForm(): Promise<void> {
    const dialogSubmit = this.page.locator('[role="dialog"] button[type="submit"]');
    await dialogSubmit.click();
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async createOffer(data: {
    title: string;
    leadName?: string;
    templateName?: string;
    description?: string;
    vatRate?: number;
    serviceItems?: Array<{
      name: string;
      unitPrice: number;
      quantity: number;
      unit?: string;
    }>;
  }): Promise<void> {
    await this.clickAddOffer();
    await this.fillOfferForm(data);
    await this.submitOfferForm();
  }

  async expectOfferInList(offerNumber: string): Promise<void> {
    await expect(this.page.locator(`${this.table} a:has-text("${offerNumber}")`)).toBeVisible();
  }

  async openOfferActions(offerNumber: string): Promise<void> {
    const row = this.page.locator(`${this.tableRow}:has-text("${offerNumber}")`);
    await row.locator(this.dropdownTrigger).click();
  }

  async clickOfferAction(offerNumber: string, action: string): Promise<void> {
    await this.openOfferActions(offerNumber);
    await this.page.locator(`${this.dropdownMenuItem}:has-text("${action}")`).click();
  }

  async viewOfferDetails(offerNumber: string): Promise<void> {
    await this.clickOfferAction(offerNumber, 'Szczegóły');
    await this.waitForPageLoad();
  }

  async clickOfferLink(offerNumber: string): Promise<void> {
    await this.click(`${this.table} a:has-text("${offerNumber}")`);
    await this.waitForPageLoad();
  }

  async deleteOffer(offerNumber: string): Promise<void> {
    await this.clickOfferAction(offerNumber, 'Usuń');
    await this.waitForVisible(this.alertDialog);
    await this.click(this.alertDialogConfirm);
    await this.waitForPageLoad();
  }

  async duplicateOffer(offerNumber: string): Promise<void> {
    await this.clickOfferAction(offerNumber, 'Duplikuj');
    await this.waitForPageLoad();
  }

  async generateOfferDocument(offerNumber: string): Promise<void> {
    await this.clickOfferAction(offerNumber, 'Generuj dokument');
    await this.waitForPageLoad();
  }

  async downloadOfferDocument(offerNumber: string): Promise<void> {
    await this.clickOfferAction(offerNumber, 'Pobierz dokument');
  }

  // Offer detail methods
  async expectToBeOnOfferDetailPage(): Promise<void> {
    await this.expectURLContains('/offers/');
    await this.expectVisible('h1');
  }

  async changeOfferStatus(newStatus: string): Promise<void> {
    // Find the status select trigger button (has w-48 class on the detail page)
    const statusSelectButton = this.page.locator('button[role="combobox"].w-48');
    await statusSelectButton.waitFor({ state: 'visible', timeout: 5000 });
    await statusSelectButton.click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${newStatus}")`).click();
    await this.waitForPageLoad();
  }

  async generateDocumentFromDetail(): Promise<void> {
    await this.click('button:has-text("Generuj dokument")');
    await this.waitForPageLoad();
  }

  async downloadDocumentFromDetail(): Promise<void> {
    await this.click('button:has-text("Pobierz")');
  }

  async sendOfferFromDetail(): Promise<void> {
    await this.click('button:has-text("Wyślij")');
    await this.waitForVisible(this.dialog);
  }

  async duplicateOfferFromDetail(): Promise<void> {
    await this.click('button:has-text("Duplikuj")');
    await this.waitForPageLoad();
  }

  async expectOfferStatus(status: string): Promise<void> {
    await expect(this.page.locator(`text=${status}`).first()).toBeVisible();
  }

  // Common methods
  async closeDialog(): Promise<void> {
    await this.click(this.dialogCloseButton);
    await this.waitForHidden(this.dialog);
  }

  async cancelAlertDialog(): Promise<void> {
    await this.click(this.alertDialogCancel);
    await this.waitForHidden(this.alertDialog);
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(this.tableRow).count();
  }

  async expectTableHasRows(): Promise<void> {
    const count = await this.getTableRowCount();
    expect(count).toBeGreaterThan(0);
  }

  async expectTableEmpty(): Promise<void> {
    await expect(this.page.locator('text=Brak').first()).toBeVisible();
  }

  async goBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }

  async refresh(): Promise<void> {
    await this.click(this.refreshButton);
    await this.waitForPageLoad();
  }
}
