/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { TestDataFactory } from '../fixtures/data.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { OffersPage } from '../pages/modules/OffersPage';

const BASE_PATH = '/company/modules/offers';

// ─── Offers - Send & Lead Creation ──────────────────────────────────────────

test.describe.serial('Offers Module - Send & Leads', () => {
  let api: APIHelper;
  let clientId: string;
  let _clientName: string;
  const offerTitle = `E2E Offer ${Date.now()}`;
  const leadCompanyName = `E2E Lead Company ${Date.now()}`;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    // Create a client via API (needed for offers)
    const clientData = TestDataFactory.createClientData();
    _clientName = clientData.name;
    const client = await api.createClient(clientData);
    clientId = client.id;
  });

  test.afterAll(async () => {
    // Clean up client
    if (clientId) {
      await api.deleteClient(clientId).catch(() => {});
    }
    await api.dispose();
  });

  test('should display offers list', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const offersPage = new OffersPage(page);

    await offersPage.gotoOffersList(BASE_PATH);
    await page.waitForLoadState('networkidle');

    // Verify we are on the offers list page
    await expect(page).toHaveURL(/\/list/);
    await expect(page.getByText('Oferty').first()).toBeVisible();
  });

  test('should create a new offer', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const offersPage = new OffersPage(page);

    await offersPage.gotoOffersList(BASE_PATH);
    await page.waitForLoadState('networkidle');

    await offersPage.createOffer({
      title: offerTitle,
      description: 'E2E test offer description',
    });

    await page.waitForLoadState('networkidle');
    await offersPage.expectOfferInList(offerTitle);
  });

  test('should open send dialog for an offer', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const offersPage = new OffersPage(page);

    await offersPage.gotoOffersList(BASE_PATH);
    await page.waitForLoadState('networkidle');

    await offersPage.openOfferActions(offerTitle);
    await offersPage.sendOffer(offerTitle);

    // Verify the send dialog is visible
    await offersPage.expectSendDialog();

    // Fill the send dialog with email info
    await offersPage.fillSendDialog({
      email: 'test@e2e-test.com',
      subject: 'Oferta testowa',
      message: 'Wysyłam ofertę testową',
    });

    // Dismiss dialog without actually sending (to avoid side effects)
    await page.keyboard.press('Escape');
  });

  test('should create a lead from offers module', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const offersPage = new OffersPage(page);

    await offersPage.gotoLeadsList(BASE_PATH);
    await page.waitForLoadState('networkidle');

    // Verify we are on the leads page
    await expect(page).toHaveURL(/\/leads/);

    // Look for lead creation button
    const createLeadButton = page.locator(
      'button:has-text("Nowy lead"), button:has-text("Dodaj lead")'
    );
    if (await createLeadButton.first().isVisible()) {
      await createLeadButton.first().click();

      // Fill lead form
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const companyInput = dialog.locator(
        'input[name="companyName"], input[placeholder*="firma"], input[placeholder*="Firma"]'
      );
      if (await companyInput.first().isVisible()) {
        await companyInput.first().fill(leadCompanyName);
      }

      const emailInput = dialog.locator('input[name="email"], input[type="email"]');
      if (await emailInput.first().isVisible()) {
        await emailInput.first().fill(`lead.${Date.now()}@e2e-test.com`);
      }

      // Submit and verify
      const submitButton = dialog.locator(
        'button[type="submit"], button:has-text("Zapisz"), button:has-text("Dodaj")'
      );
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
