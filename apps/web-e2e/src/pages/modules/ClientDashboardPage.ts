import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * ClientDashboardPage - Page Object for Clients Dashboard at /modules/clients
 */
export class ClientDashboardPage extends BasePage {
  private readonly pageTitle = 'h1:has-text("Klienci")';

  // Stat cards
  private readonly statCards = ['Wszyscy klienci', 'Aktywni', 'Nieaktywni'] as const;

  // Navigation cards
  private readonly navCards = ['Lista klientów'] as const;

  constructor(page: Page) {
    super(page);
  }

  override async goto(basePath: string = '/company/modules/clients'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async expectToBeOnDashboard(): Promise<void> {
    await this.expectURLContains('clients');
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

  async navigateToClientsList(): Promise<void> {
    await this.page.locator('a:has-text("Lista klientów"), [href*="/list"]').first().click();
    await this.waitForPageLoad();
  }

  async expectNavigationCards(): Promise<void> {
    for (const card of this.navCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }
}
