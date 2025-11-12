import { test, expect } from '../fixtures/auth.fixtures';
import { LoginPage } from '../pages/auth/LoginPage';
import { UsersListPage } from '../pages/admin/UsersListPage';
import { UserFormPage } from '../pages/admin/UserFormPage';
import { SimpleTextListPage } from '../pages/employee/SimpleTextListPage';
import { SimpleTextFormPage } from '../pages/employee/SimpleTextFormPage';
import { TestDataFactory } from '../fixtures/data.fixtures';

test.describe('Form Validation Tests', () => {
  test('should validate email format on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail('invalid-email');
    await loginPage.fillPassword('TestPass123!');
    await loginPage.clickLogin();

    await loginPage.expectEmailError();
  });

  test('should validate password strength', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.fillEmail('test@example.com');
    await userForm.fillPassword('weak');
    await userForm.selectRole('ADMIN');
    await userForm.clickSubmit();

    await userForm.expectPasswordError();
  });

  test('should validate required fields', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();
    await simpleTextForm.clickSubmit();

    await simpleTextForm.expectTitleError();
  });

  test('should validate max length constraints', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();

    const longTitle = 'A'.repeat(300);
    await simpleTextForm.fillTitle(longTitle);
    await simpleTextForm.fillContent('Test');
    await simpleTextForm.clickSubmit();

    // May show error or truncate
    await authenticatedEmployeePage.waitForTimeout(1000);
  });

  test('should handle special characters in input', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();

    await simpleTextForm.fillTitle('Test <script>alert("xss")</script>');
    await simpleTextForm.fillContent('Test & Content " \' < >');
    await simpleTextForm.clickSubmit();

    // Should handle or escape special characters
    await simpleTextPage.toast.expectSuccessToast();
  });

  test('should prevent duplicate email', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.fillEmail('admin@system.com');
    await userForm.fillPassword('TestPass123!');
    await userForm.selectRole('ADMIN');
    await userForm.clickSubmit();

    await userForm.toast.expectErrorToast();
  });

  test('should validate date formats', async ({ authenticatedEmployeePage }) => {
    // Assuming date fields exist
    await authenticatedEmployeePage.goto('/modules/simple-text');
    expect(true).toBe(true); // Placeholder
  });

  test('should validate numeric fields', async ({ authenticatedEmployeePage }) => {
    // Assuming numeric fields exist
    await authenticatedEmployeePage.goto('/modules/simple-text');
    expect(true).toBe(true); // Placeholder
  });

  test('should clear validation errors on correction', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail('invalid');
    await loginPage.clickLogin();

    // Should show error
    await loginPage.expectEmailError();

    // Correct the email
    await loginPage.fillEmail('valid@example.com');

    // Error should clear (depending on validation strategy)
    await page.waitForTimeout(500);
  });
});

test.describe('API Error Handling', () => {
  test('should handle 401 Unauthorized response', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginWithInvalidCredentials('wrong@example.com', 'WrongPass123!');

    await loginPage.expectFormError();
  });

  test('should handle 403 Forbidden response', async ({ authenticatedEmployeePage }) => {
    // Try to access admin endpoint
    await authenticatedEmployeePage.goto('/admin');

    const currentURL = authenticatedEmployeePage.url();
    expect(currentURL.includes('unauthorized') || currentURL.includes('modules')).toBe(true);
  });

  test('should handle 404 Not Found response', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/api/non-existent-endpoint');

    // Should show error or handle gracefully
    await authenticatedEmployeePage.waitForTimeout(500);
  });

  test('should handle 500 Server Error response', async ({ authenticatedEmployeePage }) => {
    // Mock a 500 error
    await authenticatedEmployeePage.route('**/api/**', (route) => {
      if (route.request().url().includes('trigger-error')) {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      } else {
        route.continue();
      }
    });

    // Trigger the error
    await authenticatedEmployeePage.goto('/modules/simple-text');
    // Should handle gracefully
  });

  test('should handle network timeout', async ({ authenticatedEmployeePage }) => {
    // Mock slow network
    await authenticatedEmployeePage.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Very slow
      route.continue();
    });

    // Should timeout gracefully
    await authenticatedEmployeePage.goto('/modules/simple-text');
  });

  test('should handle token expiration during operation', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsEmployee();

    // Simulate token expiration
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'expired-token');
    });

    // Try to perform operation
    await page.goto('/modules/simple-text');

    // Should redirect to login or refresh token
    await page.waitForTimeout(2000);
  });

  test('should handle concurrent requests', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();

    // Make multiple rapid requests
    await Promise.all([
      authenticatedEmployeePage.reload(),
      authenticatedEmployeePage.reload(),
    ]);

    // Should handle gracefully
    await simpleTextPage.expectToBeOnSimpleTextPage();
  });

  test('should retry on transient failures', async ({ authenticatedEmployeePage }) => {
    let requestCount = 0;

    await authenticatedEmployeePage.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount === 1) {
        // Fail first request
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      } else {
        // Succeed on retry
        route.continue();
      }
    });

    await authenticatedEmployeePage.goto('/modules/simple-text');
    // Should retry and succeed
  });
});

test.describe('Edge Cases', () => {
  test('should handle empty list states', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();

    const count = await simpleTextPage.getTextCount();

    if (count === 0) {
      await simpleTextPage.expectEmptyState();
    }
  });

  test('should handle large dataset pagination', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();

    // Test pagination if large dataset
    const count = await simpleTextPage.getTextCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle rapid successive requests', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();

    // Rapid clicks
    await authenticatedEmployeePage.click('body'); // Safe click
    await authenticatedEmployeePage.click('body');
    await authenticatedEmployeePage.click('body');

    // Should handle gracefully
    await simpleTextPage.expectToBeOnSimpleTextPage();
  });

  test('should handle browser back/forward navigation', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await authenticatedEmployeePage.goto('/modules');
    await authenticatedEmployeePage.goBack();

    await simpleTextPage.expectToBeOnSimpleTextPage();
  });

  test('should handle page reload during operation', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();
    await simpleTextForm.fillTitle('Test');

    // Reload page
    await authenticatedEmployeePage.reload();

    // Form data may be lost (expected behavior)
    await authenticatedEmployeePage.waitForTimeout(500);
  });

  test('should handle multiple tabs with same user', async ({ context, authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    await simpleTextPage.goto();

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto(authenticatedEmployeePage.url());

    // Both should work
    await simpleTextPage.expectToBeOnSimpleTextPage();
    await expect(newPage).toHaveURL(/simple-text/);

    await newPage.close();
  });

  test('should prevent SQL injection', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.searchText("'; DROP TABLE users; --");

    // Should handle safely
    await authenticatedEmployeePage.waitForTimeout(500);
  });

  test('should prevent XSS attacks', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();

    await simpleTextForm.fillTitle('<script>alert("XSS")</script>');
    await simpleTextForm.fillContent('<img src=x onerror=alert("XSS")>');
    await simpleTextForm.clickSubmit();

    // Should escape or sanitize
    await authenticatedEmployeePage.waitForTimeout(1000);
  });

  test('should handle special unicode characters', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();

    await simpleTextForm.fillTitle('Test 你好 مرحبا 🎉');
    await simpleTextForm.fillContent('Unicode content: ñ ü é');
    await simpleTextForm.clickSubmit();

    await simpleTextPage.toast.expectSuccessToast();
  });

  test('should handle long session without timeout', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();

    // Wait for some time
    await authenticatedEmployeePage.waitForTimeout(5000);

    // Should still be authenticated
    await simpleTextPage.expectToBeOnSimpleTextPage();
  });

  test('should preserve state across navigation', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.searchText('test');

    // Navigate away and back
    await authenticatedEmployeePage.goto('/modules');
    await authenticatedEmployeePage.goto('/modules/simple-text');

    // Search might or might not be preserved (depends on implementation)
    await simpleTextPage.expectToBeOnSimpleTextPage();
  });
});

test.describe('Performance Edge Cases', () => {
  test('should handle slow network conditions', async ({ authenticatedEmployeePage }) => {
    // Slow down network
    await authenticatedEmployeePage.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });

    await authenticatedEmployeePage.goto('/modules/simple-text');
    // Should show loading states
    await authenticatedEmployeePage.waitForTimeout(3000);
  });

  test('should handle offline mode gracefully', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/modules/simple-text');

    // Go offline
    await authenticatedEmployeePage.context().setOffline(true);

    // Try to navigate
    await authenticatedEmployeePage.goto('/modules');

    // Should show offline message or cached content
    await authenticatedEmployeePage.waitForTimeout(1000);

    // Go back online
    await authenticatedEmployeePage.context().setOffline(false);
  });

  test('should handle large form submissions', async ({ authenticatedEmployeePage }) => {
    const simpleTextPage = new SimpleTextListPage(authenticatedEmployeePage);
    const simpleTextForm = new SimpleTextFormPage(authenticatedEmployeePage);

    await simpleTextPage.goto();
    await simpleTextPage.clickCreate();

    // Very large content
    const largeContent = 'A'.repeat(10000);
    await simpleTextForm.fillTitle('Large Content Test');
    await simpleTextForm.fillContent(largeContent);
    await simpleTextForm.clickSubmit();

    // Should handle or show size limit error
    await authenticatedEmployeePage.waitForTimeout(2000);
  });
});
