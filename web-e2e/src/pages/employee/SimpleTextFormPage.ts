import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * SimpleTextFormPage - Create/Edit simple text form
 */
export class SimpleTextFormPage extends BasePage {
  readonly toast: ToastComponent;

  // Selectors
  private readonly formHeading = 'h2:has-text("Create"), h2:has-text("Edit"), h1:has-text("Create"), h1:has-text("Edit")';
  private readonly titleInput = 'input[name="title"], input#title';
  private readonly contentInput = 'textarea[name="content"], input[name="content"], textarea#content';
  private readonly submitButton = 'button[type="submit"]:has-text("Create"), button:has-text("Save"), button:has-text("Submit")';
  private readonly cancelButton = 'button:has-text("Cancel"), a:has-text("Cancel")';
  private readonly titleError = '[data-testid="title-error"], .error:has-text("title")';
  private readonly contentError = '[data-testid="content-error"], .error:has-text("content")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Wait for form to be visible
   */
  async waitForForm(): Promise<void> {
    await this.waitForVisible(this.titleInput);
  }

  /**
   * Fill title
   */
  async fillTitle(title: string): Promise<void> {
    await this.fill(this.titleInput, title);
  }

  /**
   * Fill content
   */
  async fillContent(content: string): Promise<void> {
    await this.fill(this.contentInput, content);
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.click(this.submitButton);
  }

  /**
   * Click cancel button
   */
  async clickCancel(): Promise<void> {
    await this.click(this.cancelButton);
    await this.waitForPageLoad();
  }

  /**
   * Create new simple text (complete flow)
   */
  async createSimpleText(title: string, content: string): Promise<void> {
    await this.fillTitle(title);
    await this.fillContent(content);
    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Update simple text (complete flow)
   */
  async updateSimpleText(title?: string, content?: string): Promise<void> {
    if (title) {
      await this.fillTitle(title);
    }

    if (content) {
      await this.fillContent(content);
    }

    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Expect title validation error
   */
  async expectTitleError(message?: string): Promise<void> {
    await this.expectVisible(this.titleError);
    if (message) {
      await this.expectText(this.titleError, message);
    }
  }

  /**
   * Expect content validation error
   */
  async expectContentError(message?: string): Promise<void> {
    await this.expectVisible(this.contentError);
    if (message) {
      await this.expectText(this.contentError, message);
    }
  }

  /**
   * Expect submit button disabled
   */
  async expectSubmitDisabled(): Promise<void> {
    await this.expectDisabled(this.submitButton);
  }

  /**
   * Expect submit button enabled
   */
  async expectSubmitEnabled(): Promise<void> {
    await this.expectEnabled(this.submitButton);
  }

  /**
   * Clear form
   */
  async clearForm(): Promise<void> {
    await this.fill(this.titleInput, '');
    await this.fill(this.contentInput, '');
  }

  /**
   * Get title value
   */
  async getTitleValue(): Promise<string> {
    return await this.page.locator(this.titleInput).inputValue();
  }

  /**
   * Get content value
   */
  async getContentValue(): Promise<string> {
    return await this.page.locator(this.contentInput).inputValue();
  }

  /**
   * Check if form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return await this.isVisible(this.titleInput);
  }
}
