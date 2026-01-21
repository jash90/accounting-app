import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Base class for all Page Object Models
 * Provides common methods and utilities shared across all pages
 */
export class BasePage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Check if current URL matches path
   */
  async expectURL(path: string): Promise<void> {
    await expect(this.page).toHaveURL(`${this.baseURL}${path}`);
  }

  /**
   * Check if current URL contains path
   */
  async expectURLContains(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * Wait for an element to be visible
   */
  async waitForVisible(selector: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible' });
  }

  /**
   * Wait for an element to be hidden
   */
  async waitForHidden(selector: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden' });
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * Fill an input field
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Type text into an input field (slower, character by character)
   */
  async type(selector: string, value: string): Promise<void> {
    await this.page.type(selector, value);
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  /**
   * Wait for a specific time (use sparingly)
   */
  async wait(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Press a keyboard key
   */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Hover over an element
   */
  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  /**
   * Select option from dropdown by value
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * Check a checkbox
   */
  async check(selector: string): Promise<void> {
    await this.page.check(selector);
  }

  /**
   * Uncheck a checkbox
   */
  async uncheck(selector: string): Promise<void> {
    await this.page.uncheck(selector);
  }

  /**
   * Get locator for an element
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Get locator by role
   */
  getByRole(role: 'button' | 'link' | 'heading' | 'textbox' | 'checkbox' | 'radio' | 'combobox', options?: { name?: string }): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get locator by text
   */
  getByText(text: string): Locator {
    return this.page.getByText(text);
  }

  /**
   * Get locator by label
   */
  getByLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * Get locator by placeholder
   */
  getByPlaceholder(placeholder: string): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  /**
   * Get locator by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Wait for API response
   */
  async waitForResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  /**
   * Wait for API request
   */
  async waitForRequest(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForRequest(urlPattern);
  }

  /**
   * Intercept API calls
   */
  async interceptAPI(urlPattern: string | RegExp, responseData: any): Promise<void> {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Expect element to be visible
   */
  async expectVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Expect element to be hidden
   */
  async expectHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  /**
   * Expect element to contain text
   */
  async expectText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  /**
   * Expect element to have exact text
   */
  async expectExactText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  /**
   * Expect element to be enabled
   */
  async expectEnabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeEnabled();
  }

  /**
   * Expect element to be disabled
   */
  async expectDisabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeDisabled();
  }

  /**
   * Expect input to have value
   */
  async expectValue(selector: string, value: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  /**
   * Expect element count
   */
  async expectCount(selector: string, count: number): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }
}
