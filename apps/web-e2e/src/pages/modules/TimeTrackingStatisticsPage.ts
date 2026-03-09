import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TimeTrackingStatisticsPage - Page Object for Time Tracking Statistics subpage
 * Handles 3 stat panels and period preset buttons
 */
export class TimeTrackingStatisticsPage extends BasePage {
  readonly pageTitle: Locator;

  // Panel titles as defined in time-tracking-statistics.tsx
  static readonly PANEL_TITLES = [
    'Najdłuższe zadania (czas)',
    'Najdłuższe rozliczenia (czas)',
    'Czas pracowników',
  ] as const;

  // Period button labels
  static readonly PERIOD_LABELS: Record<'30d' | '90d' | '365d', string> = {
    '30d': '30 dni',
    '90d': '90 dni',
    '365d': 'Rok',
  };

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByText('Statystyki logowania czasu').first();
  }

  override async goto(basePath: string = '/company/modules/time-tracking'): Promise<void> {
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
   * Assert all 3 panel titles are visible on the page
   */
  async expectAllPanels(): Promise<void> {
    for (const title of TimeTrackingStatisticsPage.PANEL_TITLES) {
      await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 15000 });
    }
  }

  /**
   * Select a time period preset using the period buttons
   */
  async selectPeriod(preset: '30d' | '90d' | '365d'): Promise<void> {
    const label = TimeTrackingStatisticsPage.PERIOD_LABELS[preset];
    await this.page.getByRole('button', { name: label, exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the period button locator for a given preset
   */
  getPeriodButton(preset: '30d' | '90d' | '365d'): Locator {
    const label = TimeTrackingStatisticsPage.PERIOD_LABELS[preset];
    return this.page.getByRole('button', { name: label, exact: true });
  }
}
