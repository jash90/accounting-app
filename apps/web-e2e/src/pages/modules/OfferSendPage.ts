import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * OfferSendPage - Page Object for sending an offer
 * Handles the offer send flow at /modules/offers/:id/send
 */
export class OfferSendPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly sendPageTitle = 'h1:has-text("Wyślij ofertę"), h2:has-text("Wyślij ofertę")';
  private readonly recipientEmailInput = 'input[name="recipientEmail"], input[type="email"]';
  private readonly subjectInput = 'input[name="subject"], input[placeholder*="Temat"]';
  private readonly messageTextarea = 'textarea[name="message"], textarea[placeholder*="Treść"]';
  private readonly sendButton = 'button:has-text("Wyślij")';

  // Dialog selectors
  private readonly sendDialog = '[role="dialog"]';
  private readonly dialogSendButton = '[role="dialog"] button:has-text("Wyślij")';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(offerId: string, basePath: string = '/company/modules/offers'): Promise<void> {
    await super.goto(`${basePath}/${offerId}/send`);
    await this.waitForPageLoad();
  }

  async expectToBeOnSendPage(): Promise<void> {
    await this.expectURLContains('/send');
    await this.expectVisible(this.sendPageTitle);
  }

  async fillRecipientEmail(email: string): Promise<void> {
    await this.fill(this.recipientEmailInput, email);
  }

  async fillSubject(subject: string): Promise<void> {
    await this.fill(this.subjectInput, subject);
  }

  async fillMessage(message: string): Promise<void> {
    await this.page.locator(this.messageTextarea).fill(message);
  }

  async clickSend(): Promise<void> {
    await this.click(this.sendButton);
    await this.waitForPageLoad();
  }

  async expectSendSuccess(message?: string): Promise<void> {
    await this.toast.expectSuccessToast(message);
  }

  async expectSendDialog(): Promise<void> {
    await this.expectVisible(this.sendDialog);
  }
}
