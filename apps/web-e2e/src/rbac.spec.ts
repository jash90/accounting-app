import { test, expect } from '@playwright/test';

test.describe('RBAC Scenarios', () => {
  test('ADMIN cannot access business module data', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'admin@system.com');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Try to access ai-agent module
    await page.goto('http://localhost:4200/modules/ai-agent');

    // Should be redirected or see unauthorized message
    // This depends on backend implementation
    await expect(page).not.toHaveURL(/\/modules\/ai-agent/);
  });

  test('COMPANY_OWNER can manage employees', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'bartlomiej.zimny@onet.pl');
    await page.fill('[name="password"]', 'Owner123!');
    await page.click('button[type="submit"]');

    await page.click('text=Employees');
    await expect(page).toHaveURL(/\/company\/employees/);
    await expect(page.locator('text=Employees')).toBeVisible();
  });

  test('EMPLOYEE with read permission can view texts', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'bartlomiej.zimny@interia.pl');
    await page.fill('[name="password"]', 'Employee123!');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:4200/modules/ai-agent');
    await expect(page.locator('text=Simple Text')).toBeVisible();
  });

  test('EMPLOYEE without write permission cannot create text', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'bartlomiej.zimny@interia.pl'); // Only read permission
    await page.fill('[name="password"]', 'Employee123!');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:4200/modules/ai-agent');

    // Create button should not be visible
    await expect(page.locator('text=Create Text')).not.toBeVisible();
  });
});
