import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * LoginPage - Handles login page interactions
 */
export class LoginPage extends BasePage {
  readonly toast: ToastComponent;

  // Selectors
  private readonly emailInput = 'input[type="email"], input[name="email"], input#email';
  private readonly passwordInput = 'input[type="password"], input[name="password"], input#password';
  private readonly loginButton = 'button[type="submit"]:has-text("Login"), button:has-text("Sign in")';
  private readonly emailError = '[data-testid="email-error"], .error:has-text("email")';
  private readonly passwordError = '[data-testid="password-error"], .error:has-text("password")';
  private readonly formError = '[data-testid="form-error"], .form-error, [role="alert"]';
  private readonly loginForm = 'form';
  private readonly heading = 'h1, h2';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Wait for login page to be loaded
   */
  async waitForLoginPage(): Promise<void> {
    await this.waitForVisible(this.emailInput);
    await this.waitForVisible(this.passwordInput);
    await this.waitForVisible(this.loginButton);
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.click(this.loginButton);
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * Perform login and wait for redirect
   */
  async loginAndWaitForRedirect(email: string, password: string, expectedPath?: string): Promise<void> {
    await this.login(email, password);

    // Wait for navigation away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });

    // If expected path is provided, verify it
    if (expectedPath) {
      await this.expectURL(expectedPath);
    }

    await this.waitForPageLoad();
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin(email = 'admin@system.com', password = 'Admin123!'): Promise<void> {
    await this.goto();
    await this.loginAndWaitForRedirect(email, password, '/admin');
  }

  /**
   * Login as company owner
   */
  async loginAsCompanyOwner(email = 'owner.a@company.com', password = 'Owner123!'): Promise<void> {
    await this.goto();
    await this.loginAndWaitForRedirect(email, password, '/company');
  }

  /**
   * Login as employee
   */
  async loginAsEmployee(email = 'employee1.a@company.com', password = 'Employee123!'): Promise<void> {
    await this.goto();
    await this.loginAndWaitForRedirect(email, password, '/modules');
  }

  /**
   * Attempt login with invalid credentials
   */
  async loginWithInvalidCredentials(email: string, password: string): Promise<void> {
    await this.login(email, password);
    // Don't wait for redirect - expect to stay on login page
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if email validation error is shown
   */
  async expectEmailError(errorMessage?: string): Promise<void> {
    await expect(this.page.locator(this.emailError)).toBeVisible();

    if (errorMessage) {
      await expect(this.page.locator(this.emailError)).toContainText(errorMessage);
    }
  }

  /**
   * Check if password validation error is shown
   */
  async expectPasswordError(errorMessage?: string): Promise<void> {
    await expect(this.page.locator(this.passwordError)).toBeVisible();

    if (errorMessage) {
      await expect(this.page.locator(this.passwordError)).toContainText(errorMessage);
    }
  }

  /**
   * Check if form-level error is shown
   */
  async expectFormError(errorMessage?: string): Promise<void> {
    // Look for error toast or form error message
    const hasToast = await this.toast.isErrorToastVisible();
    const hasFormError = await this.isVisible(this.formError);

    expect(hasToast || hasFormError).toBe(true);

    if (errorMessage) {
      if (hasToast) {
        const toastMessage = await this.toast.getToastMessage();
        expect(toastMessage).toContain(errorMessage);
      } else {
        await expect(this.page.locator(this.formError)).toContainText(errorMessage);
      }
    }
  }

  /**
   * Check if login button is disabled
   */
  async expectLoginButtonDisabled(): Promise<void> {
    await expect(this.page.locator(this.loginButton)).toBeDisabled();
  }

  /**
   * Check if login button is enabled
   */
  async expectLoginButtonEnabled(): Promise<void> {
    await expect(this.page.locator(this.loginButton)).toBeEnabled();
  }

  /**
   * Clear login form
   */
  async clearForm(): Promise<void> {
    await this.fill(this.emailInput, '');
    await this.fill(this.passwordInput, '');
  }

  /**
   * Submit form by pressing Enter
   */
  async submitWithEnter(): Promise<void> {
    await this.page.locator(this.passwordInput).press('Enter');
  }

  /**
   * Check if on login page
   */
  async expectToBeOnLoginPage(): Promise<void> {
    await this.expectURL('/login');
    await this.expectVisible(this.loginForm);
  }

  /**
   * Get page heading text
   */
  async getHeading(): Promise<string> {
    return await this.getText(this.heading);
  }

  /**
   * Check if email input has focus
   */
  async expectEmailInputFocused(): Promise<void> {
    const isFocused = await this.page.locator(this.emailInput).evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  }

  /**
   * Tab to next field
   */
  async tabToNextField(): Promise<void> {
    await this.press('Tab');
  }

  /**
   * Check if password is masked
   */
  async expectPasswordMasked(): Promise<void> {
    const type = await this.page.locator(this.passwordInput).getAttribute('type');
    expect(type).toBe('password');
  }

  /**
   * Wait for login to complete with successful redirect
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
    await this.waitForPageLoad();
  }

  /**
   * Expect to remain on login page (failed login)
   */
  async expectToRemainOnLoginPage(): Promise<void> {
    await this.page.waitForTimeout(2000);
    await this.expectToBeOnLoginPage();
  }
}
