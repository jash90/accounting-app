import { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * OfferTemplateEditorPage - Page Object for offer template editing
 * Handles template editor at /modules/offers/templates/:id/editor
 */
export class OfferTemplateEditorPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly editorTitle = 'h1:has-text("Edytor szablonu"), h1:has-text("Szablon oferty")';
  private readonly templateNameInput = 'input[name="name"], input[placeholder*="Nazwa szablonu"]';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly addBlockButton =
    'button:has-text("Dodaj blok"), button:has-text("Dodaj sekcję")';
  private readonly contentBlockSelector =
    '[data-testid="content-block"], .content-block, [class*="content-block"]';
  private readonly removeBlockButton = 'button:has-text("Usuń blok"), button[aria-label="Usuń"]';

  // Block type menu
  private readonly blockTypeMenu = '[role="menu"], [role="listbox"]';
  private readonly blockTypeOption = '[role="menuitem"], [role="option"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(templateId: string, basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(`${basePath}/templates/${templateId}/editor`);
    await this.waitForPageLoad();
  }

  async expectToBeOnEditorPage(): Promise<void> {
    await this.expectURLContains('/editor');
    await this.expectVisible(this.editorTitle);
  }

  async setTemplateName(name: string): Promise<void> {
    const input = this.page.locator(this.templateNameInput);
    await input.clear();
    await input.fill(name);
  }

  async addContentBlock(type: string): Promise<void> {
    await this.click(this.addBlockButton);
    await this.page.waitForSelector(this.blockTypeMenu, { state: 'visible' });
    await this.page.locator(`${this.blockTypeOption}:has-text("${type}")`).click();
    await this.waitForPageLoad();
  }

  async editContentBlock(index: number, data: Record<string, string>): Promise<void> {
    const blocks = this.page.locator(this.contentBlockSelector);
    const block = blocks.nth(index);
    await block.scrollIntoViewIfNeeded();

    for (const [key, value] of Object.entries(data)) {
      const input = block.locator(`input[name*="${key}"], textarea[name*="${key}"]`).first();
      if (await input.isVisible()) {
        await input.clear();
        await input.fill(value);
      }
    }
  }

  async removeContentBlock(index: number): Promise<void> {
    const blocks = this.page.locator(this.contentBlockSelector);
    const block = blocks.nth(index);
    await block.scrollIntoViewIfNeeded();
    await block.locator(this.removeBlockButton).click();
    await this.waitForPageLoad();
  }

  async saveTemplate(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async expectSaveSuccess(message?: string): Promise<void> {
    await this.toast.expectSuccessToast(message);
  }

  getContentBlocks(): Locator {
    return this.page.locator(this.contentBlockSelector);
  }
}
