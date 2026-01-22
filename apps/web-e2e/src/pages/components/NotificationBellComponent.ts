import { expect, Locator, Page } from '@playwright/test';

export class NotificationBellComponent {
  readonly page: Page;

  private readonly bellButton = '[data-testid="notification-bell"]';
  private readonly bellBadge = '[data-testid="notification-bell"] >> text=/\\d+/';
  private readonly dropdown = '[data-testid="notification-dropdown"]';
  private readonly dropdownTitle = '[data-testid="notification-dropdown"] >> text=Powiadomienia';
  private readonly markAllReadButton =
    '[data-testid="notification-dropdown"] button:has-text("Oznacz wszystkie")';
  private readonly emptyStateText =
    '[data-testid="notification-dropdown"] >> text=Brak nowych powiadomień';
  private readonly seeAllLink =
    '[data-testid="notification-dropdown"] a:has-text("Zobacz wszystkie")';
  private readonly notificationItem =
    '[data-testid="notification-dropdown"] [data-testid="notification-item"]';

  constructor(page: Page) {
    this.page = page;
  }

  async clickBell(): Promise<void> {
    await this.page.locator(this.bellButton).click();
  }

  async expectDropdownOpen(): Promise<void> {
    await expect(this.page.locator(this.dropdown)).toBeVisible();
  }

  async expectDropdownClosed(): Promise<void> {
    await expect(this.page.locator(this.dropdown)).toBeHidden();
  }

  async closeDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.expectDropdownClosed();
  }

  async getBadgeCount(): Promise<number | null> {
    const bellButton = this.page.locator(this.bellButton);
    const buttonText = await bellButton.textContent();

    if (!buttonText) return null;

    const match = buttonText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  async expectBadgeCount(count: number): Promise<void> {
    const actualCount = await this.getBadgeCount();
    expect(actualCount).toBe(count);
  }

  async expectNoBadge(): Promise<void> {
    const count = await this.getBadgeCount();
    expect(count).toBeNull();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.locator(this.emptyStateText)).toBeVisible();
  }

  async expectNotificationInDropdown(text: string): Promise<void> {
    await expect(this.page.locator(this.dropdown).getByText(text)).toBeVisible();
  }

  async clickMarkAllRead(): Promise<void> {
    await this.page.locator(this.markAllReadButton).click();
  }

  async clickSeeAll(): Promise<void> {
    await this.page.locator(this.seeAllLink).click();
  }

  getNotificationItems(): Locator {
    return this.page.locator(this.notificationItem);
  }

  async clickFirstNotification(): Promise<void> {
    await this.getNotificationItems().first().click();
  }

  async expectNotificationCount(count: number): Promise<void> {
    if (count === 0) {
      await this.expectEmptyState();
    } else {
      await expect(this.getNotificationItems()).toHaveCount(count);
    }
  }
}
