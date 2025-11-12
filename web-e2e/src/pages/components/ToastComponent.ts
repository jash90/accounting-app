import { Page, Locator, expect } from '@playwright/test';

/**
 * ToastComponent - Handles toast notification interactions
 * Used to verify success, error, and info messages across the application
 */
export class ToastComponent {
  readonly page: Page;

  // Toast selectors - adjust based on your toast library (likely sonner or react-hot-toast)
  private readonly toastContainer = '[data-sonner-toaster], [data-toast], .toast-container';
  private readonly toast = '[data-sonner-toast], [data-toast-item], .toast';
  private readonly toastSuccess = '[data-type="success"], .toast-success';
  private readonly toastError = '[data-type="error"], .toast-error';
  private readonly toastInfo = '[data-type="info"], .toast-info';
  private readonly toastWarning = '[data-type="warning"], .toast-warning';
  private readonly toastMessage = '[data-description], [data-content], .toast-message';
  private readonly toastTitle = '[data-title], .toast-title';
  private readonly toastCloseButton = '[data-close-button], button[aria-label="Close"]';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for any toast to appear
   */
  async waitForToast(timeout = 5000): Promise<void> {
    await this.page.waitForSelector(this.toast, {
      state: 'visible',
      timeout,
    });
  }

  /**
   * Wait for toast to disappear
   */
  async waitForToastToDisappear(timeout = 10000): Promise<void> {
    await this.page.waitForSelector(this.toast, {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * Get toast message text
   */
  async getToastMessage(): Promise<string> {
    await this.waitForToast();
    const messageElement = await this.page.locator(this.toastMessage).first();
    const message = await messageElement.textContent();
    return message?.trim() || '';
  }

  /**
   * Get all visible toast messages
   */
  async getAllToastMessages(): Promise<string[]> {
    const messages = await this.page.$$eval(
      this.toastMessage,
      (elements) => elements.map((el) => el.textContent?.trim() || '')
    );
    return messages.filter(Boolean);
  }

  /**
   * Check if success toast is visible
   */
  async isSuccessToastVisible(): Promise<boolean> {
    return await this.page.isVisible(this.toastSuccess);
  }

  /**
   * Check if error toast is visible
   */
  async isErrorToastVisible(): Promise<boolean> {
    return await this.page.isVisible(this.toastError);
  }

  /**
   * Expect success toast with specific message
   */
  async expectSuccessToast(message?: string): Promise<void> {
    await this.waitForToast();

    // Check that success toast is visible
    const successToast = this.page.locator(this.toastSuccess).first();
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // If message is provided, verify it
    if (message) {
      const toastMessage = this.page.locator(this.toast).filter({ hasText: message }).first();
      await expect(toastMessage).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Expect error toast with specific message
   */
  async expectErrorToast(message?: string): Promise<void> {
    await this.waitForToast();

    // Check that error toast is visible
    const errorToast = this.page.locator(this.toastError).first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    // If message is provided, verify it
    if (message) {
      const toastMessage = this.page.locator(this.toast).filter({ hasText: message }).first();
      await expect(toastMessage).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Expect info toast with specific message
   */
  async expectInfoToast(message?: string): Promise<void> {
    await this.waitForToast();

    const infoToast = this.page.locator(this.toastInfo).first();
    await expect(infoToast).toBeVisible({ timeout: 5000 });

    if (message) {
      const toastMessage = this.page.locator(this.toast).filter({ hasText: message }).first();
      await expect(toastMessage).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Expect toast with specific text (any type)
   */
  async expectToastWithText(text: string): Promise<void> {
    await this.waitForToast();
    const toast = this.page.locator(this.toast).filter({ hasText: text }).first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close toast by clicking close button
   */
  async closeToast(): Promise<void> {
    const closeButton = this.page.locator(this.toastCloseButton).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  /**
   * Close all visible toasts
   */
  async closeAllToasts(): Promise<void> {
    const closeButtons = await this.page.locator(this.toastCloseButton).all();
    for (const button of closeButtons) {
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(200);
      }
    }
  }

  /**
   * Wait for specific toast type and message, then close it
   */
  async expectAndCloseSuccessToast(message?: string): Promise<void> {
    await this.expectSuccessToast(message);
    await this.closeToast();
  }

  /**
   * Wait for toast and get its type
   */
  async getToastType(): Promise<'success' | 'error' | 'info' | 'warning' | 'unknown'> {
    await this.waitForToast();

    if (await this.isSuccessToastVisible()) return 'success';
    if (await this.isErrorToastVisible()) return 'error';
    if (await this.page.isVisible(this.toastInfo)) return 'info';
    if (await this.page.isVisible(this.toastWarning)) return 'warning';

    return 'unknown';
  }

  /**
   * Get count of visible toasts
   */
  async getToastCount(): Promise<number> {
    const toasts = await this.page.locator(this.toast).all();
    let visibleCount = 0;

    for (const toast of toasts) {
      if (await toast.isVisible()) {
        visibleCount++;
      }
    }

    return visibleCount;
  }

  /**
   * Expect no toasts are visible
   */
  async expectNoToasts(): Promise<void> {
    const count = await this.getToastCount();
    expect(count).toBe(0);
  }

  /**
   * Expect specific number of toasts
   */
  async expectToastCount(count: number): Promise<void> {
    const actualCount = await this.getToastCount();
    expect(actualCount).toBe(count);
  }
}
