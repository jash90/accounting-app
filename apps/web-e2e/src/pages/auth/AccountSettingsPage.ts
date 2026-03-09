import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * AccountSettingsPage - Page Object for account settings / password change
 */
export class AccountSettingsPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'text=Ustawienia konta';
  private readonly currentPasswordInput = 'input[name="currentPassword"], #currentPassword';
  private readonly newPasswordInput = 'input[name="newPassword"], #newPassword';
  private readonly confirmPasswordInput =
    'input[name="confirmPassword"], input[name="passwordConfirmation"], #confirmPassword';
  private readonly submitPasswordButton =
    'button:has-text("Zmień hasło"), button:has-text("Zapisz hasło")';
  private readonly userEmailText = '[data-testid="user-email"], text=Email';
  private readonly userRoleText = '[data-testid="user-role"], text=Rola';
  private readonly errorMessage = '[role="alert"], .text-destructive, text=Błąd';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/settings/account');
    await this.waitForPageLoad();
  }

  async expectToBeOnAccountSettingsPage(): Promise<void> {
    await this.expectURLContains('/settings/account');
    await this.expectVisible(this.pageTitle);
  }

  async fillCurrentPassword(password: string): Promise<void> {
    await this.page.locator(this.currentPasswordInput).fill(password);
  }

  async fillNewPassword(password: string): Promise<void> {
    await this.page.locator(this.newPasswordInput).fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.page.locator(this.confirmPasswordInput).fill(password);
  }

  async submitPasswordChange(): Promise<void> {
    await this.click(this.submitPasswordButton);
    await this.waitForPageLoad();
  }

  async expectPasswordChangeSuccess(): Promise<void> {
    await this.toast.expectSuccessToast();
  }

  async expectPasswordChangeError(message?: string): Promise<void> {
    if (message) {
      await this.toast.expectErrorToast(message);
    } else {
      await this.toast.expectErrorToast();
    }
  }

  async getUserEmail(): Promise<string> {
    const emailElement = this.page.locator(this.userEmailText).first();
    return (await emailElement.textContent()) || '';
  }

  async getUserRole(): Promise<string> {
    const roleElement = this.page.locator(this.userRoleText).first();
    return (await roleElement.textContent()) || '';
  }
}
