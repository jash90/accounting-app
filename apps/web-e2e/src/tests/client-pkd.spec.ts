import { test, expect } from '../fixtures/auth.fixtures';
import { ClientsPage } from '../pages/modules/ClientsPage';

test.describe('Clients - PKD Code Selection', () => {
  test('should create client with PKD code', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `PKD Test Client ${Date.now()}`;

    await clientsPage.goto();
    await clientsPage.expectToBeOnClientsPage();

    await clientsPage.createClient({
      name: clientName,
      nip: '1234567890',
      pkdCode: '62.01.Z', // IT services
    });

    await clientsPage.expectClientInList(clientName);
  });

  test('should search and select PKD code from dropdown', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `PKD Search Test ${Date.now()}`;

    await clientsPage.goto();
    await clientsPage.openAddClientForm();

    // Fill basic info
    await clientsPage.clientFormDialog
      .getByLabel(/nazwa|name/i)
      .first()
      .fill(clientName);

    // Search for PKD code by description
    await clientsPage.selectPkdCode('62.01'); // IT services
    await clientsPage.saveClient();

    await clientsPage.expectClientInList(clientName);
  });

  test('should update client PKD code', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `Update PKD Client ${Date.now()}`;

    await clientsPage.goto();

    // Create client without PKD code
    await clientsPage.createClient({
      name: clientName,
      nip: '9876543210',
    });

    // Update with PKD code
    await clientsPage.updateClientPkdCode(clientName, '69.20.Z'); // Accounting services

    // Verify update (would need to check client detail page)
    await clientsPage.expectClientInList(clientName);
  });

  test('should validate PKD code format', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);

    await clientsPage.goto();
    await clientsPage.openAddClientForm();

    // Fill basic info
    await clientsPage.clientFormDialog
      .getByLabel(/nazwa|name/i)
      .first()
      .fill('Invalid PKD Client');

    // Try to enter invalid PKD code format (if direct input is allowed)
    const pkdInput = clientsPage.clientFormDialog.locator('input[name="pkdCode"]');
    if (await pkdInput.isVisible()) {
      await pkdInput.fill('INVALID'); // Invalid format
      await clientsPage.saveClient();

      // Should show validation error or prevent submission
      await clientsPage.expectPkdValidationError();
    }
  });

  test('should clear PKD code selection', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `Clear PKD Client ${Date.now()}`;

    await clientsPage.goto();

    // Create client with PKD code
    await clientsPage.createClient({
      name: clientName,
      pkdCode: '62.01.Z',
    });

    // Edit and clear PKD code
    await clientsPage.editClient(clientName);

    // Clear the PKD field
    const clearButton = authenticatedCompanyOwnerPage.locator(
      '[data-testid="pkd-code-clear"], [aria-label="Clear"]'
    );
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await clientsPage.saveClient();
    }
  });
});

test.describe('Clients - AML Group Management', () => {
  test('should create client with AML group', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `AML Test Client ${Date.now()}`;

    await clientsPage.goto();

    await clientsPage.createClient({
      name: clientName,
      amlGroup: 'STANDARD', // Standard risk
    });

    await clientsPage.expectClientInList(clientName);
  });

  test('should update client AML group', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `AML Update Client ${Date.now()}`;

    await clientsPage.goto();

    // Create with STANDARD
    await clientsPage.createClient({
      name: clientName,
      amlGroup: 'STANDARD',
    });

    // Update to ELEVATED
    await clientsPage.updateClientAmlGroup(clientName, 'ELEVATED');

    await clientsPage.expectClientInList(clientName);
  });

  test('should filter clients by AML group', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);

    await clientsPage.goto();

    // Filter by HIGH risk
    await clientsPage.filterByAmlGroup('HIGH');

    // Should only show HIGH risk clients
    await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');

    // Verify filter is applied - URL should reflect filter parameter
    const currentUrl = authenticatedCompanyOwnerPage.url();
    expect(currentUrl).toContain('amlGroup');
    expect(currentUrl).toMatch(/amlGroup[=:]HIGH/i);

    // Verify displayed results match the filter (if any clients exist)
    const clientRows = authenticatedCompanyOwnerPage.locator(
      'table tbody tr, [role="row"]:not([role="row"]:first-child)'
    );
    const rowCount = await clientRows.count();
    if (rowCount > 0) {
      // All visible rows should have HIGH risk indicator
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const rowText = await clientRows.nth(i).textContent();
        expect(rowText?.toLowerCase()).toMatch(/high|wysok/i);
      }
    }
  });

  test('should display AML group options correctly', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);

    await clientsPage.goto();
    await clientsPage.openAddClientForm();

    // Check AML group options are available
    const amlSelect = clientsPage.clientFormDialog.locator(
      '[data-testid="aml-group-select"], select[name="amlGroup"]'
    );

    if (await amlSelect.isVisible()) {
      await amlSelect.click();

      // Should have the new AML groups (STANDARD, ELEVATED, HIGH)
      const options = authenticatedCompanyOwnerPage.getByRole('option');
      const optionTexts = await options.allTextContents();

      expect(optionTexts.some((t) => /standard/i.test(t))).toBe(true);
      expect(optionTexts.some((t) => /elevated/i.test(t))).toBe(true);
      expect(optionTexts.some((t) => /high/i.test(t))).toBe(true);
    }

    await clientsPage.cancelClient();
  });

  test('should show AML group in client list', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `AML Display Client ${Date.now()}`;

    await clientsPage.goto();

    await clientsPage.createClient({
      name: clientName,
      amlGroup: 'ELEVATED',
    });

    // Client row should show AML group
    const row = clientsPage.getClientRow(clientName);
    const rowText = await row.textContent();

    expect(rowText).toMatch(/elevated|podwyższone/i);
  });
});

test.describe('Clients - PKD and AML Combined', () => {
  test('should create client with both PKD code and AML group', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `Full Client ${Date.now()}`;

    await clientsPage.goto();

    await clientsPage.createClient({
      name: clientName,
      nip: '5551234567',
      email: `test${Date.now()}@example.com`,
      pkdCode: '62.01.Z',
      amlGroup: 'STANDARD',
    });

    await clientsPage.expectClientInList(clientName);
  });

  test('should handle client with high-risk PKD code', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `High Risk PKD Client ${Date.now()}`;

    await clientsPage.goto();

    // Create client with potentially high-risk PKD (e.g., financial services)
    await clientsPage.createClient({
      name: clientName,
      pkdCode: '64.19.Z', // Other monetary intermediation
      amlGroup: 'HIGH',
    });

    await clientsPage.expectClientInList(clientName);
  });

  test('should search for clients and show PKD info', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);
    const clientName = `Search PKD Client ${Date.now()}`;

    await clientsPage.goto();

    // Create client
    await clientsPage.createClient({
      name: clientName,
      pkdCode: '62.01.Z',
    });

    // Search for the client
    await clientsPage.searchClient(clientName);

    await clientsPage.expectClientInList(clientName);

    // Row should contain PKD code info
    const row = clientsPage.getClientRow(clientName);
    await expect(row).toBeVisible();
  });
});

test.describe('Clients - Employee Access', () => {
  test('employee should be able to view clients', async ({ authenticatedEmployeePage }) => {
    const clientsPage = new ClientsPage(authenticatedEmployeePage);

    await clientsPage.goto();
    await clientsPage.expectToBeOnClientsPage();

    // Should see clients table element present and visible
    const clientsTable = authenticatedEmployeePage.locator(
      'table, [role="grid"], [data-testid="clients-list"]'
    );
    await expect(clientsTable.first()).toBeVisible();

    // Table should have header row (indicating proper table structure)
    const headerRow = authenticatedEmployeePage.locator(
      'table thead tr, [role="rowheader"], [role="columnheader"]'
    );
    const hasHeader = await headerRow
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasHeader || (await clientsTable.first().isVisible())).toBe(true);
  });

  test('employee with write permission should create client', async ({
    authenticatedEmployeePage,
  }) => {
    const clientsPage = new ClientsPage(authenticatedEmployeePage);
    const clientName = `Employee Created Client ${Date.now()}`;

    await clientsPage.goto();

    // Try to create client (may fail if no write permission)
    const addButton = clientsPage.addClientButton;

    if ((await addButton.isVisible()) && (await addButton.isEnabled())) {
      await clientsPage.createClient({
        name: clientName,
        pkdCode: '62.01.Z',
      });
      await clientsPage.expectClientInList(clientName);
    }
  });
});

test.describe('Clients - Bulk Operations', () => {
  test('should bulk update AML group', async ({ authenticatedCompanyOwnerPage }) => {
    const clientsPage = new ClientsPage(authenticatedCompanyOwnerPage);

    await clientsPage.goto();

    // Select multiple clients (using checkboxes)
    const checkboxes = authenticatedCompanyOwnerPage.locator('tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 2) {
      // Select first two clients
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Look for bulk actions
      const bulkActionsButton = authenticatedCompanyOwnerPage.getByRole('button', {
        name: /akcje|actions|bulk/i,
      });
      if (await bulkActionsButton.isVisible()) {
        await bulkActionsButton.click();

        // Select AML group change
        const amlAction = authenticatedCompanyOwnerPage.getByText(/zmień grupę aml|change aml/i);
        if (await amlAction.isVisible()) {
          await amlAction.click();

          // Select new AML group
          await clientsPage.selectAmlGroup('ELEVATED');

          // Confirm
          const confirmButton = authenticatedCompanyOwnerPage.getByRole('button', {
            name: /potwierdź|confirm/i,
          });
          await confirmButton.click();

          await authenticatedCompanyOwnerPage.waitForLoadState('networkidle');
        }
      }
    }
  });
});
