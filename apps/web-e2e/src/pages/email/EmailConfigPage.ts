import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * EmailConfigPage - Page Object for email SMTP/IMAP configuration
 */
export class EmailConfigPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'text=Konfiguracja email';
  private readonly smtpHostInput = 'input[name="smtpHost"], #smtpHost';
  private readonly smtpPortInput = 'input[name="smtpPort"], #smtpPort';
  private readonly smtpUsernameInput = 'input[name="smtpUsername"], #smtpUsername';
  private readonly smtpPasswordInput = 'input[name="smtpPassword"], #smtpPassword';
  private readonly imapHostInput = 'input[name="imapHost"], #imapHost';
  private readonly imapPortInput = 'input[name="imapPort"], #imapPort';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly testConnectionButton = 'button:has-text("Testuj połączenie")';
  private readonly connectionSuccessMessage = 'text=Połączenie udane';
  private readonly connectionErrorMessage = 'text=Błąd połączenia';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/settings/email-config');
    await this.waitForPageLoad();
  }

  async expectToBeOnEmailConfigPage(): Promise<void> {
    await this.expectURLContains('/settings/email-config');
    await this.expectVisible(this.pageTitle);
  }

  async fillSmtpHost(host: string): Promise<void> {
    const input = this.page.locator(this.smtpHostInput);
    await input.clear();
    await input.fill(host);
  }

  async fillSmtpPort(port: string): Promise<void> {
    const input = this.page.locator(this.smtpPortInput);
    await input.clear();
    await input.fill(port);
  }

  async fillSmtpUsername(username: string): Promise<void> {
    const input = this.page.locator(this.smtpUsernameInput);
    await input.clear();
    await input.fill(username);
  }

  async fillSmtpPassword(password: string): Promise<void> {
    const input = this.page.locator(this.smtpPasswordInput);
    await input.clear();
    await input.fill(password);
  }

  async fillImapHost(host: string): Promise<void> {
    const input = this.page.locator(this.imapHostInput);
    await input.clear();
    await input.fill(host);
  }

  async fillImapPort(port: string): Promise<void> {
    const input = this.page.locator(this.imapPortInput);
    await input.clear();
    await input.fill(port);
  }

  async saveConfig(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async testConnection(): Promise<void> {
    await this.click(this.testConnectionButton);
    await this.waitForPageLoad();
  }

  async expectConnectionSuccess(): Promise<void> {
    await this.toast.expectSuccessToast();
  }

  async expectConnectionError(): Promise<void> {
    await this.toast.expectErrorToast();
  }

  async expectSaveSuccess(): Promise<void> {
    await this.toast.expectSuccessToast();
  }
}
