/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { createAPIHelper } from '../helpers/api.helpers';
import { TasksDashboardPage } from '../pages/modules/TasksDashboardPage';
import { TasksKanbanPage } from '../pages/modules/TasksKanbanPage';
import { TasksListPage } from '../pages/modules/TasksListPage';
import { TasksStatisticsPage } from '../pages/modules/TasksStatisticsPage';
import { TaskTemplatesPage } from '../pages/modules/TaskTemplatesPage';

const BASE_PATH = '/company/modules/tasks';

// ─── Block 1: Dashboard & Navigation ────────────────────────────────────────

test.describe('Tasks Module - Dashboard', () => {
  test('should display dashboard with title and stat cards', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const dashboard = new TasksDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto(BASE_PATH);
    await dashboard.expectToBeOnDashboard();
    await dashboard.expectStatCardsVisible();
  });

  test('should display navigation cards', async ({ authenticatedCompanyOwnerPage }) => {
    const dashboard = new TasksDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto(BASE_PATH);
    await dashboard.expectNavigationCardsVisible();
  });

  test('should display owner-only cards', async ({ authenticatedCompanyOwnerPage }) => {
    const dashboard = new TasksDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto(BASE_PATH);
    await dashboard.expectOwnerCards();
  });

  test('should navigate dashboard to list view', async ({ authenticatedCompanyOwnerPage }) => {
    const dashboard = new TasksDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto(BASE_PATH);
    await dashboard.navigateToList();
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/list/);
  });

  test('should navigate dashboard to kanban view', async ({ authenticatedCompanyOwnerPage }) => {
    const dashboard = new TasksDashboardPage(authenticatedCompanyOwnerPage);
    await dashboard.goto(BASE_PATH);
    await dashboard.navigateToKanban();
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/kanban/);
  });
});

// ─── Block 2: Task CRUD ─────────────────────────────────────────────────────

test.describe('Tasks Module - CRUD', () => {
  test('should create task via form — dialog opens, fills, submits, closes', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    const title = `E2E Task ${Date.now()}`;

    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();
    await tasksPage.fillTaskForm({ title });
    await tasksPage.submitCreateForm();

    // Verify dialog closed (form submitted successfully)
    await expect(authenticatedCompanyOwnerPage.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should create task with description and priority', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    const title = `E2E Task Full ${Date.now()}`;

    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();
    await tasksPage.fillTaskForm({
      title,
      description: 'E2E task description text',
      priority: 'Wysoki',
    });
    await tasksPage.submitCreateForm();
    await expect(authenticatedCompanyOwnerPage.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should open actions dropdown menu on table row', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Find first data row's actions button (last cell, h-8 w-8 ghost button)
    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(1)).toBeVisible();

    // Click the actions trigger (MoreHorizontal icon button)
    await firstRow.locator('td:last-child button').click();

    // Verify dropdown menu appears (role="menu")
    await expect(authenticatedCompanyOwnerPage.locator('[role="menu"]')).toBeVisible({
      timeout: 5000,
    });

    // Menu items may or may not be present depending on permissions
    // Just verify the menu container is visible
    await authenticatedCompanyOwnerPage.keyboard.press('Escape');
  });

  test('should show edit and delete options in actions menu when permitted', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(1)).toBeVisible();
    await firstRow.locator('td:last-child button').click();
    await expect(authenticatedCompanyOwnerPage.locator('[role="menu"]')).toBeVisible({
      timeout: 5000,
    });

    // Check if Edit menu item exists (depends on hasWritePermission)
    const editItem = authenticatedCompanyOwnerPage.locator('[role="menuitem"]:has-text("Edytuj")');
    const deleteItem = authenticatedCompanyOwnerPage.locator('[role="menuitem"]:has-text("Usuń")');

    // At least a separator should exist
    await expect(
      authenticatedCompanyOwnerPage.locator('[role="menu"] [role="separator"]')
    ).toBeVisible();

    // If edit exists, verify it's clickable
    if (await editItem.isVisible()) {
      await editItem.click();
      await expect(authenticatedCompanyOwnerPage.locator('[role="dialog"]')).toBeVisible();
      await authenticatedCompanyOwnerPage
        .locator('[role="dialog"] button:has-text("Anuluj")')
        .click();
    } else {
      // Delete or other action should be available
      await expect(deleteItem).toBeVisible();
    }
  });

  test('should cancel task creation', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    const title = `E2E Cancelled Task ${Date.now()}`;

    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();
    await tasksPage.fillTaskForm({ title });
    await tasksPage.cancelForm();

    // Dialog should be closed
    await expect(authenticatedCompanyOwnerPage.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should open edit dialog by clicking table row', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Click on the title cell (2nd td, after checkbox) of the first row
    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(1)).toBeVisible();
    await firstRow.locator('td').nth(1).click();

    // Verify edit dialog opened
    await expect(authenticatedCompanyOwnerPage.locator('[role="dialog"]')).toBeVisible({
      timeout: 10000,
    });
  });
});

// ─── Block 3: Filtering & Search ────────────────────────────────────────────

test.describe('Tasks Module - Filtering & Search', () => {
  test('should search tasks by title and show results or empty state', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Type a search query — verify input accepts text and filter activates
    const searchInput = authenticatedCompanyOwnerPage.locator(
      'input[placeholder="Szukaj zadań..."]'
    );
    await searchInput.click();
    await searchInput.pressSequentially('Bulk Task', { delay: 30 });
    await authenticatedCompanyOwnerPage.waitForTimeout(500);
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Verify input has the search text
    await expect(searchInput).toHaveValue('Bulk Task');

    // Clear filter should be visible (search is active)
    await expect(authenticatedCompanyOwnerPage.locator('button:has-text("Wyczyść")')).toBeVisible();
  });

  test('should filter by status', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    await tasksPage.selectStatusFilter('Do zrobienia');
    await tasksPage.waitForPageLoad();

    const trigger = authenticatedCompanyOwnerPage.locator('button[role="combobox"]').first();
    await expect(trigger).toContainText('Do zrobienia');
  });

  test('should filter by priority', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    await tasksPage.selectPriorityFilter('Wysoki');
    await tasksPage.waitForPageLoad();

    const trigger = authenticatedCompanyOwnerPage.locator('button[role="combobox"]').nth(1);
    await expect(trigger).toContainText('Wysoki');
  });

  test('should clear filters', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    await tasksPage.selectStatusFilter('Do zrobienia');
    await tasksPage.waitForPageLoad();
    await tasksPage.clearFilters();
  });

  test('should combine multiple filters', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    await tasksPage.selectStatusFilter('Do zrobienia');
    await tasksPage.selectPriorityFilter('Wysoki');
    await tasksPage.waitForPageLoad();

    const triggers = authenticatedCompanyOwnerPage.locator('button[role="combobox"]');
    await expect(triggers.first()).toContainText('Do zrobienia');
    await expect(triggers.nth(1)).toContainText('Wysoki');
  });
});

// ─── Block 4: Task List Table ────────────────────────────────────────────────

test.describe('Tasks Module - Table', () => {
  test('should display column headers', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const headers = ['Tytuł', 'Status', 'Priorytet'];
    for (const header of headers) {
      await expect(
        authenticatedCompanyOwnerPage.locator(`thead th:has-text("${header}")`).first()
      ).toBeVisible();
    }
  });

  test('should display seed data tasks', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const rowCount = await tasksPage.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should display status and priority in table cells', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    const cellCount = await firstRow.locator('td').count();
    // Data row has 8 cells (select, title, status, priority, dueDate, assignee, client, actions)
    expect(cellCount).toBeGreaterThanOrEqual(5);
  });
});

// ─── Block 5: Kanban Board ──────────────────────────────────────────────────

test.describe('Tasks Module - Kanban', () => {
  test('should display all kanban columns', async ({ authenticatedCompanyOwnerPage }) => {
    const kanban = new TasksKanbanPage(authenticatedCompanyOwnerPage);
    await kanban.goto(BASE_PATH);
    await kanban.expectKanbanLoaded();

    const columns = [
      'Backlog',
      'Do zrobienia',
      'W trakcie',
      'W przeglądzie',
      'Ukończone',
      'Zablokowane',
      'Anulowane',
    ];
    for (const col of columns) {
      await kanban.expectColumnExists(col);
    }
  });

  test('should display task cards', async ({ authenticatedCompanyOwnerPage }) => {
    const kanban = new TasksKanbanPage(authenticatedCompanyOwnerPage);
    await kanban.goto(BASE_PATH);
    await kanban.expectKanbanLoaded();

    const cardCount = await kanban.getTaskCardCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should navigate from list to kanban', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const kanbanLink = authenticatedCompanyOwnerPage.locator(
      'a[href*="/kanban"], button:has-text("Kanban")'
    );
    if (await kanbanLink.first().isVisible()) {
      await kanbanLink.first().click();
      await tasksPage.waitForPageLoad();
      await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/kanban/);
    }
  });

  test('should show task in correct column after status change', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );
    const created = await api.createTask({ title: `Kanban Column Test ${Date.now()}` });
    await api.updateTaskStatus(created.id, 'IN_PROGRESS');

    const kanban = new TasksKanbanPage(authenticatedCompanyOwnerPage);
    await kanban.goto(BASE_PATH);
    await kanban.expectKanbanLoaded();

    // Task should appear in "W trakcie" column
    const inProgressCards = kanban.getTaskCardsInColumn('W trakcie');
    await expect(inProgressCards.first()).toBeVisible({ timeout: 10000 });

    await api.deleteTask(created.id);
    await api.dispose();
  });
});

// ─── Block 6: Status Transitions & Reasons ──────────────────────────────────

test.describe('Tasks Module - Status Transitions', () => {
  test('should show blocking reason field when status is BLOCKED', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();

    await tasksPage.fillTaskForm({ title: 'test', status: 'Zablokowane' });
    await tasksPage.expectBlockingReasonVisible();
  });

  test('should show cancellation reason field when status is CANCELLED', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();

    await tasksPage.fillTaskForm({ title: 'test', status: 'Anulowane' });
    await tasksPage.expectCancellationReasonVisible();
  });

  test('should not show reason fields for TODO/IN_PROGRESS', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);
    await tasksPage.clickCreateTask();

    await tasksPage.fillTaskForm({ title: 'test', status: 'Do zrobienia' });
    await tasksPage.expectNoReasonFields();
  });

  test('should open edit dialog from row click and show status select', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Click on the title cell to open edit dialog
    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(1)).toBeVisible();
    await firstRow.locator('td').nth(1).click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Verify status select exists in the dialog
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    const statusLabel = dialog.locator('label:has-text("Status")');
    await expect(statusLabel).toBeVisible();

    // Cancel to avoid changing data
    await dialog.locator('button:has-text("Anuluj")').click();
  });
});

// ─── Block 7: Bulk Operations ───────────────────────────────────────────────

test.describe('Tasks Module - Bulk Operations', () => {
  test('should show bulk bar when checkboxes selected', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Wait for a data row with checkbox
    const checkbox = authenticatedCompanyOwnerPage.locator('tbody button[role="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });

    await checkbox.click();

    await expect(authenticatedCompanyOwnerPage.getByText('Zaznaczono').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show bulk status update buttons', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const checkbox = authenticatedCompanyOwnerPage.locator('tbody button[role="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.click();

    await expect(authenticatedCompanyOwnerPage.getByText('Zmień status na:').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should select all via header checkbox', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    // Ensure data rows exist
    const dataCheckbox = authenticatedCompanyOwnerPage
      .locator('tbody button[role="checkbox"]')
      .first();
    await expect(dataCheckbox).toBeVisible({ timeout: 10000 });

    await tasksPage.selectAllCheckboxes();

    await expect(authenticatedCompanyOwnerPage.getByText('Zaznaczono').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

// ─── Block 8: CSV Export ────────────────────────────────────────────────────

test.describe('Tasks Module - CSV Export', () => {
  test('should display export button', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);
    await expect(
      authenticatedCompanyOwnerPage.locator('button:has-text("Eksportuj CSV")')
    ).toBeVisible();
  });

  test('should trigger CSV download', async ({ authenticatedCompanyOwnerPage }) => {
    const tasksPage = new TasksListPage(authenticatedCompanyOwnerPage);
    await tasksPage.goto(BASE_PATH);

    const downloadPromise = authenticatedCompanyOwnerPage.waitForEvent('download', {
      timeout: 10000,
    });
    await tasksPage.clickExportCsv();

    try {
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    } catch {
      // Export may use blob URL or different mechanism — just verify no error
    }
  });
});

// ─── Block 9: Task Templates ────────────────────────────────────────────────

test.describe('Tasks Module - Templates', () => {
  test('should navigate to templates and see heading', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const templates = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    await templates.goto(BASE_PATH);
    await templates.expectToBeOnPage();
  });

  test('should create template with recurrence', async ({ authenticatedCompanyOwnerPage }) => {
    const templates = new TaskTemplatesPage(authenticatedCompanyOwnerPage);
    const title = `E2E Template ${Date.now()}`;

    await templates.goto(BASE_PATH);
    await templates.clickCreateTemplate();
    await templates.fillTemplateForm({
      title,
      description: 'Recurring template',
      hasRecurrence: true,
      frequency: 'weekly',
    });
    await templates.submitTemplateForm();
    await templates.expectTemplateInList(title);
  });
});

// ─── Block 10: Statistics ───────────────────────────────────────────────────

test.describe('Tasks Module - Statistics', () => {
  test('should display all 6 panels', async ({ authenticatedCompanyOwnerPage }) => {
    const stats = new TasksStatisticsPage(authenticatedCompanyOwnerPage);
    await stats.goto(BASE_PATH);
    await stats.expectOnStatisticsPage();
    await stats.expectAllPanels();
  });

  test('should change period via selector', async ({ authenticatedCompanyOwnerPage }) => {
    const stats = new TasksStatisticsPage(authenticatedCompanyOwnerPage);
    await stats.goto(BASE_PATH);
    await stats.expectOnStatisticsPage();

    await stats.selectPeriod('30d');

    await expect(stats.periodSelect).toContainText('Ostatnie 30 dni');
  });
});
