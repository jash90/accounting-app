import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

/**
 * AIAgentChatPage - Page Object for AI Agent chat interface
 *
 * Provides methods for:
 * - Navigation and page verification
 * - Conversation management (create, select, delete)
 * - Message sending and verification
 * - Token count verification
 * - Console error monitoring
 */
export class AIAgentChatPage extends BasePage {
  readonly nav: NavigationComponent;

  // Selectors - using data-testid when available, fallback to other selectors
  private readonly selectors = {
    // Page elements
    pageTitle: '[data-testid="ai-assistant-title"], h1:has-text("AI Assistant")',
    conversationsTitle: '[data-testid="conversations-title"], text=Conversations',
    loadingIndicator: '[data-testid="loading"], text=Loading...',

    // Conversation sidebar
    conversationsSidebar: '[data-testid="conversations-sidebar"], .w-80',
    newChatButton: '[data-testid="new-chat-button"], button:has(svg.lucide-plus)',
    conversationItem: '[data-testid="conversation-item"], [role="button"]',
    conversationTitle: '[data-testid="conversation-title"], .font-medium',
    deleteConversationButton: '[data-testid="delete-conversation-button"], button:has(svg.lucide-trash-2)',
    noConversationsMessage: '[data-testid="no-conversations"], text=No conversations yet',

    // Chat area
    chatArea: '[data-testid="chat-area"], .flex-1.flex.flex-col',
    messageInput: '[data-testid="message-input"], input[placeholder="Type your message..."]',
    sendButton: '[data-testid="send-button"], button[type="submit"]',
    messagesContainer: '[data-testid="messages-container"], .space-y-4',

    // Messages
    userMessage: '[data-testid="user-message"], .justify-end .rounded-lg',
    assistantMessage: '[data-testid="assistant-message"], .justify-start .rounded-lg',
    thinkingIndicator: '[data-testid="thinking-indicator"], text=Thinking...',
    tokenCount: '[data-testid="token-count"], text=/\\d+ tokens/',
    emptyChat: '[data-testid="empty-chat"], text=Start a conversation',
  };

  // Console monitoring
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];
  private networkErrors: string[] = [];

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationComponent(page);
  }

  /**
   * Navigate to AI Agent chat page
   */
  async goto(): Promise<void> {
    await super.goto('/modules/ai-agent/chat');
    await this.waitForPageLoad();
  }

  /**
   * Wait for chat interface to load
   */
  async waitForChatInterface(): Promise<void> {
    await this.page.waitForSelector(this.selectors.pageTitle, { state: 'visible', timeout: 10000 });
    await this.page.waitForSelector(this.selectors.conversationsTitle, { state: 'visible', timeout: 10000 });
  }

  /**
   * Start monitoring console for errors
   */
  startConsoleMonitoring(): void {
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.networkErrors = [];

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        this.consoleWarnings.push(msg.text());
      }
    });

    this.page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/api/modules/ai-agent')) {
        this.networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
  }

  /**
   * Get collected console errors
   */
  getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  /**
   * Get collected console warnings
   */
  getConsoleWarnings(): string[] {
    return [...this.consoleWarnings];
  }

  /**
   * Get collected network errors
   */
  getNetworkErrors(): string[] {
    return [...this.networkErrors];
  }

  /**
   * Check for nested button warnings
   */
  hasNestedButtonWarnings(): boolean {
    return this.consoleWarnings.some(
      (w) =>
        w.includes('cannot be a descendant of') ||
        w.includes('cannot contain a nested') ||
        (w.includes('button') && w.includes('error'))
    );
  }

  /**
   * Check for 500 errors
   */
  has500Errors(): boolean {
    return this.networkErrors.some((req) => req.startsWith('500'));
  }

  // ==================
  // Conversation Management
  // ==================

  /**
   * Create a new conversation
   */
  async createNewConversation(): Promise<void> {
    const newChatButton = this.page.locator(this.selectors.newChatButton).first();
    await newChatButton.click();
    await this.page.waitForTimeout(500); // Wait for conversation to be created
  }

  /**
   * Select a conversation by title
   */
  async selectConversation(title: string): Promise<void> {
    const conversation = this.page
      .locator(this.selectors.conversationItem)
      .filter({ hasText: title })
      .first();
    await conversation.click();
    await this.page.waitForTimeout(300); // Wait for messages to load
  }

  /**
   * Delete a conversation by title
   */
  async deleteConversation(title: string): Promise<void> {
    const conversation = this.page
      .locator(this.selectors.conversationItem)
      .filter({ hasText: title })
      .first();

    // Hover to show delete button
    await conversation.hover();

    // Click delete button
    const deleteButton = conversation.locator(this.selectors.deleteConversationButton);
    await deleteButton.click();

    // Handle confirmation dialog
    this.page.once('dialog', (dialog) => dialog.accept());

    await this.page.waitForTimeout(500); // Wait for deletion
  }

  /**
   * Get all conversation titles
   */
  async getConversationTitles(): Promise<string[]> {
    const items = this.page.locator(this.selectors.conversationItem);
    const count = await items.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await items.nth(i).locator(this.selectors.conversationTitle).textContent();
      if (title) titles.push(title.trim());
    }

    return titles;
  }

  /**
   * Get conversation count
   */
  async getConversationCount(): Promise<number> {
    return await this.page.locator(this.selectors.conversationItem).count();
  }

  /**
   * Check if conversation exists
   */
  async conversationExists(title: string): Promise<boolean> {
    const conversation = this.page
      .locator(this.selectors.conversationItem)
      .filter({ hasText: title });
    return (await conversation.count()) > 0;
  }

  // ==================
  // Messaging
  // ==================

  /**
   * Send a message
   */
  async sendMessage(content: string): Promise<void> {
    const input = this.page.locator(this.selectors.messageInput);
    await input.fill(content);

    const sendButton = this.page.locator(this.selectors.sendButton);
    await sendButton.click();
  }

  /**
   * Wait for AI response
   */
  async waitForResponse(timeout = 30000): Promise<void> {
    // Wait for "Thinking..." to appear and then disappear
    try {
      await this.page.waitForSelector(this.selectors.thinkingIndicator, {
        state: 'visible',
        timeout: 5000,
      });
    } catch {
      // Thinking indicator might not appear if response is very fast
    }

    await this.page.waitForSelector(this.selectors.thinkingIndicator, {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * Send a message and wait for response
   */
  async sendMessageAndWait(content: string, timeout = 30000): Promise<void> {
    await this.sendMessage(content);

    // Wait for user message to appear
    await expect(this.page.locator(`text=${content}`)).toBeVisible({ timeout: 10000 });

    // Wait for AI response
    await this.waitForResponse(timeout);
  }

  /**
   * Get all messages in current conversation
   */
  async getMessages(): Promise<Array<{ role: 'user' | 'assistant'; content: string; tokens: number }>> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string; tokens: number }> = [];

    const userMessages = this.page.locator(this.selectors.userMessage);
    const assistantMessages = this.page.locator(this.selectors.assistantMessage);

    // Get user messages
    for (let i = 0; i < (await userMessages.count()); i++) {
      const content = (await userMessages.nth(i).locator('p').first().textContent()) || '';
      const tokenText = (await userMessages.nth(i).locator('.opacity-70').textContent()) || '';
      const tokenMatch = tokenText.match(/(\d+) tokens/);
      messages.push({
        role: 'user',
        content: content.trim(),
        tokens: tokenMatch ? parseInt(tokenMatch[1]) : 0,
      });
    }

    // Get assistant messages
    for (let i = 0; i < (await assistantMessages.count()); i++) {
      const content = (await assistantMessages.nth(i).locator('p').first().textContent()) || '';
      const tokenText = (await assistantMessages.nth(i).locator('.opacity-70').textContent()) || '';
      const tokenMatch = tokenText.match(/(\d+) tokens/);
      messages.push({
        role: 'assistant',
        content: content.trim(),
        tokens: tokenMatch ? parseInt(tokenMatch[1]) : 0,
      });
    }

    return messages;
  }

  /**
   * Get the last message
   */
  async getLastMessage(): Promise<{ role: 'user' | 'assistant'; content: string; tokens: number } | null> {
    const messages = await this.getMessages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  /**
   * Check if message input is enabled
   */
  async isMessageInputEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.messageInput).isEnabled();
  }

  /**
   * Check if send button is enabled
   */
  async isSendButtonEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.sendButton).isEnabled();
  }

  // ==================
  // Token Verification
  // ==================

  /**
   * Get token count from the last message
   */
  async getLastMessageTokenCount(): Promise<number> {
    const tokenText = this.page.locator(this.selectors.tokenCount).last();
    const text = await tokenText.textContent();
    const match = text?.match(/(\d+) tokens/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Verify token count is displayed and valid
   */
  async expectTokenCountDisplayed(): Promise<void> {
    const tokenText = this.page.locator(this.selectors.tokenCount);
    await expect(tokenText.first()).toBeVisible();

    const count = await this.getLastMessageTokenCount();
    expect(count).toBeGreaterThan(0);
  }

  // ==================
  // Assertions
  // ==================

  /**
   * Expect to be on AI Agent chat page
   */
  async expectToBeOnChatPage(): Promise<void> {
    await this.expectURLContains('/modules/ai-agent/chat');
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible();
  }

  /**
   * Expect empty chat state
   */
  async expectEmptyChat(): Promise<void> {
    await expect(this.page.locator(this.selectors.emptyChat)).toBeVisible();
  }

  /**
   * Expect conversation to be visible
   */
  async expectConversationVisible(title: string): Promise<void> {
    const conversation = this.page
      .locator(this.selectors.conversationItem)
      .filter({ hasText: title });
    await expect(conversation.first()).toBeVisible();
  }

  /**
   * Expect conversation to be hidden/deleted
   */
  async expectConversationHidden(title: string): Promise<void> {
    const conversation = this.page
      .locator(this.selectors.conversationItem)
      .filter({ hasText: title });
    await expect(conversation).toBeHidden({ timeout: 5000 });
  }

  /**
   * Expect message to be visible
   */
  async expectMessageVisible(content: string): Promise<void> {
    await expect(this.page.locator(`text=${content}`)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Expect no console errors about specific topic
   */
  async expectNoConsoleErrors(topic?: string): Promise<void> {
    if (topic) {
      const relevantErrors = this.consoleErrors.filter((e) =>
        e.toLowerCase().includes(topic.toLowerCase())
      );
      expect(relevantErrors).toHaveLength(0);
    } else {
      expect(this.consoleErrors).toHaveLength(0);
    }
  }

  /**
   * Expect no network errors
   */
  async expectNoNetworkErrors(): Promise<void> {
    expect(this.networkErrors).toHaveLength(0);
  }

  /**
   * Expect no nested button warnings
   */
  async expectNoNestedButtonWarnings(): Promise<void> {
    expect(this.hasNestedButtonWarnings()).toBe(false);
  }
}
