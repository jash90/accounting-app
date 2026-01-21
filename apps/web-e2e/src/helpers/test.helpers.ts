import { Page } from '@playwright/test';

/**
 * General test helper utilities
 */
export class TestHelpers {
  /**
   * Take screenshot with timestamp
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = Date.now();
    await page.screenshot({
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for specified time
   */
  static async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate random string
   */
  static randomString(length = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Generate unique timestamp-based ID
   */
  static uniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Format date for test data
   */
  static formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get local storage value
   */
  static async getLocalStorage(page: Page, key: string): Promise<string | null> {
    return await page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set local storage value
   */
  static async setLocalStorage(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
      ({ k, v }) => localStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Clear local storage
   */
  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.clear());
  }

  /**
   * Get session storage value
   */
  static async getSessionStorage(page: Page, key: string): Promise<string | null> {
    return await page.evaluate((k) => sessionStorage.getItem(k), key);
  }

  /**
   * Set session storage value
   */
  static async setSessionStorage(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
      ({ k, v }) => sessionStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Check if running in CI
   */
  static isCI(): boolean {
    return process.env.CI === 'true' || !!process.env.CI;
  }

  /**
   * Get environment variable
   */
  static getEnv(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  /**
   * Execute with retry
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt}/${maxAttempts} failed:`, error);

        if (attempt < maxAttempts) {
          await this.wait(delay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Scroll to element
   */
  static async scrollToElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Check if element is in viewport
   */
  static async isInViewport(page: Page, selector: string): Promise<boolean> {
    return await page.locator(selector).isVisible();
  }

  /**
   * Get element attribute
   */
  static async getAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    return await page.locator(selector).getAttribute(attribute);
  }

  /**
   * Check if page has error
   */
  static async hasPageError(page: Page): Promise<boolean> {
    const errors = await page.evaluate(() => {
      return (window as any).__pageErrors || [];
    });

    return errors.length > 0;
  }

  /**
   * Mock API response
   */
  static async mockAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    responseData: any,
    status = 200
  ): Promise<void> {
    await page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Block API calls
   */
  static async blockAPI(page: Page, urlPattern: string | RegExp): Promise<void> {
    await page.route(urlPattern, (route) => route.abort());
  }

  /**
   * Intercept and log API calls
   */
  static async interceptAPI(page: Page, urlPattern: string | RegExp): Promise<void> {
    page.on('request', (request) => {
      const url = request.url();
      const matches =
        typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);

      if (matches) {
        console.log(`API Request: ${request.method()} ${url}`);
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      const matches =
        typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);

      if (matches) {
        console.log(`API Response: ${response.status()} ${url}`);
      }
    });
  }
}
