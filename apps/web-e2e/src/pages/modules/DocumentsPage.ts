import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * DocumentsPage - Page Object for Documents module
 * Handles documents dashboard, templates list, and generated documents list
 */
export class DocumentsPage extends BasePage {
  readonly toast: ToastComponent;

  // Dashboard selectors
  private readonly dashboardTitle = 'h1:has-text("Dokumenty")';
  private readonly templatesCard = 'text=Szablony dokumentów';
  private readonly generatedCard = 'text=Wygenerowane dokumenty';
  private readonly manageTemplatesLink = 'a:has-text("Zarządzaj szablonami")';
  private readonly viewHistoryLink = 'a:has-text("Zobacz historię")';

  // Templates list selectors
  private readonly templatesListTitle = 'h1:has-text("Szablony dokumentów")';
  private readonly createTemplateButton = 'button:has-text("Nowy szablon")';
  private readonly emptyState = 'text=Brak szablonów dokumentów';

  // Template card selectors
  private readonly templateCard = '.grid .card, [class*="card"]';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';
  private readonly dialogSubmitButton = '[role="dialog"] button[type="submit"]';
  private readonly alertDialog = '[role="alertdialog"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  // Navigation
  async gotoDashboard(basePath: string = '/company/modules/documents'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async gotoTemplatesList(basePath: string = '/company/modules/documents'): Promise<void> {
    await super.goto(`${basePath}/templates`);
    await this.waitForPageLoad();
  }

  async gotoGeneratedList(basePath: string = '/company/modules/documents'): Promise<void> {
    await super.goto(`${basePath}/generated`);
    await this.waitForPageLoad();
  }

  // Dashboard
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectVisible(this.dashboardTitle);
  }

  async navigateToTemplates(): Promise<void> {
    await this.click(this.manageTemplatesLink);
    await this.waitForPageLoad();
  }

  async navigateToGenerated(): Promise<void> {
    await this.click(this.viewHistoryLink);
    await this.waitForPageLoad();
  }

  // Templates CRUD
  async clickCreateTemplate(): Promise<void> {
    await this.click(this.createTemplateButton);
    await this.waitForVisible(this.dialog);
  }

  async fillTemplateForm(data: {
    name: string;
    description?: string;
    templateContent?: string;
    placeholders?: string;
    category?: string;
  }): Promise<void> {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const dialog = this.page.locator('[role="dialog"]');

    await dialog.locator('input[placeholder*="Umowa o"]').fill(data.name);

    if (data.description) {
      await dialog.locator('input[placeholder*="Krótki opis"]').fill(data.description);
    }
    if (data.placeholders) {
      await dialog.locator('input[placeholder*="klient_nazwa"]').fill(data.placeholders);
    }
    if (data.templateContent) {
      await dialog.locator('textarea').fill(data.templateContent);
    }
  }

  async submitTemplateForm(): Promise<void> {
    const dialogSubmit = this.page.locator(this.dialogSubmitButton);
    await dialogSubmit.click();
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async editTemplate(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    await card.locator('button').filter({ hasText: '' }).first().click();
    await this.waitForVisible(this.dialog);
  }

  async deleteTemplate(name: string): Promise<void> {
    // Find card with the template name and click the trash icon (last ghost button)
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    const deleteBtn = card.locator('button').last();
    await deleteBtn.click();
    await this.waitForPageLoad();
  }

  async expectTemplateInList(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible();
  }

  async expectTemplateNotInList(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`)).not.toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }

  async expectToBeOnTemplatesPage(): Promise<void> {
    await this.expectVisible(this.templatesListTitle);
  }
}
