import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TimeTrackingReportsPage - Page Object for Time Tracking Reports at /modules/time-tracking/reports
 */
export class TimeTrackingReportsPage extends BasePage {
  private readonly reportTable: Locator;
  private readonly generateButton: Locator;
  private readonly startDateInput: Locator;
  private readonly endDateInput: Locator;
  private readonly clientSelect: Locator;
  private readonly reportTotal: Locator;

  constructor(page: Page) {
    super(page);
    this.reportTable = page.locator('table').first();
    this.generateButton = page.getByRole('button', {
      name: /generuj|generate|pokaż|show/i,
    });
    this.startDateInput = page.getByLabel(/od|start|początek/i).first();
    this.endDateInput = page.getByLabel(/do|end|koniec/i).first();
    this.clientSelect = page.locator(
      '[data-testid="client-select"], [name="clientId"], [aria-label*="Klient"]'
    );
    this.reportTotal = page
      .locator('[data-testid="report-total"], tfoot td, [class*="total"]')
      .first();
  }

  override async goto(basePath: string = '/company/modules/time-tracking'): Promise<void> {
    await super.goto(`${basePath}/reports`);
    await this.waitForPageLoad();
  }

  async expectToBeOnReportsPage(): Promise<void> {
    await this.expectURLContains('reports');
  }

  async selectDateRange(start: string, end: string): Promise<void> {
    await this.startDateInput.fill(start);
    await this.endDateInput.fill(end);
  }

  async selectClient(clientName: string): Promise<void> {
    await this.clientSelect.click();
    await this.page.waitForTimeout(300);

    const option = this.page.getByRole('option', { name: new RegExp(clientName, 'i') });
    if (await option.isVisible()) {
      await option.click();
    } else {
      // Fallback: try typing to filter then select
      const input = this.page.locator('[role="combobox"], input[type="search"]').first();
      if (await input.isVisible()) {
        await input.fill(clientName);
        await this.page.waitForTimeout(500);
        await this.page.locator(`[role="option"]:has-text("${clientName}")`).first().click();
      }
    }
  }

  async generateReport(): Promise<void> {
    await this.generateButton.click();
    await this.waitForPageLoad();
  }

  async expectReportTable(): Promise<void> {
    await expect(this.reportTable).toBeVisible();
  }

  async getReportTotal(): Promise<string> {
    return (await this.reportTotal.textContent()) || '';
  }

  async gotoByClient(
    basePath: string = '/company/modules/time-tracking',
    clientId?: string
  ): Promise<void> {
    const path = clientId
      ? `${basePath}/reports/by-client/${clientId}`
      : `${basePath}/reports/by-client`;
    await super.goto(path);
    await this.waitForPageLoad();
  }

  async expectByClientReport(): Promise<void> {
    await this.expectURLContains('by-client');
    await expect(this.reportTable).toBeVisible();
  }
}
