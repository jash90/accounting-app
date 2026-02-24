/* eslint-disable playwright/expect-expect */
import { expect, test } from '../fixtures/auth.fixtures';
import { CompanyProfilePage } from '../pages/company/CompanyProfilePage';

test.describe('Company Profile - Page Load', () => {
  test('should display page with all 5 sections', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();
    await page.expectToBeOnPage();
    await page.expectAllSections();
  });

  test('should show save profile button', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();
    await expect(
      authenticatedCompanyOwnerPage.locator('button:has-text("Zapisz profil")')
    ).toBeVisible();
  });
});

test.describe('Company Profile - Basic Data', () => {
  test('should update NIP with valid value', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    // Valid NIP: 5252344078
    await page.fillBasicData({ nip: '5252344078' });
    await page.saveProfile();

    // No NIP validation error
    await expect(authenticatedCompanyOwnerPage.locator('text=Nieprawidłowy NIP')).not.toBeVisible();
  });

  test('should show NIP validation error for invalid checksum', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    // Invalid NIP (wrong checksum)
    await page.fillBasicData({ nip: '1234567890' });
    await page.saveProfile();

    await page.expectNipValidationError();
  });

  test('should update REGON and KRS', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    // 9-digit REGON with valid checksum: 123456785
    await page.fillBasicData({ regon: '123456785', krs: '0000123456' });
    await page.saveProfile();

    await expect(
      authenticatedCompanyOwnerPage.locator('text=Nieprawidłowy REGON')
    ).not.toBeVisible();
  });
});

test.describe('Company Profile - Owner & Address', () => {
  test('should fill and save owner data', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    await page.fillOwnerData({
      firstName: 'Jan',
      lastName: 'Testowy',
      ownerName: 'Jan Testowy',
      email: 'jan.testowy@firma.pl',
    });
    await page.saveProfile();

    // After save the fields should still show the values
    await expect(authenticatedCompanyOwnerPage.locator('input[placeholder="Jan"]')).toHaveValue(
      'Jan'
    );
  });

  test('should fill and save address', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    await page.fillAddress({
      street: 'ul. Testowa',
      buildingNumber: '42',
      postalCode: '00-001',
      city: 'Warszawa',
    });
    await page.saveProfile();

    await expect(
      authenticatedCompanyOwnerPage.locator('input[placeholder="ul. Przykładowa"]')
    ).toHaveValue('ul. Testowa');
  });
});

test.describe('Company Profile - Bank & Communication', () => {
  test('should update bank details', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    await page.fillBankData({
      bankName: 'PKO Bank Polski',
      bankAccount: 'PL61109010140000071219812874',
    });
    await page.saveProfile();

    await expect(
      authenticatedCompanyOwnerPage.locator('input[placeholder="PKO Bank Polski"]')
    ).toHaveValue('PKO Bank Polski');
  });

  test('should update email signature and document footer', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();

    await page.fillCommunication({
      emailSignature: 'Z poważaniem,\nZespół',
      documentFooter: 'Test Sp. z o.o. | NIP: 5252344078',
    });
    await page.saveProfile();

    await expect(authenticatedCompanyOwnerPage.locator('textarea').first()).toHaveValue(
      'Z poważaniem,\nZespół'
    );
  });
});

test.describe('Company Profile - RBAC', () => {
  test('company owner can access /company/profile', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new CompanyProfilePage(authenticatedCompanyOwnerPage);
    await page.goto();
    await page.expectToBeOnPage();
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/company\/profile/);
  });
});
