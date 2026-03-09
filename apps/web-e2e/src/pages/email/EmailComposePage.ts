import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

export class EmailComposePage extends BasePage {
  readonly nav: NavigationComponent;

  // Locators
  private readonly heading = 'h1:has-text("Compose Email"), h1:has-text("Edit Draft")';
  private readonly toInput = 'input#to, [name="to"], input[placeholder*="recipient"]';
  private readonly ccInput = 'input#cc, [name="cc"]';
  private readonly bccInput = 'input#bcc, [name="bcc"]';
  private readonly subjectInput = 'input#subject, [name="subject"], input[placeholder*="subject"]';
  private readonly contentInput =
    'textarea#content, [name="content"], textarea[placeholder*="message"]';
  private readonly sendButton = 'button:has-text("Send")';
  private readonly saveDraftButton =
    'button:has-text("Save Draft"), button:has-text("Update Draft")';
  private readonly backButton = 'button:has-text("Back"), [aria-label="Back"]';
  private readonly ccBccToggle = 'button:has-text("Add CC/BCC"), button:has-text("Hide CC/BCC")';
  private readonly attachmentZone = '[data-testid="attachment-zone"], .border-dashed';
  private readonly fileInput = 'input[type="file"]';
  private readonly attachmentList = '[data-testid="attachment-list"], .attachment-list';
  private readonly attachmentItem = (index: number) =>
    `[data-testid="attachment-${index}"], .attachment-item:nth-child(${index + 1})`;
  private readonly removeAttachmentButton = (index: number) =>
    `[data-testid="remove-attachment-${index}"], .attachment-item:nth-child(${index + 1}) button`;
  private readonly aiGeneratedBadge = 'text=AI Generated, [data-testid="ai-badge"]';
  private readonly loadingSpinner = '.animate-spin, [data-testid="loading"]';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/modules/email-client/compose');
    await this.waitForPageLoad();
  }

  async gotoWithDraft(draftId: string): Promise<void> {
    await super.goto(`/modules/email-client/compose?draftId=${draftId}`);
    await this.waitForPageLoad();
  }

  async expectToBeOnCompose(): Promise<void> {
    await this.expectVisible(this.heading);
  }

  async fillTo(email: string): Promise<void> {
    await this.fill(this.toInput, email);
  }

  async fillSubject(subject: string): Promise<void> {
    await this.fill(this.subjectInput, subject);
  }

  async fillContent(content: string): Promise<void> {
    await this.fill(this.contentInput, content);
  }

  async showCcBcc(): Promise<void> {
    const toggle = this.page.locator(this.ccBccToggle);
    const text = await toggle.textContent();
    if (text?.includes('Add CC/BCC')) {
      await toggle.click();
    }
  }

  async fillCc(email: string): Promise<void> {
    await this.showCcBcc();
    await this.fill(this.ccInput, email);
  }

  async fillBcc(email: string): Promise<void> {
    await this.showCcBcc();
    await this.fill(this.bccInput, email);
  }

  async clickSend(): Promise<void> {
    await this.click(this.sendButton);
    await this.waitForPageLoad();
  }

  async clickSaveDraft(): Promise<void> {
    await this.click(this.saveDraftButton);
    await this.waitForPageLoad();
  }

  async clickBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }

  async uploadAttachment(filePath: string): Promise<void> {
    const input = this.page.locator(this.fileInput);
    await input.setInputFiles(filePath);
    await this.waitForPageLoad();
  }

  async removeAttachment(index: number): Promise<void> {
    await this.click(this.removeAttachmentButton(index));
  }

  async getAttachmentCount(): Promise<number> {
    const items = this.page.locator('.attachment-item, [data-testid^="attachment-"]');
    return await items.count();
  }

  async expectAttachmentVisible(filename: string): Promise<void> {
    await this.expectVisible(`text=${filename}`);
  }

  async expectAiGeneratedBadge(): Promise<void> {
    await this.expectVisible(this.aiGeneratedBadge);
  }

  async expectLoadingComplete(): Promise<void> {
    const spinner = this.page.locator(this.loadingSpinner);
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async composeEmail(to: string, subject: string, content: string): Promise<void> {
    await this.fillTo(to);
    await this.fillSubject(subject);
    await this.fillContent(content);
  }

  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    await this.composeEmail(to, subject, content);
    await this.clickSend();
  }

  async saveDraft(to: string, subject: string, content: string): Promise<void> {
    await this.composeEmail(to, subject, content);
    await this.clickSaveDraft();
  }

  async getToValue(): Promise<string> {
    const input = this.page.locator(this.toInput);
    return await input.inputValue();
  }

  async getSubjectValue(): Promise<string> {
    const input = this.page.locator(this.subjectInput);
    return await input.inputValue();
  }

  async getContentValue(): Promise<string> {
    const input = this.page.locator(this.contentInput);
    return await input.inputValue();
  }
}
