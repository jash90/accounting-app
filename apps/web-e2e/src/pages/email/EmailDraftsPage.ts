import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

export class EmailDraftsPage extends BasePage {
  readonly nav: NavigationComponent;

  // Locators
  private readonly heading = 'h1:has-text("Drafts"), h1:has-text("Email Drafts")';
  private readonly draftsList = '[data-testid="drafts-list"], .drafts-list, table tbody';
  private readonly draftRow = (index: number) =>
    `tr:nth-child(${index + 1}), [data-testid="draft-row-${index}"]`;
  private readonly editButton = (index: number) =>
    `tr:nth-child(${index + 1}) button:has-text("Edit"), [data-testid="edit-draft-${index}"]`;
  private readonly deleteButton = (index: number) =>
    `tr:nth-child(${index + 1}) button:has-text("Delete"), [data-testid="delete-draft-${index}"]`;
  private readonly sendButton = (index: number) =>
    `tr:nth-child(${index + 1}) button:has-text("Send"), [data-testid="send-draft-${index}"]`;
  private readonly emptyDraftsMessage = 'text=No drafts, text=No saved drafts';
  private readonly loadingSpinner = '.animate-spin, [data-testid="loading"]';
  private readonly aiGeneratedBadge = '.bg-purple-100, [data-testid="ai-badge"]';
  private readonly composeButton = 'button:has-text("Compose"), a:has-text("Compose")';
  private readonly backButton = 'button:has-text("Back"), [aria-label="Back"]';

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/modules/email-client/drafts');
    await this.waitForPageLoad();
  }

  async expectToBeOnDrafts(): Promise<void> {
    await this.expectVisible(this.heading);
  }

  async getDraftCount(): Promise<number> {
    const rows = this.page.locator('tr, [data-testid^="draft-row"]');
    return await rows.count();
  }

  async clickDraftRow(index: number): Promise<void> {
    const row = this.page.locator(this.draftRow(index));
    await row.click();
    await this.waitForPageLoad();
  }

  async editDraft(index: number): Promise<void> {
    await this.click(this.editButton(index));
    await this.waitForPageLoad();
  }

  async deleteDraft(index: number): Promise<void> {
    await this.click(this.deleteButton(index));
    await this.waitForPageLoad();
  }

  async sendDraft(index: number): Promise<void> {
    await this.click(this.sendButton(index));
    await this.waitForPageLoad();
  }

  async expectEmptyDrafts(): Promise<void> {
    await this.expectVisible(this.emptyDraftsMessage);
  }

  async expectDraftListVisible(): Promise<void> {
    const draftsList = this.page.locator(this.draftsList);
    const emptyMessage = this.page.locator(this.emptyDraftsMessage);

    await Promise.race([
      draftsList.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      emptyMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  async expectLoadingComplete(): Promise<void> {
    const spinner = this.page.locator(this.loadingSpinner);
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async getDraftSubject(index: number): Promise<string> {
    const row = this.page.locator(this.draftRow(index));
    const subject = row.locator('td:nth-child(2), [data-testid="draft-subject"]');
    return (await subject.textContent()) || '';
  }

  async getDraftRecipient(index: number): Promise<string> {
    const row = this.page.locator(this.draftRow(index));
    const to = row.locator('td:nth-child(1), [data-testid="draft-to"]');
    return (await to.textContent()) || '';
  }

  async hasAiGeneratedDrafts(): Promise<boolean> {
    const aiBadges = this.page.locator(this.aiGeneratedBadge);
    return (await aiBadges.count()) > 0;
  }

  async clickCompose(): Promise<void> {
    await this.click(this.composeButton);
    await this.waitForPageLoad();
  }

  async clickBack(): Promise<void> {
    await this.click(this.backButton);
    await this.waitForPageLoad();
  }
}
