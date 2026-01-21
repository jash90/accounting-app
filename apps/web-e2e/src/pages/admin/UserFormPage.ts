import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * UserFormPage - Create/Edit user form (modal or page)
 */
export class UserFormPage extends BasePage {
  readonly toast: ToastComponent;

  // Selectors
  private readonly formModal = '[role="dialog"], [data-testid="user-form-modal"]';
  private readonly formHeading = 'h2:has-text("Create User"), h2:has-text("Edit User")';
  private readonly emailInput = 'input[name="email"], input#email';
  private readonly passwordInput = 'input[name="password"], input#password';
  private readonly confirmPasswordInput = 'input[name="confirmPassword"], input#confirmPassword';
  private readonly roleSelect = 'select[name="role"], [data-testid="role-select"]';
  private readonly companySelect = 'select[name="companyId"], [data-testid="company-select"]';
  private readonly submitButton = 'button[type="submit"]:has-text("Create"), button:has-text("Save"), button:has-text("Submit")';
  private readonly cancelButton = 'button:has-text("Cancel")';
  private readonly emailError = '[data-testid="email-error"], .error:has-text("email")';
  private readonly passwordError = '[data-testid="password-error"], .error:has-text("password")';
  private readonly roleError = '[data-testid="role-error"], .error:has-text("role")';
  private readonly companyError = '[data-testid="company-error"], .error:has-text("company")';

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
   * Fill email
   */
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  /**
   * Fill password
   */
  async fillPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password);
  }

  /**
   * Fill confirm password
   */
  async fillConfirmPassword(password: string): Promise<void> {
    if (await this.isVisible(this.confirmPasswordInput)) {
      await this.fill(this.confirmPasswordInput, password);
    }
  }

  /**
   * Select role
   */
  async selectRole(role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE'): Promise<void> {
    await this.selectOption(this.roleSelect, role);
  }

  /**
   * Select company (for COMPANY_OWNER and EMPLOYEE)
   */
  async selectCompany(companyName: string): Promise<void> {
    if (await this.isVisible(this.companySelect)) {
      await this.page.selectOption(this.companySelect, { label: companyName });
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
   * Create new user (complete flow)
   */
  async createUser(data: {
    email: string;
    password: string;
    role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE';
    companyName?: string;
  }): Promise<void> {
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
    await this.selectRole(data.role);

    if (data.companyName && (data.role === 'COMPANY_OWNER' || data.role === 'EMPLOYEE')) {
      await this.selectCompany(data.companyName);
    }

    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Update user (complete flow)
   */
  async updateUser(data: {
    email?: string;
    role?: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE';
    companyName?: string;
  }): Promise<void> {
    if (data.email) {
      await this.fillEmail(data.email);
    }

    if (data.role) {
      await this.selectRole(data.role);
    }

    if (data.companyName) {
      await this.selectCompany(data.companyName);
    }

    await this.clickSubmit();
    await this.toast.expectSuccessToast();
  }

  /**
   * Expect email validation error
   */
  async expectEmailError(message?: string): Promise<void> {
    await this.expectVisible(this.emailError);
    if (message) {
      await this.expectText(this.emailError, message);
    }
  }

  /**
   * Expect password validation error
   */
  async expectPasswordError(message?: string): Promise<void> {
    await this.expectVisible(this.passwordError);
    if (message) {
      await this.expectText(this.passwordError, message);
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
   * Check if company select is visible
   */
  async isCompanySelectVisible(): Promise<boolean> {
    return await this.isVisible(this.companySelect);
  }

  /**
   * Close form
   */
  async close(): Promise<void> {
    await this.clickCancel();
  }
}
