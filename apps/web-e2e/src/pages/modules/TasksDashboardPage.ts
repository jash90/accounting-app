import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TasksDashboardPage - Page Object for Tasks Dashboard
 */
export class TasksDashboardPage extends BasePage {
  private readonly pageTitle = 'h1:has-text("Moduł Zadania")';

  // Stat cards
  private readonly statCards = [
    'Wszystkie zadania',
    'W trakcie',
    'Po terminie',
    'Ukończone',
  ] as const;

  // Navigation cards
  private readonly navCards = ['Lista zadań', 'Tablica Kanban', 'Kalendarz', 'Oś czasu'] as const;

  // Owner-only cards
  private readonly ownerCards = [
    'Szablony zadań',
    'Ustawienia modułu',
    'Statystyki zadań',
  ] as const;

  constructor(page: Page) {
    super(page);
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
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

  async expectNavigationCardsVisible(): Promise<void> {
    for (const card of this.navCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }

  async expectOwnerCards(): Promise<void> {
    for (const card of this.ownerCards) {
      await expect(this.page.getByText(card).first()).toBeVisible();
    }
  }

  async expectChartVisible(): Promise<void> {
    await expect(this.page.getByText('Status zadań').first()).toBeVisible();
  }

  async navigateToList(): Promise<void> {
    await this.page.locator('a:has-text("Lista zadań"), [href*="/list"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToKanban(): Promise<void> {
    await this.page.locator('a:has-text("Tablica Kanban"), [href*="/kanban"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToTemplates(): Promise<void> {
    await this.page.locator('a:has-text("Szablony zadań"), [href*="/templates"]').first().click();
    await this.waitForPageLoad();
  }

  async navigateToStatistics(): Promise<void> {
    await this.page
      .locator('a:has-text("Statystyki zadań"), [href*="/statistics"]')
      .first()
      .click();
    await this.waitForPageLoad();
  }
}
