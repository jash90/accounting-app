import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * NotificationsPage - Page Object for the notifications inbox page
 */
export class NotificationsPage extends BasePage {
  // Selectors
  private readonly pageHeading = 'h1:has-text("Powiadomienia")';
  private readonly tabAll = 'button[role="tab"]:has-text("Wszystkie")';
  private readonly tabUnread = 'button[role="tab"]:has-text("Nieprzeczytane")';
  private readonly notificationItem = '[data-testid="notification-item"], a[href*="/modules/"]';
  private readonly emptyState = 'text=Brak powiadomień';
  // Use a more specific selector for the notification list container
  private readonly notificationList =
    '[data-testid="notifications-container"], main section, .notifications-list';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to notifications page
   */
  async goto(): Promise<void> {
    await super.goto('/notifications');
  }

  /**
   * Expect to be on notifications page
   */
  async expectToBeOnNotificationsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/notifications/);
    await expect(this.page.locator(this.pageHeading)).toBeVisible();
  }

  /**
   * Click on "All" tab
   */
  async clickTabAll(): Promise<void> {
    await this.page.locator(this.tabAll).click();
  }

  /**
   * Click on "Unread" tab
   */
  async clickTabUnread(): Promise<void> {
    await this.page.locator(this.tabUnread).click();
  }

  /**
   * Expect "All" tab to be selected
   */
  async expectTabAllSelected(): Promise<void> {
    await expect(this.page.locator(this.tabAll)).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Expect "Unread" tab to be selected
   */
  async expectTabUnreadSelected(): Promise<void> {
    await expect(this.page.locator(this.tabUnread)).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Get notification items
   */
  getNotificationItems(): Locator {
    return this.page.locator(this.notificationItem);
  }

  /**
   * Expect notification count
   */
  async expectNotificationCount(count: number): Promise<void> {
    if (count === 0) {
      await expect(this.page.locator(this.emptyState)).toBeVisible();
    } else {
      await expect(this.getNotificationItems()).toHaveCount(count);
    }
  }

  /**
   * Expect notification with text
   */
  async expectNotificationWithText(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  /**
   * Click on notification by text
   */
  async clickNotification(text: string): Promise<void> {
    await this.page.getByText(text).click();
  }

  /**
   * Expect empty state
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.page.getByText('Brak powiadomień')).toBeVisible();
  }

  /**
   * Get first notification link
   */
  getFirstNotification(): Locator {
    return this.page.locator('[data-testid="notification-item"]').first();
  }

  /**
   * Click first notification
   */
  async clickFirstNotification(): Promise<void> {
    await this.getFirstNotification().click();
  }
}
