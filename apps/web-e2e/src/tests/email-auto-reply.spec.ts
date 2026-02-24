/* eslint-disable playwright/expect-expect, playwright/no-skipped-test */
import { expect, test } from '../fixtures/auth.fixtures';
import { EmailAutoReplyTemplatesPage } from '../pages/modules/EmailAutoReplyTemplatesPage';

const BASE_PATH = '/company/modules/email-client';

test.describe('Email Auto-Reply Templates - CRUD', () => {
  test('should display auto-reply templates page', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    await page.expectToBeOnPage();
  });

  test('should show empty state when no templates exist', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);

    const hasTemplates = await authenticatedCompanyOwnerPage
      .locator('[class*="card"]:has-text("Aktywny")')
      .count();
    if (hasTemplates === 0) {
      await page.expectEmptyState();
    } else {
      test.skip();
    }
  });

  test('should create template with required fields', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Auto Reply ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'faktura, VAT',
      bodyTemplate: 'Dziękujemy za wiadomość. Odpowiemy wkrótce.',
    });
    await page.submitTemplateForm();

    await page.expectTemplateInList(name);
  });

  test('should create template with all fields including category', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Full Auto Reply ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'PIT, rozliczenie roczne',
      bodyTemplate: 'Szanowny Kliencie, Państwa zapytanie zostało przyjęte.',
      category: 'PIT',
    });
    await page.submitTemplateForm();

    await page.expectTemplateInList(name);
  });

  test('should edit existing template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Edit Auto Reply ${Date.now()}`;
    const updatedName = `Updated ${name}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'test',
      bodyTemplate: 'Test body template content.',
    });
    await page.submitTemplateForm();
    await page.expectTemplateInList(name);

    // Edit the template
    await page.editTemplate(name);
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    const nameInput = dialog.locator('input[placeholder*="Odpowiedź VAT"]');
    await nameInput.clear();
    await nameInput.fill(updatedName);
    await page.submitTemplateForm();

    await page.expectTemplateInList(updatedName);
  });

  test('should delete template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Delete Auto Reply ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'delete-test',
      bodyTemplate: 'This template will be deleted.',
    });
    await page.submitTemplateForm();
    await page.expectTemplateInList(name);

    await page.deleteTemplate(name);

    await page.goto(BASE_PATH);
    await page.expectTemplateNotInList(name);
  });
});

test.describe('Email Auto-Reply Templates - Toggle & Status', () => {
  test('should show Aktywny badge for active template', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Active Badge ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'active',
      bodyTemplate: 'Active template body.',
    });
    await page.submitTemplateForm();

    await page.expectTemplateActive(name);
  });

  test('should toggle active to inactive', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Toggle Active ${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: 'toggle',
      bodyTemplate: 'Toggle test template.',
    });
    await page.submitTemplateForm();
    await page.expectTemplateActive(name);

    await page.toggleTemplate(name);
    await page.expectTemplateInactive(name);
  });

  test('should display keyword badges on template card', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    const name = `Keyword Badge ${Date.now()}`;
    const keyword = `kwtest${Date.now()}`;

    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();
    await page.fillTemplateForm({
      name,
      triggerKeywords: keyword,
      bodyTemplate: 'Keyword badge test.',
    });
    await page.submitTemplateForm();

    await page.expectKeywordBadge(name, keyword);
  });
});

test.describe('Email Auto-Reply Templates - Form Validation', () => {
  test('should require name field', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    // Leave name empty, fill keywords and body, then submit
    await dialog.locator('input[placeholder*="faktura VAT"]').fill('test');
    await dialog.locator('textarea').first().fill('Test body');
    await dialog.locator('button[type="submit"]').click();

    // Should show validation error or keep dialog open
    await expect(dialog).toBeVisible();
  });

  test('should require keywords field', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('input[placeholder*="Odpowiedź VAT"]').fill('Test Name');
    // Leave keywords empty, fill body
    await dialog.locator('textarea').first().fill('Test body');
    await dialog.locator('button[type="submit"]').click();

    // Dialog should still be open (validation failed)
    await expect(dialog).toBeVisible();
  });

  test('should require body template field', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new EmailAutoReplyTemplatesPage(authenticatedCompanyOwnerPage);
    await page.goto(BASE_PATH);
    await page.clickCreateTemplate();

    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    await dialog.locator('input[placeholder*="Odpowiedź VAT"]').fill('Test Name');
    await dialog.locator('input[placeholder*="faktura VAT"]').fill('test keyword');
    // Leave body empty
    await dialog.locator('button[type="submit"]').click();

    // Dialog should still be open (validation failed)
    await expect(dialog).toBeVisible();
  });
});
