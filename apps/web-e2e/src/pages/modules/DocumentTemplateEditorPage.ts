import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * DocumentTemplateEditorPage - Page Object for document template editing
 * Handles template editor at /modules/documents/templates/:id/editor
 */
export class DocumentTemplateEditorPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly editorTitle = 'h1:has-text("Edytor szablonu"), h1:has-text("Szablon dokumentu")';
  private readonly templateNameInput = 'input[name="name"], input[placeholder*="Nazwa szablonu"]';
  private readonly templateContentTextarea =
    'textarea[name="templateContent"], textarea[name="content"]';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly previewButton = 'button:has-text("Podgląd")';
  private readonly addPlaceholderButton =
    'button:has-text("Dodaj placeholder"), button:has-text("Dodaj zmienną")';
  private readonly placeholderInput =
    'input[name="placeholder"], input[placeholder*="placeholder"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(templateId: string, basePath: string = '/company/modules/documents'): Promise<void> {
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

  async setTemplateContent(content: string): Promise<void> {
    const textarea = this.page.locator(this.templateContentTextarea);
    await textarea.clear();
    await textarea.fill(content);
  }

  async addPlaceholder(name: string): Promise<void> {
    await this.click(this.addPlaceholderButton);
    const input = this.page.locator(this.placeholderInput).last();
    await input.fill(name);
  }

  async saveTemplate(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async expectSaveSuccess(message?: string): Promise<void> {
    await this.toast.expectSuccessToast(message);
  }

  async previewTemplate(): Promise<void> {
    await this.click(this.previewButton);
    await this.waitForPageLoad();
  }
}
