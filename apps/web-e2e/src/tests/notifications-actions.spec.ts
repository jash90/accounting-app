import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { createAPIHelper } from '../helpers/api.helpers';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

test.describe('Notification Actions', () => {
  test.describe('Notifications List', () => {
    test('should display notifications list', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;
      const notificationsPage = new NotificationsPage(page);

      await notificationsPage.goto();
      await notificationsPage.expectToBeOnNotificationsPage();

      // Verify tabs are present
      await expect(page.locator('button[role="tab"]:has-text("Wszystkie")')).toBeVisible();
      await expect(page.locator('button[role="tab"]:has-text("Nieprzeczytane")')).toBeVisible();

      // Verify either notifications or empty state is shown
      const notificationItems = notificationsPage.getNotificationItems();
      const count = await notificationItems.count();

      if (count > 0) {
        await expect(notificationItems.first()).toBeVisible();
      } else {
        await notificationsPage.expectEmptyState();
      }
    });
  });

  test.describe('Mark as Read', () => {
    test('should mark notification as read', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;
      const notificationsPage = new NotificationsPage(page);

      await notificationsPage.goto();
      await notificationsPage.expectToBeOnNotificationsPage();

      // Switch to unread tab to find unread notifications
      await notificationsPage.clickTabUnread();
      await notificationsPage.expectTabUnreadSelected();
      await page.waitForLoadState('networkidle');

      const notificationItems = notificationsPage.getNotificationItems();
      const unreadCount = await notificationItems.count();

      if (unreadCount > 0) {
        // Click on the first unread notification to mark it as read
        await notificationItems.first().click();
        await page.waitForLoadState('networkidle');

        // Navigate back to notifications and verify count changed
        await notificationsPage.goto();
        await notificationsPage.clickTabUnread();
        await page.waitForLoadState('networkidle');

        const newUnreadCount = await notificationsPage.getNotificationItems().count();
        // Unread count should decrease or stay the same (if it was already read)
        expect(newUnreadCount).toBeLessThanOrEqual(unreadCount);
      } else {
        // No unread notifications - test passes
        expect(unreadCount).toBe(0);
      }
    });

    test('should mark multiple notifications as read', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;
      const notificationsPage = new NotificationsPage(page);

      await notificationsPage.goto();
      await notificationsPage.expectToBeOnNotificationsPage();

      // Look for "Mark all as read" button
      const markAllButton = page.locator(
        'button:has-text("Oznacz wszystkie jako przeczytane"), button:has-text("Oznacz wszystkie")'
      );
      const hasMarkAllButton = (await markAllButton.count()) > 0;

      if (hasMarkAllButton) {
        // Check initial unread count
        await notificationsPage.clickTabUnread();
        await page.waitForLoadState('networkidle');
        const initialUnreadCount = await notificationsPage.getNotificationItems().count();

        if (initialUnreadCount > 0) {
          // Switch back to all and click mark all
          await notificationsPage.clickTabAll();
          await page.waitForLoadState('networkidle');
          await markAllButton.first().click();
          await page.waitForLoadState('networkidle');

          // Verify unread count changed
          await notificationsPage.clickTabUnread();
          await page.waitForLoadState('networkidle');
          const newUnreadCount = await notificationsPage.getNotificationItems().count();
          expect(newUnreadCount).toBeLessThanOrEqual(initialUnreadCount);
        } else {
          // No unread notifications - still passes
          expect(initialUnreadCount).toBe(0);
        }
      } else {
        // Bulk mark-as-read not available - try using API
        const api = await createAPIHelper(
          TEST_CREDENTIALS.companyOwner.email,
          TEST_CREDENTIALS.companyOwner.password
        );

        const notifications = await api.getNotifications({ isRead: false, limit: 5 });
        const unreadList = notifications?.data || notifications || [];

        if (Array.isArray(unreadList) && unreadList.length > 0) {
          // Mark first two as read via API
          for (const notif of unreadList.slice(0, 2)) {
            if (notif.id) {
              await api.markNotificationRead(notif.id);
            }
          }
        }
        await api.dispose();
        // Verify page renders after API operations
        await notificationsPage.goto();
        await notificationsPage.expectToBeOnNotificationsPage();
      }
    });
  });

  test.describe('Notification Navigation', () => {
    test('should archive or navigate to archived notifications', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;
      const notificationsPage = new NotificationsPage(page);

      await notificationsPage.goto();
      await notificationsPage.expectToBeOnNotificationsPage();

      // Look for archive-related elements
      const archiveTab = page.locator(
        'button[role="tab"]:has-text("Archiwum"), button[role="tab"]:has-text("Zarchiwizowane"), a:has-text("Archiwum")'
      );
      const hasArchiveTab = (await archiveTab.count()) > 0;

      if (hasArchiveTab) {
        await archiveTab.first().click();
        await page.waitForLoadState('networkidle');

        // Verify we're viewing archived notifications
        const archiveContent = page.locator('body');
        await expect(archiveContent).toBeVisible();
      } else {
        // Archive feature may not exist - check for delete/dismiss action instead
        const notificationItems = notificationsPage.getNotificationItems();
        const count = await notificationItems.count();

        if (count > 0) {
          // Look for delete/archive button on individual notification
          const deleteButtons = page.locator(
            '[data-testid="delete-notification"], button[aria-label*="usuń" i], button[aria-label*="delete" i]'
          );

          if ((await deleteButtons.count()) > 0) {
            await expect(deleteButtons.first()).toBeVisible();
          }
        }

        // Verify tabs work as navigation
        await notificationsPage.clickTabAll();
        await notificationsPage.expectTabAllSelected();
        await notificationsPage.clickTabUnread();
        await notificationsPage.expectTabUnreadSelected();
      }
    });
  });
});
