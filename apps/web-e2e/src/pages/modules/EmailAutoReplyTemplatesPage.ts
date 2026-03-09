import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * EmailAutoReplyTemplatesPage - Page Object for Email Auto-Reply Templates
 */
export class EmailAutoReplyTemplatesPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'h1:has-text("Szablony auto-odpowiedzi")';
  private readonly createButton = 'button:has-text("Nowy szablon")';
  private readonly emptyState = 'text=Brak szablonów auto-odpowiedzi';

  // Dialog selectors
  private readonly dialog = '[role="dialog"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  override async goto(basePath: string = '/company/modules/email-client'): Promise<void> {
    await super.goto(`${basePath}/auto-reply-templates`);
    await this.waitForPageLoad();
  }

  async expectToBeOnPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  async clickCreateTemplate(): Promise<void> {
    await this.click(this.createButton);
    await this.waitForVisible(this.dialog);
  }

  async fillTemplateForm(data: {
    name: string;
    triggerKeywords: string;
    bodyTemplate: string;
    category?: string;
    isActive?: boolean;
  }): Promise<void> {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const dialog = this.page.locator('[role="dialog"]');

    // Name field (first input)
    await dialog.locator('input[placeholder*="Odpowiedź VAT"]').fill(data.name);

    // Keywords field
    await dialog.locator('input[placeholder*="faktura VAT"]').fill(data.triggerKeywords);

    // Body template
    await dialog.locator('textarea').first().fill(data.bodyTemplate);

    if (data.category) {
      await dialog.locator('button[role="combobox"]').first().click();
      await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
      await this.page.locator(`[role="option"]:has-text("${data.category}")`).click();
    }
  }

  async submitTemplateForm(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.locator('button[type="submit"]').click();
    await this.page
      .waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {});
    await this.waitForPageLoad();
  }

  async editTemplate(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    // Pencil icon button
    await card.locator('button').first().click();
    await this.waitForVisible(this.dialog);
  }

  async deleteTemplate(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    // Trash icon is last button
    await card.locator('button').last().click();
    await this.waitForPageLoad();
  }

  async toggleTemplate(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    // Toggle button (second button - between edit and delete)
    await card.locator('button').nth(1).click();
    await this.waitForPageLoad();
  }

  async expectTemplateInList(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible();
  }

  async expectTemplateNotInList(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`)).not.toBeVisible();
  }

  async expectTemplateActive(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    await expect(card.locator('text=Aktywny')).toBeVisible();
  }

  async expectTemplateInactive(name: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    await expect(card.locator('text=Nieaktywny')).toBeVisible();
  }

  async expectKeywordBadge(name: string, keyword: string): Promise<void> {
    const card = this.page.locator(`[class*="card"]:has-text("${name}")`);
    await expect(card.locator(`text=${keyword}`)).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await this.expectVisible(this.emptyState);
  }
}
