import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * GeneratedDocumentDetailPage - Page Object for viewing a generated document
 * Handles document detail at /modules/documents/generated/:id
 */
export class GeneratedDocumentDetailPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly detailTitle = 'h1';
  private readonly clientNameSelector = 'text=Klient';
  private readonly downloadButton = 'button:has-text("Pobierz"), a:has-text("Pobierz")';
  private readonly deleteButton = 'button:has-text("Usuń")';
  private readonly backButton = 'button:has([class*="lucide-arrow-left"]), a:has-text("Powrót")';

  // Confirm delete dialog
  private readonly alertDialog = '[role="alertdialog"]';
  private readonly confirmDeleteButton = '[role="alertdialog"] button:has-text("Usuń")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(documentId: string, basePath: string = '/company/modules/documents'): Promise<void> {
    await super.goto(`${basePath}/generated/${documentId}`);
    await this.waitForPageLoad();
  }

  async expectToBeOnDetailPage(): Promise<void> {
    await this.expectURLContains('/generated/');
    await this.expectVisible(this.detailTitle);
  }

  async expectDocumentTitle(title: string): Promise<void> {
    await expect(this.page.locator(this.detailTitle)).toContainText(title);
  }

  async expectClientName(name: string): Promise<void> {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async downloadDocument(): Promise<void> {
    await this.click(this.downloadButton);
  }

  async deleteDocument(): Promise<void> {
    await this.click(this.deleteButton);
    await this.page.waitForSelector(this.alertDialog, { state: 'visible' });
    await this.click(this.confirmDeleteButton);
    await this.waitForPageLoad();
  }

  async navigateBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }
}
