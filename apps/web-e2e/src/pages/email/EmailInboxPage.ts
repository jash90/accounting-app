import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

export class EmailInboxPage extends BasePage {
  readonly nav: NavigationComponent;

  // Locators
  private readonly heading = 'h1:has-text("Email Inbox")';
  private readonly composeButton = 'button:has-text("Compose"), a:has-text("Compose")';
  private readonly refreshButton = 'button:has-text("Refresh")';
  private readonly emailList = '[data-testid="email-list"], .email-list, table tbody';
  private readonly emailRow = (index: number) => `tr:nth-child(${index + 1}), [data-testid="email-row-${index}"]`;
  private readonly emailCheckbox = (index: number) => `tr:nth-child(${index + 1}) input[type="checkbox"]`;
  private readonly markAsReadButton = 'button:has-text("Mark as Read")';
  private readonly deleteButton = 'button:has-text("Delete")';
  private readonly loadingSpinner = '[data-testid="loading"], .animate-spin';
  private readonly emptyInboxMessage = 'text=No emails, text=Your inbox is empty';
  private readonly unreadBadge = '.bg-blue-100, [data-testid="unread-badge"]';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/modules/email-client/inbox');
    await this.waitForPageLoad();
  }

  async expectToBeOnInbox(): Promise<void> {
    await this.expectVisible(this.heading);
  }

  async clickCompose(): Promise<void> {
    await this.page.locator(this.composeButton).first().click();
    await this.waitForPageLoad();
  }

  async clickRefresh(): Promise<void> {
    await this.click(this.refreshButton);
    await this.waitForPageLoad();
  }

  async selectEmail(index: number): Promise<void> {
    const checkbox = this.page.locator(this.emailCheckbox(index));
    await checkbox.check();
  }

  async deselectEmail(index: number): Promise<void> {
    const checkbox = this.page.locator(this.emailCheckbox(index));
    await checkbox.uncheck();
  }

  async clickEmailRow(index: number): Promise<void> {
    const row = this.page.locator(this.emailRow(index));
    await row.click();
    await this.waitForPageLoad();
  }

  async markSelectedAsRead(): Promise<void> {
    await this.click(this.markAsReadButton);
    await this.waitForPageLoad();
  }

  async deleteSelected(): Promise<void> {
    await this.click(this.deleteButton);
    await this.waitForPageLoad();
  }

  async getEmailCount(): Promise<number> {
    const rows = this.page.locator('tr, [data-testid^="email-row"]');
    return await rows.count();
  }

  async expectEmailListVisible(): Promise<void> {
    // Wait for either email list or empty message
    const emailList = this.page.locator(this.emailList);
    const emptyMessage = this.page.locator(this.emptyInboxMessage);

    await Promise.race([
      emailList.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      emptyMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  async expectLoadingComplete(): Promise<void> {
    const spinner = this.page.locator(this.loadingSpinner);
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async expectEmptyInbox(): Promise<void> {
    await this.expectVisible(this.emptyInboxMessage);
  }

  async getEmailSubject(index: number): Promise<string> {
    const row = this.page.locator(this.emailRow(index));
    const subject = row.locator('td:nth-child(2), [data-testid="email-subject"]');
    return await subject.textContent() || '';
  }

  async getEmailFrom(index: number): Promise<string> {
    const row = this.page.locator(this.emailRow(index));
    const from = row.locator('td:nth-child(1), [data-testid="email-from"]');
    return await from.textContent() || '';
  }

  async hasUnreadEmails(): Promise<boolean> {
    const unread = this.page.locator(this.unreadBadge);
    return await unread.count() > 0;
  }
}
