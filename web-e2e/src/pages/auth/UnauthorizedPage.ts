import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * UnauthorizedPage - Handles unauthorized (403) page interactions
 */
export class UnauthorizedPage extends BasePage {
  // Selectors
  private readonly heading = 'h1, h2';
  private readonly message = '[data-testid="unauthorized-message"], p';
  private readonly backButton = 'button:has-text("Go Back"), a:has-text("Go Back")';
  private readonly homeButton = 'button:has-text("Home"), a:has-text("Home")';
  private readonly loginButton = 'button:has-text("Login"), a:has-text("Login")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to unauthorized page
   */
  async goto(): Promise<void> {
    await super.goto('/unauthorized');
    await this.waitForPageLoad();
  }

  /**
   * Wait for unauthorized page to load
   */
  async waitForUnauthorizedPage(): Promise<void> {
    await this.waitForVisible(this.heading);
  }

  /**
   * Check if on unauthorized page
   */
  async expectToBeOnUnauthorizedPage(): Promise<void> {
    await this.expectURL('/unauthorized');
    await this.expectVisible(this.heading);
  }

  /**
   * Get page heading
   */
  async getHeading(): Promise<string> {
    return await this.getText(this.heading);
  }

  /**
   * Get unauthorized message
   */
  async getMessage(): Promise<string> {
    return await this.getText(this.message);
  }

  /**
   * Expect heading contains "Unauthorized" or "403"
   */
  async expectUnauthorizedHeading(): Promise<void> {
    const heading = await this.getHeading();
    const containsUnauthorized = heading.toLowerCase().includes('unauthorized') ||
                                  heading.includes('403') ||
                                  heading.toLowerCase().includes('access denied');

    expect(containsUnauthorized).toBe(true);
  }

  /**
   * Click go back button
   */
  async clickGoBack(): Promise<void> {
    await this.click(this.backButton);
  }

  /**
   * Click home button
   */
  async clickHome(): Promise<void> {
    await this.click(this.homeButton);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.click(this.loginButton);
  }

  /**
   * Check if back button is visible
   */
  async isBackButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.backButton);
  }

  /**
   * Check if home button is visible
   */
  async isHomeButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.homeButton);
  }

  /**
   * Check if login button is visible
   */
  async isLoginButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.loginButton);
  }

  /**
   * Expect message contains specific text
   */
  async expectMessageContains(text: string): Promise<void> {
    await this.expectText(this.message, text);
  }

  /**
   * Go back using browser history
   */
  async goBackInHistory(): Promise<void> {
    await this.goBack();
  }
}
