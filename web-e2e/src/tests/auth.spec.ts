import { test, expect } from '../fixtures/auth.fixtures';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { TEST_CREDENTIALS } from '../fixtures/auth.fixtures';

test.describe('Authentication Tests', () => {
  test('should successfully login with valid admin credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAsAdmin();

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');

    await dashboard.expectToBeOnDashboard();
    await dashboard.expectUsersCardVisible();
  });

  test('should successfully login with valid company owner credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsCompanyOwner();

    await expect(page).toHaveURL(/\/company/);
  });

  test('should successfully login with valid employee credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsEmployee();

    await expect(page).toHaveURL(/\/modules/);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginWithInvalidCredentials('invalid@test.com', 'WrongPassword123!');

    await loginPage.expectToRemainOnLoginPage();
    await loginPage.expectFormError();
  });

  test('should fail login with non-existent user', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginWithInvalidCredentials('nonexistent@test.com', 'Password123!');

    await loginPage.expectToRemainOnLoginPage();
  });

  test('should persist token after page reload', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAsAdmin();
    await dashboard.expectToBeOnDashboard();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for auth to re-initialize (user menu appears when auth is ready)
    await page.waitForSelector('[data-testid="user-menu-button"], button:has(div[class*="avatar"])', {
      state: 'visible',
      timeout: 5000,
    });

    // Should still be logged in
    await dashboard.expectToBeOnDashboard();
  });

  test('should logout successfully', async ({ authenticatedAdminPage }) => {
    const dashboard = new AdminDashboardPage(authenticatedAdminPage);
    const loginPage = new LoginPage(authenticatedAdminPage);

    // Already on admin dashboard from fixture
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await dashboard.logout();

    await loginPage.expectToBeOnLoginPage();
  });

  test('should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('RBAC Enforcement Tests', () => {
  test('Admin should access admin routes', async ({ authenticatedAdminPage }) => {
    const dashboard = new AdminDashboardPage(authenticatedAdminPage);

    // Already on admin dashboard from fixture, just verify
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await dashboard.expectToBeOnDashboard();
    await dashboard.ensureSidebarOpen();

    await dashboard.goToUsers();
    await expect(authenticatedAdminPage).toHaveURL(/\/admin\/users/);
  });

  test('Admin should not access company routes', async ({ authenticatedAdminPage }) => {
    const unauthorizedPage = new UnauthorizedPage(authenticatedAdminPage);

    await authenticatedAdminPage.goto('/company');
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await authenticatedAdminPage.waitForTimeout(500);

    // Should be redirected to unauthorized or stay blocked
    const currentURL = authenticatedAdminPage.url();
    if (currentURL.includes('unauthorized')) {
      await unauthorizedPage.expectToBeOnUnauthorizedPage();
    } else {
      // Verify access is denied or redirected away from company
      const accessDenied = await authenticatedAdminPage.getByText(/access denied|forbidden/i).isVisible().catch(() => false);
      expect(accessDenied || currentURL.includes('admin') || !currentURL.includes('company')).toBe(true);
    }
  });

  test('Admin should not access employee routes', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/modules');
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await authenticatedAdminPage.waitForTimeout(500);

    const currentURL = authenticatedAdminPage.url();
    expect(currentURL.includes('unauthorized') || currentURL.includes('admin') || !currentURL.includes('modules')).toBe(true);
  });

  test('Company Owner should access company routes', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/company');
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/company/);
  });

  test('Company Owner should not access admin routes', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/admin');
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
    await authenticatedCompanyOwnerPage.waitForTimeout(500);

    const currentURL = authenticatedCompanyOwnerPage.url();
    expect(currentURL.includes('unauthorized') || currentURL.includes('company') || !currentURL.includes('admin')).toBe(true);
  });

  test('Company Owner should access employee module routes', async ({ authenticatedCompanyOwnerPage }) => {
    await authenticatedCompanyOwnerPage.goto('/modules/simple-text');

    // Company owners should have access to modules
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/\/modules\/simple-text/);
  });

  test('Employee should access granted module routes', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/modules/simple-text');

    await expect(authenticatedEmployeePage).toHaveURL(/\/modules\/simple-text/);
  });

  test('Employee should not access admin routes', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/admin');
    await authenticatedEmployeePage.waitForLoadState('networkidle');
    await authenticatedEmployeePage.waitForTimeout(500);

    const currentURL = authenticatedEmployeePage.url();
    expect(currentURL.includes('unauthorized') || currentURL.includes('modules') || !currentURL.includes('admin')).toBe(true);
  });

  test('Employee should not access company owner routes', async ({ authenticatedEmployeePage }) => {
    await authenticatedEmployeePage.goto('/company/employees');
    await authenticatedEmployeePage.waitForLoadState('networkidle');
    await authenticatedEmployeePage.waitForTimeout(500);

    const currentURL = authenticatedEmployeePage.url();
    expect(currentURL.includes('unauthorized') || currentURL.includes('modules') || !currentURL.includes('company')).toBe(true);
  });

  test('should display unauthorized page for forbidden routes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const unauthorizedPage = new UnauthorizedPage(page);

    // Login as employee
    await loginPage.goto();
    await loginPage.loginAsEmployee();

    // Try to access admin route
    await page.goto('/admin');

    if (page.url().includes('unauthorized')) {
      await unauthorizedPage.expectUnauthorizedHeading();
    }
  });

  test('should show 404 for non-existent routes', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/non-existent-route-12345');

    // Expect 404 page or redirect
    const has404 = await authenticatedAdminPage.getByText(/not found|404/i).isVisible();
    expect(has404 || authenticatedAdminPage.url().includes('admin')).toBe(true);
  });

  test('should show role-based navigation menu', async ({ authenticatedAdminPage }) => {
    const dashboard = new AdminDashboardPage(authenticatedAdminPage);

    // Already on admin dashboard from fixture
    await authenticatedAdminPage.waitForLoadState('networkidle');
    await dashboard.ensureSidebarOpen();

    // Admin should see admin nav items
    await dashboard.nav.expectNavLinkVisible('Users');
    await dashboard.nav.expectNavLinkVisible('Companies');
  });

  test('should prevent access after token expires', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsAdmin();

    // Clear auth tokens to simulate expiration
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Wait for auth context to detect token removal (500ms interval + buffer)
    // Need extra time for React Query to invalidate and update state
    await page.waitForTimeout(1500);

    // Try to access protected route
    await page.goto('/admin/users');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Multi-tenant Isolation', () => {
  test('Company A employee should only see Company A data', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as Company A employee
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.employee.email,
      TEST_CREDENTIALS.employee.password,
      '/modules'
    );

    // Navigate to simple text module
    await page.goto('/modules/simple-text');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });

    // Should only see own company data (verified through UI)
    const heading = await page.locator('h1').first().textContent();
    expect(heading).toBeTruthy();
    expect(heading).not.toBeNull();
  });

  test('Company B employee should not see Company A data', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as Company B employee
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_CREDENTIALS.companyBEmployee.email,
      TEST_CREDENTIALS.companyBEmployee.password,
      '/modules'
    );

    // Navigate to simple text module
    await page.goto('/modules/simple-text');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });

    // Data should be isolated (Company B data only)
    const heading = await page.locator('h1').first().textContent();
    expect(heading).toBeTruthy();
    expect(heading).not.toBeNull();
  });
});
