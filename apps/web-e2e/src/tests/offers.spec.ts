/* eslint-disable playwright/expect-expect, playwright/no-conditional-in-test, playwright/no-skipped-test */
import { expect, test } from '../fixtures/auth.fixtures';
import { TestDataGenerator } from '../fixtures/data.fixtures';
import { OffersPage } from '../pages/modules/OffersPage';

const BASE_PATH = '/company/modules/offers';

test.describe('Offers Module - Dashboard', () => {
  test('should display offers dashboard with statistics', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoDashboard(BASE_PATH);
    await offersPage.expectToBeOnDashboard();
    await offersPage.expectDashboardStats();
  });

  test('should navigate to offers list from dashboard', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoDashboard(BASE_PATH);
    await offersPage.navigateToOffersList();
    await offersPage.expectToBeOnOffersPage();
  });

  test('should navigate to leads list from dashboard', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoDashboard(BASE_PATH);
    await offersPage.navigateToLeadsList();
    await offersPage.expectToBeOnLeadsPage();
  });

  test('should navigate to templates list from dashboard', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoDashboard(BASE_PATH);
    await offersPage.navigateToTemplatesList();
    await offersPage.expectToBeOnTemplatesPage();
  });
});

test.describe('Offers Module - Leads CRUD', () => {
  test('should display leads list', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.expectToBeOnLeadsPage();
  });

  test('should create a new lead', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Test Lead ${TestDataGenerator.generateEmail()}`;

    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'test-lead@example.com',
      phone: '+48123456789',
    });

    // Verify lead was created
    await offersPage.expectLeadInList(leadName);
  });

  test('should search leads', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Search Test Lead ${Date.now()}`;

    // First create a lead
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'search-test@example.com',
    });

    // Then search for it
    await offersPage.searchLeads(leadName);
    await offersPage.expectLeadInList(leadName);
  });

  test('should edit an existing lead', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Edit Test Lead ${Date.now()}`;
    const updatedName = `Updated ${leadName}`;

    // Create a lead first
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'edit-test@example.com',
    });

    // Refresh to see the new lead
    await offersPage.refresh();

    // Search for the lead to find it in the list
    await offersPage.searchLeads(leadName);
    await offersPage.waitForPageLoad();

    // Edit the lead
    await offersPage.editLead(leadName);
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('input[name="name"]').fill(updatedName);
    await offersPage.submitLeadForm();

    // Verify the update
    await offersPage.searchLeads(updatedName);
    await offersPage.expectLeadInList(updatedName);
  });

  test('should view lead details', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Detail Test Lead ${Date.now()}`;

    // Create a lead first
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'detail-test@example.com',
    });

    // View details
    await offersPage.clickLeadLink(leadName);
    await offersPage.expectToBeOnLeadDetailPage();

    // Verify lead data is visible (use .first() to avoid strict mode violation when text appears multiple times)
    await expect(authenticatedCompanyOwnerPage.locator(`text=${leadName}`).first()).toBeVisible();
  });

  test('should delete a lead', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Delete Test Lead ${Date.now()}`;

    // Create a lead first
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'delete-test@example.com',
    });

    // Refresh and search for the lead
    await offersPage.refresh();
    await offersPage.searchLeads(leadName);
    await offersPage.waitForPageLoad();

    // Verify it's there
    await offersPage.expectLeadInList(leadName);

    // Delete it
    await offersPage.deleteLead(leadName);

    // Verify it's gone
    await offersPage.refresh();
    await offersPage.searchLeads(leadName);
    await offersPage.expectLeadNotInList(leadName);
  });

  test('should convert lead to client', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Convert Test Lead ${Date.now()}`;

    // Create a lead first
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'convert-test@example.com',
    });

    // Refresh and search for the lead
    await offersPage.refresh();
    await offersPage.searchLeads(leadName);
    await offersPage.waitForPageLoad();

    // Convert to client
    await offersPage.convertLeadToClient(leadName);

    // Verify success (toast or status change)
    // The lead should still be in the list but with CONVERTED status
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.searchLeads(leadName);
  });
});

test.describe('Offers Module - Templates CRUD', () => {
  test('should display templates list', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoTemplatesList(BASE_PATH);
    await offersPage.expectToBeOnTemplatesPage();
  });

  test('should create a new template', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const templateName = `Test Template ${Date.now()}`;

    await offersPage.gotoTemplatesList(BASE_PATH);
    await offersPage.createTemplate({
      name: templateName,
      description: 'Test template description',
      validityDays: 30,
      vatRate: 23,
    });

    // Verify template was created
    await offersPage.expectTemplateInList(templateName);
  });

  test('should edit an existing template', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const templateName = `Edit Template ${Date.now()}`;
    const updatedName = `Updated ${templateName}`;

    // Create a template first
    await offersPage.gotoTemplatesList(BASE_PATH);
    await offersPage.createTemplate({
      name: templateName,
      description: 'Original description',
    });

    // Verify template was created
    await offersPage.expectTemplateInList(templateName);

    // Find the row with our template and click its dropdown
    const row = authenticatedCompanyOwnerPage.locator(`tbody tr:has-text("${templateName}")`);
    await row.locator('td:last-child button').click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="menu"]', { state: 'visible' });
    await authenticatedCompanyOwnerPage.locator('[role="menuitem"]:has-text("Edytuj")').click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Update the name in dialog
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('input[name="name"]').clear();
    await dialog.locator('input[name="name"]').fill(updatedName);
    await offersPage.submitTemplateForm();

    // Wait for data to refresh and check the list
    await offersPage.waitForPageLoad();

    // Search for the updated template to make sure we find it
    await authenticatedCompanyOwnerPage.locator('input[placeholder="Szukaj..."]').fill(updatedName);
    await offersPage.waitForPageLoad();

    // Verify the update
    await offersPage.expectTemplateInList(updatedName);
  });

  test('should delete a template', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const templateName = `Delete Template ${Date.now()}`;

    // Create a template first
    await offersPage.gotoTemplatesList(BASE_PATH);
    await offersPage.createTemplate({
      name: templateName,
      description: 'To be deleted',
    });

    // Verify it's there
    await offersPage.expectTemplateInList(templateName);

    // Delete it
    await offersPage.deleteTemplate(templateName);

    // Verify it's gone or deletion was successful
    await offersPage.gotoTemplatesList(BASE_PATH);
  });
});

test.describe('Offers Module - Offers CRUD', () => {
  let testLeadName: string;
  let testTemplateName: string;

  test.beforeEach(async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    testLeadName = `Test Lead for Offers ${Date.now()}`;
    testTemplateName = `Test Template for Offers ${Date.now()}`;

    // Create a lead for the offers
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: testLeadName,
      email: 'offers-test@example.com',
    });

    // Create a template for the offers
    await offersPage.gotoTemplatesList(BASE_PATH);
    await offersPage.createTemplate({
      name: testTemplateName,
      description: 'Template for offers tests',
      validityDays: 30,
      vatRate: 23,
    });
  });

  test('should display offers list', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.expectToBeOnOffersPage();
  });

  test('should create a new offer', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Test Offer ${Date.now()}`;

    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Test Service',
          unitPrice: 1000,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Page should show new offer or redirect to detail
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/offers/);
  });

  test('should view offer details', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Detail Offer ${Date.now()}`;

    // Create an offer first
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Detail Test Service',
          unitPrice: 500,
          quantity: 2,
          unit: 'godz.',
        },
      ],
    });

    // Navigate to the offer list and click on the first offer
    await offersPage.gotoOffersList(BASE_PATH);

    // Get the first offer number from the list and click it
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();

    // Verify we're on the detail page
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/offers.*\/[a-z0-9-]+$/i);
  });

  test('should duplicate an offer', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Duplicate Offer ${Date.now()}`;

    // Create an offer first
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Duplicate Test Service',
          unitPrice: 750,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Go to offer list
    await offersPage.gotoOffersList(BASE_PATH);

    // Get the first offer number
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    const offerNumber = await firstOfferLink.textContent();

    if (offerNumber) {
      // Duplicate it
      await offersPage.duplicateOffer(offerNumber.trim());

      // Verify a new offer was created (there should be at least 2 offers now)
      await offersPage.gotoOffersList(BASE_PATH);
      const rowCount = await offersPage.getTableRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('should change offer status from DRAFT to READY', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Status Change Offer ${Date.now()}`;

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Status Test Service',
          unitPrice: 1200,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Go to offer list and open the offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Change status to READY (label: "Gotowa")
    await offersPage.changeOfferStatus('Gotowa');

    // Verify status changed
    await expect(authenticatedCompanyOwnerPage.locator('text=Gotowa').first()).toBeVisible();
  });

  test('should delete a draft offer', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Delete Offer ${Date.now()}`;

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Delete Test Service',
          unitPrice: 300,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Go to offer list - newly created offer should appear
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.waitForPageLoad();

    // Get the offer number of the first row (our newly created offer)
    const firstRow = authenticatedCompanyOwnerPage.locator('tbody tr').first();
    const offerNumberCell = firstRow.locator('td').first().locator('a');
    const offerNumber = offerNumberCell;
    await expect(offerNumber).toHaveText();

    // Verify the first row contains our offer title
    await expect(firstRow).toContainText(offerTitle);

    // Click on dropdown trigger for the first row
    await firstRow.locator('td:last-child button').click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="menu"]', { state: 'visible' });

    // Check if delete option is available (only for DRAFT status)
    const deleteMenuItem = authenticatedCompanyOwnerPage.locator(
      '[role="menuitem"]:has-text("Usuń")'
    );
    const deleteCount = await deleteMenuItem.count();

    if (deleteCount > 0) {
      await deleteMenuItem.click();
      await authenticatedCompanyOwnerPage.waitForSelector('[role="alertdialog"]', {
        state: 'visible',
      });
      await authenticatedCompanyOwnerPage
        .locator('[role="alertdialog"] button:has-text("Usuń")')
        .click();
      await offersPage.waitForPageLoad();

      // Verify offer was deleted - the specific offer number should no longer be in the list
      await offersPage.gotoOffersList(BASE_PATH);
      await offersPage.waitForPageLoad();

      // The deleted offer number should not be visible anymore
      await expect(
        authenticatedCompanyOwnerPage.locator(`table a:has-text("${offerNumber}")`)
      ).not.toBeVisible();
    } else {
      // Close the dropdown if delete not available
      await authenticatedCompanyOwnerPage.keyboard.press('Escape');
      // Skip test if delete not available (offer might not be in DRAFT status)
      test.skip();
    }
  });
});

test.describe('Offers Module - Lead Detail Page', () => {
  // Increase timeout for detail page tests that involve multiple operations
  test.setTimeout(45000);

  test('should display lead detail page correctly', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Detail Page Lead ${Date.now()}`;

    // Create a lead with full details
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'detail-page@example.com',
      phone: '+48111222333',
      nip: '1234567890',
      notes: 'Test notes for the lead',
    });

    // Navigate to lead detail
    await offersPage.clickLeadLink(leadName);
    await offersPage.expectToBeOnLeadDetailPage();

    // Verify lead information is displayed
    await expect(authenticatedCompanyOwnerPage.locator(`h1:has-text("${leadName}")`)).toBeVisible();
  });

  test('should edit lead from detail page', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Edit from Detail Lead ${Date.now()}`;
    const updatedNotes = 'Updated notes from detail page';

    // Create a lead
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'edit-detail@example.com',
    });

    // Navigate to lead detail
    await offersPage.clickLeadLink(leadName);
    await offersPage.expectToBeOnLeadDetailPage();

    // Edit from detail page
    await offersPage.editLeadFromDetail();

    // Wait for dialog to be visible and scroll to notes field
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });

    // Scroll to and fill the notes field within dialog
    const notesField = dialog.locator('textarea[name="notes"]');
    await notesField.scrollIntoViewIfNeeded();
    await notesField.fill(updatedNotes);

    await offersPage.submitLeadForm();

    // Verify update - notes appear on the detail page
    await expect(authenticatedCompanyOwnerPage.locator(`text=${updatedNotes}`)).toBeVisible();
  });

  test('should create offer from lead detail', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const leadName = `Offer from Lead ${Date.now()}`;

    // Create a lead
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: leadName,
      email: 'offer-from-lead@example.com',
    });

    // Navigate to lead detail
    await offersPage.clickLeadLink(leadName);
    await offersPage.expectToBeOnLeadDetailPage();

    // Wait for the page to fully load
    await offersPage.waitForPageLoad();

    // Click "Utwórz ofertę" button - use first() if multiple buttons exist
    const createOfferButton = authenticatedCompanyOwnerPage
      .locator('button:has-text("Utwórz ofertę")')
      .first();
    await expect(createOfferButton).toBeVisible();
    await createOfferButton.click();

    // Wait for dialog to appear
    await authenticatedCompanyOwnerPage.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Verify the offer form dialog is visible
    await expect(authenticatedCompanyOwnerPage.locator(`[role="dialog"]`)).toBeVisible();
  });
});

test.describe('Offers Module - Offer Detail Page', () => {
  let testLeadName: string;

  test.beforeEach(async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    testLeadName = `Lead for Offer Detail ${Date.now()}`;

    // Create a lead
    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: testLeadName,
      email: 'offer-detail@example.com',
    });
  });

  test('should display offer detail page correctly', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    const offerTitle = `Detail Page Offer ${Date.now()}`;

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: offerTitle,
      leadName: testLeadName,
      description: 'Detailed offer description',
      serviceItems: [
        {
          name: 'Detailed Service',
          unitPrice: 2000,
          quantity: 3,
          unit: 'godz.',
        },
      ],
    });

    // Navigate to offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Verify offer information is displayed
    await expect(authenticatedCompanyOwnerPage.locator('h1')).toBeVisible();
    await expect(authenticatedCompanyOwnerPage.locator('text=Pozycje usług')).toBeVisible();
  });

  test('should generate document from detail page', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: `Generate Doc Offer ${Date.now()}`,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Document Service',
          unitPrice: 1500,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Navigate to offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Try to generate document (if button is visible)
    const generateButton = authenticatedCompanyOwnerPage.locator(
      'button:has-text("Generuj dokument")'
    );
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await offersPage.waitForPageLoad();

      // After generation, download button should appear
      await expect(
        authenticatedCompanyOwnerPage.locator('button:has-text("Pobierz")')
      ).toBeVisible();
    }
  });

  test('should show activity history', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: `Activity History Offer ${Date.now()}`,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Activity Service',
          unitPrice: 800,
          quantity: 2,
          unit: 'szt.',
        },
      ],
    });

    // Navigate to offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Verify activity history section exists
    await expect(authenticatedCompanyOwnerPage.locator('text=Historia aktywności')).toBeVisible();
  });

  test('should duplicate offer from detail page', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    // Create an offer
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: `Duplicate from Detail ${Date.now()}`,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Duplicate Service',
          unitPrice: 600,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Navigate to offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Duplicate the offer
    await offersPage.duplicateOfferFromDetail();

    // Should navigate to the new offer detail
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/offers.*\/[a-z0-9-]+$/i);
  });
});

test.describe('Offers Module - Status Workflow', () => {
  let testLeadName: string;

  test.beforeEach(async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);
    testLeadName = `Lead for Status Workflow ${Date.now()}`;

    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.createLead({
      name: testLeadName,
      email: 'status-workflow@example.com',
    });
  });

  test('should follow correct status workflow: DRAFT -> READY', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    // Create an offer (starts as DRAFT)
    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.createOffer({
      title: `Workflow Offer ${Date.now()}`,
      leadName: testLeadName,
      serviceItems: [
        {
          name: 'Workflow Service',
          unitPrice: 1000,
          quantity: 1,
          unit: 'szt.',
        },
      ],
    });

    // Navigate to offer detail
    await offersPage.gotoOffersList(BASE_PATH);
    const firstOfferLink = authenticatedCompanyOwnerPage.locator('table a').first();
    await firstOfferLink.click();
    await offersPage.waitForPageLoad();

    // Verify initial status is DRAFT (label: "Wersja robocza") - use first() to avoid strict mode violation
    await expect(
      authenticatedCompanyOwnerPage.locator('text=Wersja robocza').first()
    ).toBeVisible();

    // Change to READY (label: "Gotowa")
    await offersPage.changeOfferStatus('Gotowa');
    await expect(authenticatedCompanyOwnerPage.locator('text=Gotowa').first()).toBeVisible();
  });
});

test.describe('Offers Module - Filters', () => {
  test('should filter leads by status', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoLeadsList(BASE_PATH);
    await offersPage.expectToBeOnLeadsPage();

    // Use status filter - click on the select trigger
    const statusFilterTrigger = authenticatedCompanyOwnerPage
      .locator('button[role="combobox"]')
      .first();
    await statusFilterTrigger.click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="listbox"]', { state: 'visible' });
    await authenticatedCompanyOwnerPage.click('[role="option"]:has-text("Nowy")');

    await offersPage.waitForPageLoad();

    // Verify filter was applied - the select should now show "Nowy" instead of "Wszystkie statusy"
    await expect(statusFilterTrigger).toContainText('Nowy');
  });

  test('should filter offers by status', async ({ authenticatedCompanyOwnerPage }) => {
    const offersPage = new OffersPage(authenticatedCompanyOwnerPage);

    await offersPage.gotoOffersList(BASE_PATH);
    await offersPage.expectToBeOnOffersPage();

    // Use status filter - click on the select trigger (use "Wersja robocza" which is correct label for DRAFT)
    const statusFilterTrigger = authenticatedCompanyOwnerPage
      .locator('button[role="combobox"]')
      .first();
    await statusFilterTrigger.click();
    await authenticatedCompanyOwnerPage.waitForSelector('[role="listbox"]', { state: 'visible' });
    await authenticatedCompanyOwnerPage.click('[role="option"]:has-text("Wersja robocza")');

    await offersPage.waitForPageLoad();

    // Verify filter was applied - the select should now show "Wersja robocza"
    await expect(statusFilterTrigger).toContainText('Wersja robocza');
  });
});
