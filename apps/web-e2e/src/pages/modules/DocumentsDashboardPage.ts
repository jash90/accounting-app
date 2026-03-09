import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * DocumentsDashboardPage - Page Object for Documents module dashboard
 * Handles the dashboard at /modules/documents (or /company/modules/documents)
 */
export class DocumentsDashboardPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly dashboardTitle = 'h1:has-text("Dokumenty")';
  private readonly templatesLink =
    'a:has-text("Szablony dokumentów"), a:has-text("Zarządzaj szablonami")';
  private readonly generatedLink =
    'a:has-text("Wygenerowane dokumenty"), a:has-text("Zobacz historię")';
  private readonly navigationCard = '[class*="card"], [data-testid="navigation-card"]';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(basePath: string = '/company/modules/documents'): Promise<void> {
    await super.goto(basePath);
    await this.waitForPageLoad();
  }

  async expectToBeOnDashboard(): Promise<void> {
    await this.expectVisible(this.dashboardTitle);
  }

  getStatCard(title: string): Locator {
    return this.page.locator(`${this.navigationCard}:has-text("${title}")`);
  }

  async navigateToTemplates(): Promise<void> {
    await this.click(this.templatesLink);
    await this.waitForPageLoad();
  }

  async navigateToGenerated(): Promise<void> {
    await this.click(this.generatedLink);
    await this.waitForPageLoad();
  }

  async expectNavigationCards(): Promise<void> {
    await expect(this.page.getByText('Szablony dokumentów')).toBeVisible();
    await expect(this.page.getByText('Wygenerowane dokumenty')).toBeVisible();
  }
}
