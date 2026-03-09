import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * ClientDetailPage - Page Object for single client detail view at /modules/clients/:id
 */
export class ClientDetailPage extends BasePage {
  // Detail page selectors
  private readonly editButton: Locator;
  private readonly deleteButton: Locator;
  private readonly backButton: Locator;
  private readonly clientNameHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.editButton = page.getByRole('button', { name: /edytuj|edit/i });
    this.deleteButton = page.getByRole('button', { name: /usuń|delete/i });
    this.backButton = page.getByRole('button', { name: /wróć|powrót|back/i });
    this.clientNameHeading = page.locator('h1, h2').first();
  }

  override async goto(clientId: string, basePath: string = '/modules/clients'): Promise<void> {
    await super.goto(`${basePath}/${clientId}`);
    await this.waitForPageLoad();
  }

  async expectToBeOnClientDetailPage(): Promise<void> {
    await this.expectURLContains('clients/');
  }

  async expectClientName(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  getClientField(label: string): Locator {
    return this.page
      .locator(`dt:has-text("${label}"), th:has-text("${label}"), label:has-text("${label}")`)
      .first()
      .locator('xpath=following-sibling::*[1] | ancestor::div[1]/following-sibling::*[1]')
      .first();
  }

  async clickEditButton(): Promise<void> {
    await this.editButton.click();
    await this.waitForPageLoad();
  }

  async clickDeleteButton(): Promise<void> {
    await this.deleteButton.click();
  }

  async expectFieldValue(label: string, value: string): Promise<void> {
    const row = this.page.locator('div, tr, li', {
      hasText: label,
    });
    await expect(row.getByText(value).first()).toBeVisible();
  }

  async navigateBack(): Promise<void> {
    // Try back button first, fallback to browser back
    if (await this.backButton.isVisible()) {
      await this.backButton.click();
    } else {
      await this.goBack();
    }
    await this.waitForPageLoad();
  }
}
