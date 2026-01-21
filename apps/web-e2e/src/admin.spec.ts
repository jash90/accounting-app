import { test, expect } from '@playwright/test';

test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4200/login');
    
    // Login as admin (assuming seeded data)
    await page.fill('[name="email"]', 'admin@system.com');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin dashboard
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin can view dashboard', async ({ page }) => {
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();
  });

  test('admin can navigate to users page', async ({ page }) => {
    await page.click('text=Users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('text=Users')).toBeVisible();
  });

  test('admin can create a user', async ({ page }) => {
    await page.goto('http://localhost:4200/admin/users');
    await page.click('text=Create User');
    
    await page.fill('[name="email"]', 'newuser@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="firstName"]', 'New');
    await page.fill('[name="lastName"]', 'User');
    
    await page.click('button:has-text("Create")');
    
    // Wait for success toast or table update
    await expect(page.locator('text=newuser@test.com')).toBeVisible({ timeout: 5000 });
  });

  test('admin can view companies', async ({ page }) => {
    await page.click('text=Companies');
    await expect(page).toHaveURL(/\/admin\/companies/);
    await expect(page.locator('text=Companies')).toBeVisible();
  });

  test('admin can view modules', async ({ page }) => {
    await page.click('text=Modules');
    await expect(page).toHaveURL(/\/admin\/modules/);
    await expect(page.locator('text=Modules')).toBeVisible();
  });
});

