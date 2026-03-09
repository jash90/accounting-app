import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * AppearanceSettingsPage - Page Object for appearance/theme settings
 */
export class AppearanceSettingsPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'text=Wygląd';
  private readonly lightThemeOption =
    'button:has-text("Jasny"), [data-testid="theme-light"], label:has-text("Jasny")';
  private readonly darkThemeOption =
    'button:has-text("Ciemny"), [data-testid="theme-dark"], label:has-text("Ciemny")';
  private readonly systemThemeOption =
    'button:has-text("Systemowy"), [data-testid="theme-system"], label:has-text("Systemowy")';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly activeThemeIndicator =
    '[data-state="active"], [aria-pressed="true"], .bg-primary';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/settings/appearance');
    await this.waitForPageLoad();
  }

  async expectToBeOnAppearancePage(): Promise<void> {
    await this.expectURLContains('/settings/appearance');
    await this.expectVisible(this.pageTitle);
  }

  async selectTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    const themeSelectors: Record<string, string> = {
      light: this.lightThemeOption,
      dark: this.darkThemeOption,
      system: this.systemThemeOption,
    };
    await this.click(themeSelectors[theme]);
  }

  async getCurrentTheme(): Promise<string> {
    const html = this.page.locator('html');
    const classList = await html.getAttribute('class');
    if (classList?.includes('dark')) return 'dark';
    return 'light';
  }

  async expectThemeApplied(theme: 'light' | 'dark' | 'system'): Promise<void> {
    const html = this.page.locator('html');
    if (theme === 'dark') {
      await expect(html).toHaveAttribute('class', /dark/);
    } else if (theme === 'light') {
      const classList = await html.getAttribute('class');
      expect(classList).not.toContain('dark');
    }
    // 'system' depends on OS preference — skip strict assertion
  }

  async saveSettings(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }
}
