import { expect, test } from '../fixtures/auth.fixtures';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';

test.describe('ZUS Module - Company Owner Workflows', () => {
  test.describe('Dashboard', () => {
    test('should display ZUS dashboard with statistics', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to ZUS module
      await page.goto(`${BASE_URL}/company/modules/zus`);
      await page.waitForLoadState('networkidle');

      // Verify page header contains "Moduł ZUS"
      await expect(page.locator('h1').first()).toContainText(/Moduł ZUS/i);

      // Verify statistics cards are present
      const statsSection = page.locator('[class*="grid"]').first();
      await expect(statsSection).toBeVisible();

      // Check for quick action cards - use more specific selector to avoid sidebar
      const quickActionsCard = page.locator('main').getByText('Rozliczenia', { exact: true });
      await expect(quickActionsCard).toBeVisible();
    });

    test('should navigate to contributions list from dashboard', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus`);
      await page.waitForLoadState('networkidle');

      // Click on the Rozliczenia quick action card in the main content area
      // React Router Link uses "to" but renders as "href" with resolved path
      // The card with CardTitle "Rozliczenia" - find the link wrapping it
      const rozliczeniaCard = page
        .locator('main')
        .getByRole('link')
        .filter({ has: page.getByText('Rozliczenia', { exact: true }) })
        .first();
      await rozliczeniaCard.click();

      // Verify navigation to contributions list
      await expect(page).toHaveURL(/\/zus\/contributions/);
    });
  });

  test.describe('Contributions List', () => {
    test('should display contributions list with filters', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions`);
      await page.waitForLoadState('networkidle');

      // Verify page header
      await expect(page.locator('h1').first()).toContainText(/Rozliczenia ZUS/i);

      // Verify table or empty state is shown
      const tableOrEmpty = page.locator('table, :text("Brak rozliczeń ZUS")').first();
      await expect(tableOrEmpty).toBeVisible();
    });

    test('should have status filter in contributions list', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions`);
      await page.waitForLoadState('networkidle');

      // Verify filters card is present with title "Filtry"
      await expect(page.getByText('Filtry')).toBeVisible();

      // The Select component uses button with role=combobox - check for Status filter trigger
      // Look for select trigger that contains "Status" or "Wszystkie statusy"
      const statusFilterTrigger = page.getByRole('combobox').nth(1); // Second combobox after search
      await expect(statusFilterTrigger).toBeVisible();

      // Verify page header
      await expect(page.locator('h1').first()).toContainText(/Rozliczenia/i);
    });
  });

  test.describe('Create Contribution', () => {
    test('should navigate to create contribution page', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions/create`);
      await page.waitForLoadState('networkidle');

      // Verify page header
      await expect(page.locator('h1').first()).toContainText(/Oblicz składki ZUS/i);

      // Verify form elements - client select is a combobox (Radix Select)
      const clientSelect = page.getByRole('combobox', { name: /Klient/i });
      await expect(clientSelect).toBeVisible();
    });

    test('should show validation error when no client selected', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions/create`);
      await page.waitForLoadState('networkidle');

      // Try to submit without selecting client
      const submitButton = page.getByRole('button', { name: /Oblicz składki/i });
      await submitButton.click();

      // Should show validation error - the label gets text-destructive class on validation error
      // Also look for the form message with validation error
      const validationError = page.locator('.text-destructive', { hasText: 'Klient' });
      await expect(validationError).toBeVisible({ timeout: 5000 });
    });

    test('should show batch generation tab', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions/create`);
      await page.waitForLoadState('networkidle');

      // Verify mode switcher buttons are present
      const singleModeBtn = page.getByRole('button', { name: /Pojedynczy klient/i });
      const batchModeBtn = page.getByRole('button', { name: /Generuj dla wszystkich/i });

      await expect(singleModeBtn).toBeVisible();
      await expect(batchModeBtn).toBeVisible();

      // Click batch mode and verify the form changes
      await batchModeBtn.click();
      await expect(page.getByText(/Generuj rozliczenia dla wszystkich klientów/i)).toBeVisible();
    });
  });

  test.describe('Settings Page', () => {
    test('should display ZUS settings information', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/settings`);
      await page.waitForLoadState('networkidle');

      // Verify page header - PageHeader component uses a specific structure
      await expect(page.getByText('Ustawienia modułu ZUS')).toBeVisible();

      // Wait for API data to load - check for the card content
      await page.waitForSelector('text=Stawki składek społecznych', { timeout: 15000 });

      // Verify rate information is displayed - check that the contribution rates card is visible
      await expect(page.getByText('Stawki składek społecznych')).toBeVisible();
      await expect(page.getByText('19.52%')).toBeVisible();
      await expect(page.getByText('8.00%')).toBeVisible();
    });

    test('should show discount types information', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/settings`);
      await page.waitForLoadState('networkidle');

      // Wait for API data to load
      await page.waitForSelector('text=Rodzaje ulg dla przedsiębiorców', { timeout: 15000 });

      // Verify discount types section - h4 headings inside the card
      await expect(page.getByText('Rodzaje ulg dla przedsiębiorców')).toBeVisible();
      await expect(page.getByText('Ulga na start')).toBeVisible();
      await expect(page.locator('h4', { hasText: 'Mały ZUS' }).first()).toBeVisible();
    });
  });

  test.describe('CSV Export', () => {
    test('should have export button on contributions list', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      await page.goto(`${BASE_URL}/company/modules/zus/contributions`);
      await page.waitForLoadState('networkidle');

      // Verify export button exists - exact match for button text
      const exportButton = page.getByRole('button', { name: /Eksportuj CSV/i });
      await expect(exportButton).toBeVisible();
    });
  });
});

test.describe('ZUS Module - Access Control', () => {
  test('should restrict access for unauthorized users', async ({ page }) => {
    // Try to access ZUS module without authentication
    await page.goto(`${BASE_URL}/company/modules/zus`);

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
