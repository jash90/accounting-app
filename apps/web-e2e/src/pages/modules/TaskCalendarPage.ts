import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TaskCalendarPage - Page Object for Tasks Calendar view at /modules/tasks/calendar
 */
export class TaskCalendarPage extends BasePage {
  private readonly calendarContainer: Locator;
  private readonly nextMonthButton: Locator;
  private readonly prevMonthButton: Locator;
  private readonly monthLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.calendarContainer = page.locator(
      '[data-testid="calendar"], [class*="calendar"], .fc, [role="grid"]'
    );
    this.nextMonthButton = page.getByRole('button', {
      name: /następny|next|›|»/i,
    });
    this.prevMonthButton = page.getByRole('button', {
      name: /poprzedni|prev|‹|«/i,
    });
    this.monthLabel = page
      .locator('[data-testid="month-label"], .fc-toolbar-title, h2, [class*="month"]')
      .first();
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/calendar`);
    await this.waitForPageLoad();
  }

  async expectToBeOnCalendarPage(): Promise<void> {
    await this.expectURLContains('calendar');
  }

  async expectCalendarVisible(): Promise<void> {
    await expect(this.calendarContainer.first()).toBeVisible();
  }

  async navigateToNextMonth(): Promise<void> {
    await this.nextMonthButton.first().click();
    await this.waitForPageLoad();
  }

  async navigateToPrevMonth(): Promise<void> {
    await this.prevMonthButton.first().click();
    await this.waitForPageLoad();
  }

  async getCurrentMonthLabel(): Promise<string> {
    return (await this.monthLabel.textContent()) || '';
  }

  async expectTaskOnDate(title: string): Promise<void> {
    await expect(this.page.getByText(title).first()).toBeVisible();
  }

  async clickDate(day: number): Promise<void> {
    const dayCell = this.page
      .locator(`td[data-date], [class*="day"]`, { hasText: String(day) })
      .first();
    await dayCell.click();
  }
}
