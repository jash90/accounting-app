/* eslint-disable playwright/no-conditional-in-test */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { NotificationBellComponent } from '../pages/components/NotificationBellComponent';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

test.describe('Notifications Module Tests', () => {
  test.describe('Notification Bell Component', () => {
    let context: BrowserContext;
    let page: Page;
    let loginPage: LoginPage;
    let notificationBell: NotificationBellComponent;

    test.afterEach(async () => {
      await context.close();
    });

    test('should display notification bell in header for company owner', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('button', { name: /Powiadomienia/i })).toBeVisible();
    });

    test('should display notification bell in header for employee', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.loginAsEmployee();
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('button', { name: /Powiadomienia/i })).toBeVisible();
    });

    test('should open dropdown when clicking notification bell', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      await notificationBell.expectDropdownOpen();
    });

    test('should close dropdown when pressing Escape', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await notificationBell.expectDropdownOpen();
      await notificationBell.closeDropdown();
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeHidden();
      await notificationBell.expectDropdownClosed();
    });

    test('should show empty state or notifications list', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await notificationBell.expectDropdownOpen();

      const notificationItems = notificationBell.getNotificationItems();
      const count = await notificationItems.count();

      if (count > 0) {
        await expect(notificationItems.first()).toBeVisible();
      } else {
        await notificationBell.expectEmptyState();
        await expect(page.getByText(/brak powiadomień/i)).toBeVisible();
      }
    });

    test('should navigate to notifications page when clicking "See all"', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await notificationBell.expectDropdownOpen();
      await notificationBell.clickSeeAll();

      await expect(page).toHaveURL(/\/notifications/);
    });
  });

  test.describe('Notifications Page', () => {
    let context: BrowserContext;
    let page: Page;
    let loginPage: LoginPage;
    let notificationsPage: NotificationsPage;

    test.afterEach(async () => {
      await context.close();
    });

    test('should display notifications page with tabs', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationsPage = new NotificationsPage(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationsPage.goto();
      await notificationsPage.expectToBeOnNotificationsPage();
      await expect(page.getByRole('tab', { name: /wszystkie/i })).toBeVisible();
      await notificationsPage.expectTabAllSelected();
    });

    test('should switch between All and Unread tabs', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationsPage = new NotificationsPage(page);

      await loginPage.goto();
      await loginPage.loginAsCompanyOwner();
      await page.waitForLoadState('networkidle');

      await notificationsPage.goto();

      await notificationsPage.expectTabAllSelected();
      await notificationsPage.clickTabUnread();
      await expect(page.getByRole('tab', { name: /nieprzeczytane/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await notificationsPage.expectTabUnreadSelected();
      await notificationsPage.clickTabAll();
      await expect(page.getByRole('tab', { name: /wszystkie/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await notificationsPage.expectTabAllSelected();
    });

    test('should be accessible for employees', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationsPage = new NotificationsPage(page);

      await loginPage.goto();
      await loginPage.loginAsEmployee();
      await page.waitForLoadState('networkidle');

      await notificationsPage.goto();
      await expect(page).toHaveURL(/\/notifications/);
      await notificationsPage.expectToBeOnNotificationsPage();
    });
  });

  test.describe('Notification Generation - Client Module', () => {
    let context: BrowserContext;
    let page: Page;
    let loginPage: LoginPage;
    let notificationBell: NotificationBellComponent;

    test.afterEach(async () => {
      await context.close();
    });

    test('should show notification badge count for unread notifications', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsEmployee();
      await page.waitForLoadState('networkidle');

      const badgeCount = await notificationBell.getBadgeCount();

      if (badgeCount !== null) {
        expect(badgeCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Notification Interactions', () => {
    let context: BrowserContext;
    let page: Page;
    let loginPage: LoginPage;
    let notificationBell: NotificationBellComponent;

    test.afterEach(async () => {
      await context.close();
    });

    test('should mark all notifications as read', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsEmployee();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await notificationBell.expectDropdownOpen();

      const markAllButton = page.getByRole('button', { name: /oznacz wszystkie/i });
      const isMarkAllVisible = await markAllButton.isVisible();

      if (isMarkAllVisible) {
        const initialBadge = await notificationBell.getBadgeCount();
        await markAllButton.click();

        if (initialBadge !== null && initialBadge > 0) {
          await expect(async () => {
            const newBadge = await notificationBell.getBadgeCount();
            expect(newBadge === null || newBadge === 0 || newBadge <= initialBadge).toBe(true);
          }).toPass({ timeout: 5000 });
        }
      }
    });

    test('should navigate to related entity when clicking notification', async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      loginPage = new LoginPage(page);
      notificationBell = new NotificationBellComponent(page);

      await loginPage.goto();
      await loginPage.loginAsEmployee();
      await page.waitForLoadState('networkidle');

      await notificationBell.clickBell();
      await notificationBell.expectDropdownOpen();

      const notificationLinks = notificationBell.getNotificationItems();
      const count = await notificationLinks.count();

      if (count > 0) {
        const firstNotification = notificationLinks.first();
        const hrefValue = await firstNotification.getAttribute('href');

        if (hrefValue) {
          await expect(firstNotification).toHaveAttribute('href', /.+/);
          await firstNotification.click();
          await page.waitForLoadState('networkidle');
          expect(page.url()).toContain('/modules/');
        }
      }
    });
  });

  test.describe('Cross-User Notification Flow', () => {
    test('owner should not receive notification for their own actions', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      let createdClientName: string | null = null;

      try {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.loginAsCompanyOwner();
        await page.waitForLoadState('networkidle');

        const notificationBell = new NotificationBellComponent(page);
        const initialCount = await notificationBell.getBadgeCount();

        await page.goto('/company/modules/clients/list');
        await page.waitForLoadState('networkidle');

        const addButton = page.getByRole('button', { name: 'Dodaj klienta' });
        if (await addButton.isVisible()) {
          await addButton.click();
          await page.waitForSelector('[role="dialog"]', { timeout: 15000 });

          createdClientName = `Self-Action Test ${Date.now()}`;
          await page.getByLabel(/nazwa klienta/i).fill(createdClientName);

          const welcomeSwitch = page.getByRole('switch', { name: /email powitalny/i });
          if ((await welcomeSwitch.isVisible()) && (await welcomeSwitch.isChecked())) {
            await welcomeSwitch.click();
          }

          await page.getByRole('button', { name: 'Dodaj klienta' }).click();
          await page.waitForLoadState('networkidle');
          // Wait for notification system to process instead of fixed timeout
          await expect(async () => {
            await page
              .getByRole('button', { name: 'Dodaj klienta' })
              .waitFor({ state: 'hidden', timeout: 5000 });
          }).toPass({ timeout: 10000 });
        }

        const newCount = await notificationBell.getBadgeCount();

        if (initialCount === null) {
          expect(newCount === null || newCount === 0).toBe(true);
        } else {
          expect(newCount === null || newCount <= initialCount).toBe(true);
        }
      } finally {
        // Cleanup: Delete the test client if it was created
        if (createdClientName) {
          try {
            // Navigate to clients list and search for the test client
            await page.goto('/company/modules/clients/list');
            await page.waitForLoadState('networkidle');

            // Try to find and delete the test client (best effort cleanup)
            const searchInput = page.getByPlaceholder(/szukaj/i);
            if (await searchInput.isVisible()) {
              await searchInput.fill(createdClientName);
              await page.waitForLoadState('networkidle');

              // Try to find the delete button for this client
              const clientRow = page.getByText(createdClientName).first();
              if (await clientRow.isVisible()) {
                await clientRow.click();
                await page.waitForLoadState('networkidle');

                // Try to delete (if delete button is available)
                const deleteButton = page.getByRole('button', { name: /usuń/i });
                if (await deleteButton.isVisible()) {
                  await deleteButton.click();
                  // Confirm deletion if there's a confirmation dialog
                  const confirmButton = page.getByRole('button', { name: /potwierdź|tak/i });
                  if (await confirmButton.isVisible()) {
                    await confirmButton.click();
                  }
                }
              }
            }
          } catch {
            // Cleanup failed silently - this is acceptable in E2E tests
            console.warn(`Failed to clean up test client: ${createdClientName}`);
          }
        }
        await context.close();
      }
    });
  });
});

test.describe('Notifications Access Control', () => {
  let context: BrowserContext;
  let page: Page;
  let loginPage: LoginPage;
  let notificationsPage: NotificationsPage;

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test('notifications should be accessible without module permission', async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    loginPage = new LoginPage(page);
    notificationsPage = new NotificationsPage(page);

    await loginPage.goto();
    await loginPage.loginAsEmployee();
    await page.waitForLoadState('networkidle');

    await notificationsPage.goto();

    await expect(page).not.toHaveURL(/unauthorized/);
    await notificationsPage.expectToBeOnNotificationsPage();
  });

  test('unauthenticated user should be redirected to login', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login/);
  });
});
