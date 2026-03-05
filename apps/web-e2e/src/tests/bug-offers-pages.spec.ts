/**
 * Bug regression tests: Offers pages
 *
 * #3 - All offers subpages render without JS errors (buildQueryFilters import fix)
 */
import { expect, test } from '../fixtures/auth.fixtures';
import { OffersPage } from '../pages/modules/OffersPage';

test.describe('Bug #3 — All offers subpages load without JS errors', () => {
  test('offers dashboard loads without JS errors', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const pageErrors: Error[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const offersPage = new OffersPage(page);
    await offersPage.gotoDashboard();
    await offersPage.expectToBeOnDashboard();

    // No JS errors — especially no "buildQueryFilters is not defined"
    const buildQueryFilterErrors = pageErrors.filter((e) =>
      e.message.includes('buildQueryFilters')
    );
    expect(buildQueryFilterErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('offers list loads without JS errors', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const pageErrors: Error[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const offersPage = new OffersPage(page);
    await offersPage.gotoOffersList();
    await offersPage.expectToBeOnOffersPage();

    expect(pageErrors).toHaveLength(0);
  });

  test('leads list loads without JS errors', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const pageErrors: Error[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const offersPage = new OffersPage(page);
    await offersPage.gotoLeadsList();
    // Note: page title may be "Prospekty" (renamed from "Leady") — just check URL
    await expect(page).toHaveURL(/\/leads/);

    expect(pageErrors).toHaveLength(0);
  });

  test('templates list loads without JS errors', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const pageErrors: Error[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const offersPage = new OffersPage(page);
    await offersPage.gotoTemplatesList();
    await offersPage.expectToBeOnTemplatesPage();

    expect(pageErrors).toHaveLength(0);
  });

  test('all offers subpages navigate without errors in sequence', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = authenticatedCompanyOwnerPage;
    const pageErrors: Error[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const offersPage = new OffersPage(page);

    // Visit all 4 subpages in sequence
    await offersPage.gotoDashboard();
    await offersPage.gotoOffersList();
    await offersPage.gotoLeadsList();
    await offersPage.gotoTemplatesList();

    // No JS errors across all subpages
    const buildQueryFilterErrors = pageErrors.filter((e) =>
      e.message.includes('buildQueryFilters')
    );
    expect(buildQueryFilterErrors, 'buildQueryFilters should be properly imported').toHaveLength(0);
    expect(pageErrors, 'No JS errors expected on offers subpages').toHaveLength(0);
  });
});
