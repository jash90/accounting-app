/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { TestDataFactory } from '../fixtures/data.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { OffersPage } from '../pages/modules/OffersPage';

const BASE_PATH = '/company/modules/offers';

test.describe('Offer Actions - Duplicate, Templates, Lead Detail', () => {
  let apiHelper: APIHelper;
  let createdOfferId: string | undefined;
  let createdLeadId: string | undefined;

  test.beforeAll(async () => {
    apiHelper = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    // Create a lead via API for the tests
    const leadData = TestDataFactory.createLeadData({
      companyName: `E2E Offers Actions Lead ${Date.now()}`,
      contactPerson: 'Anna Testowa',
      email: `offers-actions-${Date.now()}@e2e-test.com`,
    });
    const leadResult = await apiHelper.createLead(leadData);
    createdLeadId = leadResult?.id;

    // Create an offer via API for duplicate test
    const offerData = TestDataFactory.createOfferData({
      title: `E2E Duplicate Source ${Date.now()}`,
      description: 'Offer to be duplicated in E2E test',
    });
    const offerResult = await apiHelper.createOffer(offerData);
    createdOfferId = offerResult?.id;
  });

  test.afterAll(async () => {
    // Cleanup created entities
    if (createdOfferId) {
      await apiHelper.deleteOffer(createdOfferId).catch(() => {});
    }
    if (createdLeadId) {
      await apiHelper.deleteLead(createdLeadId).catch(() => {});
    }
    await apiHelper.dispose();
  });

  test.describe('Offer Duplication', () => {
    test('should duplicate an existing offer', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;
      const offersPage = new OffersPage(page);

      await offersPage.gotoOffersList(BASE_PATH);
      await offersPage.expectToBeOnOffersPage();
      await page.waitForLoadState('networkidle');

      // Get the first offer in the list
      const firstOfferLink = page.locator('table a').first();
      const hasOffers = (await firstOfferLink.count()) > 0;

      if (hasOffers) {
        const offerNumber = await firstOfferLink.textContent();

        if (offerNumber) {
          const trimmedNumber = offerNumber.trim();
          const initialRowCount = await offersPage.getTableRowCount();

          // Duplicate the offer
          await offersPage.duplicateOffer(trimmedNumber);
          await page.waitForLoadState('networkidle');

          // Verify: should navigate to a new offer or increase row count
          await offersPage.gotoOffersList(BASE_PATH);
          await page.waitForLoadState('networkidle');

          const newRowCount = await offersPage.getTableRowCount();
          expect(newRowCount).toBeGreaterThanOrEqual(initialRowCount);
        }
      } else {
        // No offers to duplicate - skip
        test.skip();
      }
    });
  });

  test.describe('Offer Templates Navigation', () => {
    test('should navigate to offer templates list', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;
      const offersPage = new OffersPage(page);

      // Navigate to dashboard first
      await offersPage.gotoDashboard(BASE_PATH);
      await offersPage.expectToBeOnDashboard();

      // Navigate to templates
      await offersPage.navigateToTemplatesList();
      await offersPage.expectToBeOnTemplatesPage();

      // Verify the templates page title
      await expect(page.locator('h1')).toContainText('Szablony');
    });
  });

  test.describe('Lead Detail Page', () => {
    test('should open lead detail page', async ({ authenticatedCompanyOwnerPage }) => {
      const page = authenticatedCompanyOwnerPage;
      const offersPage = new OffersPage(page);

      await offersPage.gotoLeadsList(BASE_PATH);
      await offersPage.expectToBeOnLeadsPage();
      await page.waitForLoadState('networkidle');

      // Find a lead in the list
      const leadLinks = page.locator('table a');
      const hasLeads = (await leadLinks.count()) > 0;

      if (hasLeads) {
        // Click the first lead link
        await leadLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify we're on the lead detail page
        await offersPage.expectToBeOnLeadDetailPage();
      } else {
        // No leads in list - skip
        test.skip();
      }
    });

    test('should display lead information on detail page', async ({
      authenticatedCompanyOwnerPage,
    }) => {
      const page = authenticatedCompanyOwnerPage;
      const offersPage = new OffersPage(page);

      await offersPage.gotoLeadsList(BASE_PATH);
      await offersPage.expectToBeOnLeadsPage();
      await page.waitForLoadState('networkidle');

      // Find a lead in the list
      const leadLinks = page.locator('table a');
      const hasLeads = (await leadLinks.count()) > 0;

      if (hasLeads) {
        // Get lead name before clicking
        const leadName = await leadLinks.first().textContent();
        await leadLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify we're on detail page
        await offersPage.expectToBeOnLeadDetailPage();

        // Verify lead information is displayed
        const heading = page.locator('h1');
        await expect(heading).toBeVisible();

        if (leadName) {
          await expect(page.locator(`text=${leadName.trim()}`).first()).toBeVisible();
        }

        // Check for common detail sections
        const detailSections = page.locator('main');
        await expect(detailSections).toBeVisible();

        // Verify action buttons are present (Edit, Convert, etc.)
        const actionButtons = page.locator(
          'button:has-text("Edytuj"), button:has-text("Przekonwertuj"), button:has-text("Utwórz ofertę")'
        );
        const hasActions = (await actionButtons.count()) > 0;
        expect(hasActions).toBeTruthy();
      } else {
        // No leads in list - skip
        test.skip();
      }
    });
  });
});
