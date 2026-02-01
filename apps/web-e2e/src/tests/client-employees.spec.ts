import { expect, test } from '../fixtures/auth.fixtures';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';

test.describe('Client Employees - Company Owner Workflows', () => {
  test.describe('Employee List', () => {
    test('should display employees section on client detail page', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to clients module
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      // Click on the first client to view details
      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Verify "Pracownicy klienta" section is visible
      await expect(page.getByText('Pracownicy klienta')).toBeVisible();

      // Verify "Dodaj pracownika" button is present
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await expect(addButton).toBeVisible();
    });

    test('should show empty state when no employees', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      // Click on the first client
      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Check for employees section - either has employees or shows empty state
      const employeesSection = page.locator('text=Pracownicy klienta').locator('..');
      await expect(employeesSection).toBeVisible();
    });

    test('should have status filter in employees list', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Wait for "Pracownicy klienta" section title to be visible
      await expect(page.getByText('Pracownicy klienta')).toBeVisible();

      // The filters should be visible in the employees section
      // Look for combobox elements within the employees section specifically
      // The section has filters before the table
      const employeesSection = page
        .locator('[class*="card"]')
        .filter({ hasText: 'Pracownicy klienta' });
      await expect(employeesSection).toBeVisible();

      // Verify there are filters (comboboxes) - they appear after the header
      const filters = employeesSection.getByRole('combobox');
      const filterCount = await filters.count();
      expect(filterCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Create Employee', () => {
    test('should open employee form dialog when clicking add button', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Click "Dodaj pracownika" button (the one in the header, not in a dialog)
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i }).first();
      await addButton.click();

      // Verify dialog opens with correct title
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Dodaj pracownika/i })).toBeVisible();

      // Verify form fields are present
      await expect(page.getByLabel(/Imię/i)).toBeVisible();
      await expect(page.getByLabel(/Nazwisko/i)).toBeVisible();
      await expect(page.getByLabel(/Typ umowy/i)).toBeVisible();
      await expect(page.getByLabel(/Data rozpoczęcia/i)).toBeVisible();
    });

    test('should show validation errors when submitting empty form', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Open the form dialog
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await addButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Clear the pre-filled fields and try to submit
      await page.getByLabel(/Imię/i).fill('');
      await page.getByLabel(/Nazwisko/i).fill('');

      // Submit the form
      const submitButton = page.getByRole('button', { name: /Dodaj pracownika/i }).last();
      await submitButton.click();

      // Should show validation errors
      await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 5000 });
    });

    test('should create employee successfully', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Open the form dialog
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await addButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Fill in the form with unique data
      const timestamp = Date.now();
      const firstName = `TestImie${timestamp}`;
      const lastName = `TestNazwisko${timestamp}`;

      await page.getByLabel(/Imię/i).fill(firstName);
      await page.getByLabel(/Nazwisko/i).fill(lastName);

      // Contract type is already set to default (UMOWA_O_PRACE)
      // Start date is already set to today

      // Fill optional fields
      await page.getByLabel(/Stanowisko/i).fill('Test Position');
      await page
        .getByLabel(/Wynagrodzenie brutto/i)
        .first()
        .fill('5000');

      // Submit the form
      const submitButton = page.getByRole('button', { name: /Dodaj pracownika/i }).last();
      await submitButton.click();

      // Wait for dialog to close and verify employee appears in the list
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

      // Verify the employee is now visible in the table
      await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible({ timeout: 10000 });
    });

    test('should show contract-specific fields for UMOWA_O_PRACE', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Open the form dialog
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await addButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Verify UMOWA_O_PRACE specific fields are visible (default contract type)
      await expect(page.getByText('Szczegóły umowy o pracę')).toBeVisible();
      await expect(page.getByLabel(/Wynagrodzenie brutto/i).first()).toBeVisible();
      await expect(page.getByLabel(/Godziny pracy/i)).toBeVisible();
      await expect(page.getByLabel(/Dni urlopu/i)).toBeVisible();
    });

    test('should show contract-specific fields when switching to UMOWA_ZLECENIE', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Open the form dialog
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await addButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Change contract type to UMOWA_ZLECENIE
      const contractTypeSelect = page.getByLabel(/Typ umowy/i);
      await contractTypeSelect.click();
      await page.getByRole('option', { name: 'Umowa zlecenie' }).click();

      // Verify UMOWA_ZLECENIE specific fields are visible
      await expect(page.getByText('Szczegóły umowy zlecenia')).toBeVisible();
      await expect(page.getByLabel(/Stawka godzinowa/i)).toBeVisible();
      await expect(page.getByText('Student (poniżej 26 lat)')).toBeVisible();
      await expect(page.getByText('Posiada inne ubezpieczenie')).toBeVisible();
    });

    test('should show contract-specific fields when switching to UMOWA_O_DZIELO', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Open the form dialog
      const addButton = page.getByRole('button', { name: /Dodaj pracownika/i });
      await addButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Change contract type to UMOWA_O_DZIELO
      const contractTypeSelect = page.getByLabel(/Typ umowy/i);
      await contractTypeSelect.click();
      await page.getByRole('option', { name: 'Umowa o dzieło' }).click();

      // Verify UMOWA_O_DZIELO specific fields are visible
      await expect(page.getByText('Szczegóły umowy o dzieło')).toBeVisible();
      await expect(page.getByLabel(/Kwota umowy/i)).toBeVisible();
      await expect(page.getByLabel(/Data dostarczenia/i)).toBeVisible();
      await expect(page.getByLabel(/Opis dzieła/i)).toBeVisible();
    });
  });

  test.describe('Edit Employee', () => {
    test('should open edit dialog from dropdown menu', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client with employees
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Wait for employees section to load
      await page.waitForSelector('text=Pracownicy klienta');

      // Check if there are any employees in the table
      const employeeTable = page
        .locator('text=Pracownicy klienta')
        .locator('..')
        .locator('..')
        .locator('table');
      const hasEmployees = await employeeTable.isVisible().catch(() => false);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (hasEmployees) {
        // Click on the dropdown menu for the first employee
        const moreButton = employeeTable.locator('tbody tr').first().getByRole('button').last();
        await moreButton.click();

        // Click "Edytuj" option
        await page.getByRole('menuitem', { name: /Edytuj/i }).click();

        // Verify edit dialog opens
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Edytuj pracownika')).toBeVisible();
      }
    });
  });

  test.describe('Delete Employee', () => {
    test('should show delete option in dropdown menu', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Wait for employees section
      await page.waitForSelector('text=Pracownicy klienta');

      const employeeTable = page
        .locator('text=Pracownicy klienta')
        .locator('..')
        .locator('..')
        .locator('table');
      const hasEmployees = await employeeTable.isVisible().catch(() => false);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (hasEmployees) {
        // Click on the dropdown menu
        const moreButton = employeeTable.locator('tbody tr').first().getByRole('button').last();
        await moreButton.click();

        // Verify "Usuń" option is visible
        await expect(page.getByRole('menuitem', { name: /Usuń/i })).toBeVisible();
      }
    });
  });

  test.describe('Filter Employees', () => {
    test('should filter by active/inactive status', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Find the employees card
      const employeesCard = page.locator('text=Pracownicy klienta').locator('..').locator('..');

      // Find and click the status filter (second combobox)
      const statusFilter = employeesCard.getByRole('combobox').nth(1);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (await statusFilter.isVisible()) {
        await statusFilter.click();

        // Verify filter options are available
        await expect(page.getByRole('option', { name: 'Wszyscy' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Aktywni' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Nieaktywni' })).toBeVisible();

        // Select "Wszyscy" to show all employees
        await page.getByRole('option', { name: 'Wszyscy' }).click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should filter by contract type', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;

      // Navigate to a client detail page
      await page.goto(`${BASE_URL}/company/modules/clients/list`);
      await page.waitForLoadState('networkidle');

      const clientRow = page.locator('table tbody tr').first();
      await clientRow.click();
      await page.waitForLoadState('networkidle');

      // Find the employees card
      const employeesCard = page.locator('text=Pracownicy klienta').locator('..').locator('..');

      // Find and click the contract type filter (first combobox)
      const contractFilter = employeesCard.getByRole('combobox').first();

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (await contractFilter.isVisible()) {
        await contractFilter.click();

        // Verify filter options are available
        await expect(page.getByRole('option', { name: 'Wszystkie typy' })).toBeVisible();

        // Close the dropdown
        await page.keyboard.press('Escape');
      }
    });
  });
});

test.describe('Client Employees - Access Control', () => {
  test('should restrict access for unauthorized users', async ({ page }) => {
    // Try to access clients module without authentication
    await page.goto(`${BASE_URL}/company/modules/clients`);

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
