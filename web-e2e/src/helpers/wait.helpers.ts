import { Page, Locator } from '@playwright/test';

/**
 * Advanced waiting helpers for complex scenarios
 */
export class WaitHelpers {
  /**
   * Wait for element to be stable (no position changes)
   */
  static async waitForStable(locator: Locator, timeout = 5000): Promise<void> {
    let lastBox = await locator.boundingBox();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const currentBox = await locator.boundingBox();

      if (!currentBox || !lastBox) continue;

      if (
        currentBox.x === lastBox.x &&
        currentBox.y === lastBox.y &&
        currentBox.width === lastBox.width &&
        currentBox.height === lastBox.height
      ) {
        return;
      }

      lastBox = currentBox;
    }

    throw new Error('Element did not stabilize within timeout');
  }

  /**
   * Wait for network to be idle
   */
  static async waitForNetworkIdle(page: Page, timeout = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for specific API call to complete
   */
  static async waitForAPICall(
    page: Page,
    urlPattern: string | RegExp,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
  ): Promise<void> {
    await page.waitForResponse(
      (response) => {
        const matchesURL =
          typeof urlPattern === 'string'
            ? response.url().includes(urlPattern)
            : urlPattern.test(response.url());

        const matchesMethod = response.request().method() === method;

        return matchesURL && matchesMethod;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Wait for element count to match expected
   */
  static async waitForElementCount(
    locator: Locator,
    expectedCount: number,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const count = await locator.count();

      if (count === expectedCount) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Expected ${expectedCount} elements, but timeout reached`);
  }

  /**
   * Wait for element to contain text
   */
  static async waitForText(locator: Locator, text: string, timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const content = await locator.textContent();

      if (content && content.includes(text)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Element did not contain text "${text}" within timeout`);
  }

  /**
   * Wait for condition to be true
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 5000,
    pollInterval = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Condition not met within timeout');
  }

  /**
   * Wait for page to navigate
   */
  static async waitForNavigation(page: Page, urlPattern?: string | RegExp): Promise<void> {
    if (urlPattern) {
      await page.waitForURL(urlPattern, { timeout: 10000 });
    } else {
      await page.waitForLoadState('networkidle');
    }
  }

  /**
   * Wait for animation to complete
   */
  static async waitForAnimation(locator: Locator): Promise<void> {
    // Wait for animations to complete
    await locator.evaluate((element) => {
      return Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      );
    });
  }

  /**
   * Wait with retry
   */
  static async waitWithRetry<T>(
    action: () => Promise<T>,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('Action failed after retries');
  }

  /**
   * Wait for local storage item
   */
  static async waitForLocalStorage(
    page: Page,
    key: string,
    expectedValue?: string,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const value = await page.evaluate((k) => localStorage.getItem(k), key);

      if (expectedValue === undefined && value !== null) {
        return;
      }

      if (value === expectedValue) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Local storage key "${key}" did not match expected value within timeout`);
  }

  /**
   * Wait for console message
   */
  static async waitForConsoleMessage(
    page: Page,
    messagePattern: string | RegExp,
    type: 'log' | 'info' | 'error' | 'warning' = 'log',
    timeout = 5000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Console message "${messagePattern}" not found within timeout`));
      }, timeout);

      const handler = (msg: any) => {
        if (msg.type() === type) {
          const text = msg.text();
          const matches =
            typeof messagePattern === 'string'
              ? text.includes(messagePattern)
              : messagePattern.test(text);

          if (matches) {
            clearTimeout(timeoutId);
            page.off('console', handler);
            resolve();
          }
        }
      };

      page.on('console', handler);
    });
  }
}
