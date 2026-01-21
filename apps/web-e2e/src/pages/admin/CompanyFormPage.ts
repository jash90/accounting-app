import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * CompanyFormPage - Create/Edit company form
 */
export class CompanyFormPage extends BasePage {
  readonly toast: ToastComponent;

  // Selectors
  private readonly formHeading = 'h2:has-text("Create Company"), h2:has-text("Edit Company")';
  private readonly nameInput = 'input[name="name"], input#name';
  private readonly descriptionInput = 'textarea[name="description"], input[name="description"]';
  private readonly submitButton = 'button[type="submit"]:has-text("Create"), button:has-text("Save"), button:has-text("Submit")';
  private readonly cancelButton = 'button:has-text("Cancel")';
  private readonly nameError = '[data-testid="name-error"], .error:has-text("name")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Wait for form to be visible
   */
  async waitForForm(): Promise<void> {
    await this.waitForVisible(this.formHeading);
  }

  /**
   * Fill company name
   */
  async fillName(name: string): Promise<void> {
    await this.fill(this.nameInput, name);
  }

  /**
   * Fill company description
   */
  async fillDescription(description: string): Promise<void> {
    if (await this.isVisible(this.descriptionInput)) {
      await this.fill(this.descriptionInput, description);
    }
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
  }

  /**
   * Create new company (complete flow)
   */
  async createCompany(name: string, description?: string): Promise<void> {
    await this.fillName(name);

    if (description) {
      await this.fillDescription(description);
    }

    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Update company (complete flow)
   */
  async updateCompany(name?: string, description?: string): Promise<void> {
    if (name) {
      await this.fillName(name);
    }

    if (description) {
      await this.fillDescription(description);
    }

    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Expect name validation error
   */
  async expectNameError(message?: string): Promise<void> {
    await this.expectVisible(this.nameError);
    if (message) {
      await this.expectText(this.nameError, message);
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
}
