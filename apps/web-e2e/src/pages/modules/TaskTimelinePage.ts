import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TaskTimelinePage - Page Object for Tasks Timeline view at /modules/tasks/timeline
 */
export class TaskTimelinePage extends BasePage {
  private readonly timelineContainer: Locator;

  constructor(page: Page) {
    super(page);
    this.timelineContainer = page
      .locator('[data-testid="timeline"], [class*="timeline"], [role="list"]')
      .first();
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/timeline`);
    await this.waitForPageLoad();
  }

  async expectToBeOnTimelinePage(): Promise<void> {
    await this.expectURLContains('timeline');
  }

  async expectTimelineVisible(): Promise<void> {
    await expect(this.timelineContainer).toBeVisible();
  }

  async expectTaskInTimeline(title: string): Promise<void> {
    await expect(this.page.getByText(title).first()).toBeVisible();
  }

  async getTimelineItems(): Promise<Locator> {
    return this.page.locator(
      '[data-testid="timeline-item"], [class*="timeline-item"], [role="listitem"]'
    );
  }
}
