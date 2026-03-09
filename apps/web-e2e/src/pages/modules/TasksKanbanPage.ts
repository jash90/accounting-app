import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

/**
 * TasksKanbanPage - Page Object for Tasks Kanban board
 * Handles kanban columns, task cards, drag-and-drop, and reason dialogs
 */
export class TasksKanbanPage extends BasePage {
  readonly kanbanContainer: Locator;
  readonly reasonDialog: Locator;
  readonly reasonTextarea: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.kanbanContainer = page
      .locator('[class*="overflow-x-auto"], [class*="flex"][class*="gap"]')
      .first();
    this.reasonDialog = page.locator('[role="alertdialog"]');
    this.reasonTextarea = page.locator('[role="alertdialog"] textarea');
    this.confirmButton = page.locator('[role="alertdialog"] button:has-text("Potwierdź")');
    this.cancelButton = page.locator('[role="alertdialog"] button:has-text("Anuluj")');
  }

  override async goto(basePath: string = '/company/modules/tasks'): Promise<void> {
    await super.goto(`${basePath}/kanban`);
  }

  /**
   * Verify that a column with a given label exists in the kanban board
   */
  async expectColumnExists(label: string): Promise<void> {
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible();
  }

  /**
   * Get all task cards within a specific column by column status label
   */
  getTaskCardsInColumn(statusLabel: string): Locator {
    return this.page
      .locator(`[class*="flex-col"]:has-text("${statusLabel}")`)
      .locator('[draggable="true"], [class*="cursor-grab"]');
  }

  /**
   * Check that the reason dialog is visible
   */
  async expectReasonDialogVisible(): Promise<void> {
    await expect(this.reasonDialog).toBeVisible();
  }

  /**
   * Fill reason text and click confirm
   */
  async fillReasonAndConfirm(reason: string): Promise<void> {
    await this.reasonTextarea.fill(reason);
    await this.confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cancel the reason dialog
   */
  async cancelReasonDialog(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.reasonDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if reason dialog is visible
   */
  async isReasonDialogVisible(): Promise<boolean> {
    return await this.reasonDialog.isVisible();
  }

  /**
   * Get the count of task cards visible on the kanban board
   * dnd-kit uses useSortable (no `draggable="true"`); instead look for the drag handle buttons
   */
  async getTaskCardCount(): Promise<number> {
    // Drag handles have cursor-grab class; one per task card
    return await this.page.locator('[class*="cursor-grab"]').count();
  }

  /**
   * Expect the kanban board to have columns loaded
   */
  async expectKanbanLoaded(): Promise<void> {
    // The kanban should show at least 1 column header
    await expect(this.page.getByText('Backlog', { exact: true }).first()).toBeVisible();
  }
}
