import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TasksStatisticsPage - Page Object for Tasks Statistics subpage
 * Handles 6 stat panels and period selector
 */
export class TasksStatisticsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly periodSelect: Locator;

  // Panel titles as defined in tasks-statistics.tsx
  static readonly PANEL_TITLES = [
    'Ranking pracowników — ukończone zadania',
    'Pracownicy z najmniejszą liczbą ukończonych zadań',
    'Najdłuższe zadania (godz.)',
    'Najdłużej zablokowane zadania',
    'Najdłużej anulowane zadania',
    'Najdłużej w przeglądzie',
  ] as const;

  // Period options as defined in tasks-statistics.tsx Select items
  static readonly PERIOD_OPTIONS = {
    all: 'Cały okres',
    '30d': 'Ostatnie 30 dni',
    '90d': 'Ostatnie 90 dni',
    '365d': 'Ostatnie 365 dni',
  } as const;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByText('Statystyki zadań').first();
    this.periodSelect = page.locator('button[role="combobox"]').first();
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/statistics`);
  }

  /**
   * Assert we are on the statistics page
   */
  async expectOnStatisticsPage(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await this.expectURLContains('/statistics');
  }

  /**
   * Assert all 6 panel titles are visible on the page
   */
  async expectAllPanels(): Promise<void> {
    for (const title of TasksStatisticsPage.PANEL_TITLES) {
      await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 15000 });
    }
  }

  /**
   * Select a time period preset using the combobox
   */
  async selectPeriod(period: '30d' | '90d' | '365d' | 'all'): Promise<void> {
    await this.periodSelect.click();
    await this.page.waitForSelector('[role="listbox"]', { state: 'visible' });
    const label = TasksStatisticsPage.PERIOD_OPTIONS[period];
    await this.page.locator(`[role="option"]:has-text("${label}")`).click();
    await this.page.waitForLoadState('networkidle');
  }
}
