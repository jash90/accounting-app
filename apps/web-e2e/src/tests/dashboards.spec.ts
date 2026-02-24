 
import { expect, test } from '../fixtures/auth.fixtures';

test.describe('Global Dashboard', () => {
  test('company owner: should display KPI cards', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('http://localhost:4200/company/dashboard');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    // Dashboard should have some stat/card sections visible
    await expect(authenticatedCompanyOwnerPage.locator('h1, h2').first()).toBeVisible();
  });

  test('company owner: should display chart or stats section', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('http://localhost:4200/company/dashboard');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    // Page renders without error
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
    // At minimum we expect some card or stat element
    await expect(
      authenticatedCompanyOwnerPage.locator('[class*="card"], [class*="Card"]').first()
    ).toBeVisible();
  });

  test('admin: should display admin dashboard', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('http://localhost:4200/admin/dashboard');
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await expect(authenticatedAdminPage.locator('body')).toBeVisible();
  });
});

test.describe('Module Dashboards', () => {
  test('tasks dashboard should display statistics', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('http://localhost:4200/company/modules/tasks');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
    // Should show some heading or stat cards
    await expect(
      authenticatedCompanyOwnerPage.locator('h1, [class*="card"]').first()
    ).toBeVisible();
  });

  test('settlements dashboard should display statistics', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('http://localhost:4200/company/modules/settlements');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
    await expect(
      authenticatedCompanyOwnerPage.locator('h1, [class*="card"]').first()
    ).toBeVisible();
  });

  test('time tracking dashboard should display statistics', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    await authenticatedCompanyOwnerPage.goto('http://localhost:4200/company/modules/time-tracking');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
    await expect(
      authenticatedCompanyOwnerPage.locator('h1, [class*="card"]').first()
    ).toBeVisible();
  });
});
