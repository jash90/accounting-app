import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

export class EmailMessagePage extends BasePage {
  readonly nav: NavigationComponent;

  // Locators
  private readonly subjectHeading = '[data-testid="email-subject"], h1, h2';
  private readonly fromAddress = '[data-testid="email-from"], .from-address';
  private readonly toAddress = '[data-testid="email-to"], .to-address';
  private readonly dateReceived = '[data-testid="email-date"], .email-date';
  private readonly messageContent = '[data-testid="email-content"], .email-body, .prose';
  private readonly replyButton = 'button:has-text("Reply")';
  private readonly replyAllButton = 'button:has-text("Reply All")';
  private readonly forwardButton = 'button:has-text("Forward")';
  private readonly deleteButton = 'button:has-text("Delete")';
  private readonly backButton = 'button:has-text("Back"), [aria-label="Back"]';
  private readonly aiReplyButton =
    'button:has-text("AI Reply"), button:has-text("Generate AI Reply")';
  private readonly attachmentsList = '[data-testid="attachments-list"], .attachments';
  private readonly attachmentItem = (index: number) =>
    `[data-testid="attachment-${index}"], .attachment-item:nth-child(${index + 1})`;
  private readonly downloadAttachmentButton = (index: number) =>
    `[data-testid="download-attachment-${index}"], .attachment-item:nth-child(${index + 1}) a`;
  private readonly loadingSpinner = '.animate-spin, [data-testid="loading"]';
  private readonly markAsReadButton = 'button:has-text("Mark as Read")';
  private readonly markAsUnreadButton = 'button:has-text("Mark as Unread")';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  async goto(uid: number): Promise<void> {
    await super.goto(`/modules/email-client/message/${uid}`);
    await this.waitForPageLoad();
  }

  async expectToBeOnMessage(): Promise<void> {
    await this.expectVisible(this.messageContent);
  }

  async getSubject(): Promise<string> {
    const subject = this.page.locator(this.subjectHeading).first();
    return (await subject.textContent()) || '';
  }

  async getFrom(): Promise<string> {
    const from = this.page.locator(this.fromAddress);
    return (await from.textContent()) || '';
  }

  async getTo(): Promise<string> {
    const to = this.page.locator(this.toAddress);
    return (await to.textContent()) || '';
  }

  async getDate(): Promise<string> {
    const date = this.page.locator(this.dateReceived);
    return (await date.textContent()) || '';
  }

  async getContent(): Promise<string> {
    const content = this.page.locator(this.messageContent);
    return (await content.textContent()) || '';
  }

  async clickReply(): Promise<void> {
    await this.click(this.replyButton);
    await this.waitForPageLoad();
  }

  async clickReplyAll(): Promise<void> {
    await this.click(this.replyAllButton);
    await this.waitForPageLoad();
  }

  async clickForward(): Promise<void> {
    await this.click(this.forwardButton);
    await this.waitForPageLoad();
  }

  async clickDelete(): Promise<void> {
    await this.click(this.deleteButton);
    await this.waitForPageLoad();
  }

  async clickBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }

  async clickAiReply(): Promise<void> {
    await this.click(this.aiReplyButton);
    await this.waitForPageLoad();
  }

  async getAttachmentCount(): Promise<number> {
    const items = this.page.locator('.attachment-item, [data-testid^="attachment-"]');
    return await items.count();
  }

  async downloadAttachment(index: number): Promise<void> {
    await this.click(this.downloadAttachmentButton(index));
  }

  async expectAttachmentVisible(filename: string): Promise<void> {
    await this.expectVisible(`text=${filename}`);
  }

  async expectLoadingComplete(): Promise<void> {
    const spinner = this.page.locator(this.loadingSpinner);
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async hasAttachments(): Promise<boolean> {
    const attachments = this.page.locator(this.attachmentsList);
    return (await attachments.count()) > 0;
  }

  async markAsRead(): Promise<void> {
    await this.click(this.markAsReadButton);
    await this.waitForPageLoad();
  }

  async markAsUnread(): Promise<void> {
    await this.click(this.markAsUnreadButton);
    await this.waitForPageLoad();
  }

  async expectReplyButtonVisible(): Promise<void> {
    await this.expectVisible(this.replyButton);
  }

  async expectAiReplyButtonVisible(): Promise<void> {
    await this.expectVisible(this.aiReplyButton);
  }
}
