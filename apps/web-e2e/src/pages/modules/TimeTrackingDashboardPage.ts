import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TimeTrackingDashboardPage - Page Object for Time Tracking Dashboard
 */
export class TimeTrackingDashboardPage extends BasePage {
  private readonly pageTitle = 'h1:has-text("Śledzenie czasu")';

  // Stat cards
  private readonly statCards = ['Dzisiaj', 'Ten tydzień', 'Ten miesiąc'] as const;

  // Navigation cards
  private readonly navCards = ['Wpisy', 'Raporty', 'Statystyki'] as const;

  constructor(page: Page) {
    super(page);
  }

  override async goto(basePath: string = '/company/modules/time-tracking'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async expectToBeOnDashboard(): Promise<void> {
    await this.expectURLContains('time-tracking');
  }

  getStatCard(title: string): Locator {
    return this.page
      .locator('div', { hasText: title })
      .filter({ has: this.page.locator('p, span, h3, h4') })
      .first();
  }

  async expectStatCardValue(title: string, value: string): Promise<void> {
    const card = this.getStatCard(title);
    await expect(card.getByText(value).first()).toBeVisible();
  }

  async navigateToEntries(): Promise<void> {
    await this.page.locator('a:has-text("Wpisy"), [href*="/entries"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToReports(): Promise<void> {
    await this.page.locator('a:has-text("Raporty"), [href*="/reports"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToStatistics(): Promise<void> {
    await this.page.locator('a:has-text("Statystyki"), [href*="/statistics"]').first().click();
    await this.waitForPageLoad();
  }

  async expectNavigationCards(): Promise<void> {
    for (const card of this.navCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }
}
