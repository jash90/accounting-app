import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * SettlementsDashboardPage - Page Object for Settlements Dashboard
 */
export class SettlementsDashboardPage extends BasePage {
  private readonly pageTitle = 'h1:has-text("Moduł Rozliczenia")';

  // Stat cards
  private readonly statCards = [
    'Wszystkie rozliczenia',
    'Oczekujące',
    'W trakcie',
    'Brakująca weryfikacja faktury',
    'Brakująca faktura',
    'Zakończone',
    'Realizacja',
  ] as const;

  // Owner-only stat cards
  private readonly ownerStatCards = ['Nieprzypisane', 'Wymaga uwagi'] as const;

  // Navigation cards
  private readonly navCards = [
    'Lista rozliczeń',
    'Zarządzanie zespołem',
    'Ustawienia modułu',
  ] as const;

  // Extended stats
  private readonly extendedStatsLabels = [
    'Ranking pracowników',
    'Klienci z blokadami rozliczeń',
  ] as const;

  constructor(page: Page) {
    super(page);
  }

  override async goto(basePath: string = '/company/modules/settlements'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async expectToBeOnDashboard(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  async expectStatCardsVisible(): Promise<void> {
    for (const card of this.statCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }

  async expectOwnerCards(): Promise<void> {
    for (const card of this.ownerStatCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }

  async expectNavigationCardsVisible(): Promise<void> {
    for (const card of this.navCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }

  async expectExtendedStats(): Promise<void> {
    for (const label of this.extendedStatsLabels) {
      await expect(this.page.getByText(label).first()).toBeVisible();
    }
  }

  async navigateToList(): Promise<void> {
    await this.page.locator('a:has-text("Lista rozliczeń"), [href*="/list"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToTeam(): Promise<void> {
    await this.page.locator('a:has-text("Zarządzanie zespołem"), [href*="/team"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToSettings(): Promise<void> {
    await this.page.locator('a:has-text("Ustawienia modułu"), [href*="/settings"]').first().click();
    await this.waitForPageLoad();
  }
}
