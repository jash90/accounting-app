import { Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * AiConfigurationPage - Page Object for AI Agent configuration module
 */
export class AiConfigurationPage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly configTitle = 'text=Konfiguracja agenta AI';
  private readonly apiKeyInput = 'input[name="apiKey"], #apiKey';
  private readonly modelSelect = '#model, [name="model"]';
  private readonly maxTokensInput = 'input[name="maxTokens"], #maxTokens';
  private readonly saveButton = 'button:has-text("Zapisz")';
  private readonly tokenUsageLink =
    'a:has-text("Użycie tokenów"), button:has-text("Użycie tokenów")';
  private readonly contextLink = 'a:has-text("Kontekst"), button:has-text("Kontekst")';
  private readonly currentModelText = '[data-testid="current-model"], text=Aktualny model';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/admin/modules/ai-agent/configuration');
    await this.waitForPageLoad();
  }

  async expectToBeOnConfigPage(): Promise<void> {
    await this.expectURLContains('/ai-agent/configuration');
    await this.expectVisible(this.configTitle);
  }

  getApiKeyField() {
    return this.page.locator(this.apiKeyInput);
  }

  async setApiKey(key: string): Promise<void> {
    const input = this.page.locator(this.apiKeyInput);
    await input.clear();
    await input.fill(key);
  }

  async setModel(model: string): Promise<void> {
    await this.page.locator(this.modelSelect).click();
    await this.page.waitForSelector('[role="listbox"], [role="option"]', { state: 'visible' });
    await this.page.locator(`[role="option"]:has-text("${model}")`).click();
  }

  async setMaxTokens(tokens: string): Promise<void> {
    const input = this.page.locator(this.maxTokensInput);
    await input.clear();
    await input.fill(tokens);
  }

  async saveConfiguration(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async expectSaveSuccess(): Promise<void> {
    await this.toast.expectSuccessToast();
  }

  async expectCurrentModel(): Promise<string> {
    return await this.getText(this.currentModelText);
  }

  async navigateToTokenUsage(): Promise<void> {
    await this.click(this.tokenUsageLink);
    await this.waitForPageLoad();
  }

  async navigateToContext(): Promise<void> {
    await this.click(this.contextLink);
    await this.waitForPageLoad();
  }
}
