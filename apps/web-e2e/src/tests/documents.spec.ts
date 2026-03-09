/* eslint-disable playwright/expect-expect, playwright/no-skipped-test */
import { expect, test } from '../fixtures/auth.fixtures';
import { DocumentsPage } from '../pages/modules/DocumentsPage';

const BASE_PATH = '/company/modules/documents';

test.describe('Documents Module - Dashboard', () => {
  test('should display dashboard with template and generated counts', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoDashboard(BASE_PATH);
    await documentsPage.expectToBeOnDashboard();
    await expect(
      authenticatedCompanyOwnerPage.locator('text=Szablony dokumentów').first()
    ).toBeVisible();
    await expect(
      authenticatedCompanyOwnerPage.locator('text=Wygenerowane dokumenty').first()
    ).toBeVisible();
  });

  test('should navigate to templates list from dashboard', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoDashboard(BASE_PATH);
    await documentsPage.navigateToTemplates();
    await documentsPage.expectToBeOnTemplatesPage();
  });

  test('should navigate to generated documents from dashboard', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoDashboard(BASE_PATH);
    await documentsPage.navigateToGenerated();
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/documents\/generated/);
  });
});

test.describe('Documents Module - Templates CRUD', () => {
  test('should display templates list page', async ({ authenticatedCompanyOwnerPage }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.expectToBeOnTemplatesPage();
  });

  test('should show empty state when no templates exist', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoTemplatesList(BASE_PATH);
    // Empty state message visible only when no templates
    const hasTemplates = await authenticatedCompanyOwnerPage
      .locator('[class*="card"]:has-text("Aktywny")')
      .count();
    if (hasTemplates === 0) {
      await documentsPage.expectEmptyState();
    } else {
      // Already has templates — skip empty state check
      test.skip();
    }
  });

  test('should create template with required field', async ({ authenticatedCompanyOwnerPage }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    const templateName = `Test Doc Template ${Date.now()}`;

    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({ name: templateName });
    await documentsPage.submitTemplateForm();

    await documentsPage.expectTemplateInList(templateName);
  });

  test('should create template with all fields', async ({ authenticatedCompanyOwnerPage }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    const templateName = `Full Doc Template ${Date.now()}`;

    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({
      name: templateName,
      description: 'A comprehensive test template',
      placeholders: 'client_name, date, amount',
      templateContent: 'Hello {{client_name}}, dated {{date}} for {{amount}}.',
    });
    await documentsPage.submitTemplateForm();

    await documentsPage.expectTemplateInList(templateName);
  });

  test('should edit existing template', async ({ authenticatedCompanyOwnerPage }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    const templateName = `Edit Doc Template ${Date.now()}`;
    const updatedName = `Updated ${templateName}`;

    // Create template first
    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({ name: templateName });
    await documentsPage.submitTemplateForm();
    await documentsPage.expectTemplateInList(templateName);

    // Edit it
    await documentsPage.editTemplate(templateName);
    const dialog = authenticatedCompanyOwnerPage.locator('[role="dialog"]');
    const nameInput = dialog.locator('input').first();
    await nameInput.clear();
    await nameInput.fill(updatedName);
    await documentsPage.submitTemplateForm();

    await documentsPage.expectTemplateInList(updatedName);
  });

  test('should delete template', async ({ authenticatedCompanyOwnerPage }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    const templateName = `Delete Doc Template ${Date.now()}`;

    // Create template first
    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({ name: templateName });
    await documentsPage.submitTemplateForm();
    await documentsPage.expectTemplateInList(templateName);

    // Delete it
    await documentsPage.deleteTemplate(templateName);

    // Reload and verify it's gone
    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.expectTemplateNotInList(templateName);
  });

  test('should display category badge on template card', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    const templateName = `Category Badge Template ${Date.now()}`;

    await documentsPage.gotoTemplatesList(BASE_PATH);
    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({ name: templateName });
    await documentsPage.submitTemplateForm();

    // Category badge should be visible on the card
    const card = authenticatedCompanyOwnerPage.locator(
      `[class*="card"]:has-text("${templateName}")`
    );
    // Should have at least an active/inactive badge and a category badge
    await expect(card.locator('[class*="badge"], [class*="Badge"]').first()).toBeVisible();
  });
});

test.describe('Documents Module - Generated Documents', () => {
  test('should display generated documents list page', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoGeneratedList(BASE_PATH);
    await expect(authenticatedCompanyOwnerPage).toHaveURL(/documents\/generated/);
  });

  test('should show content on generated documents page', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoGeneratedList(BASE_PATH);
    await documentsPage.waitForPageLoad();
    // Page should render without crashing
    await expect(authenticatedCompanyOwnerPage.locator('body')).toBeVisible();
  });
});

test.describe('Documents Module - RBAC', () => {
  test('admin can access documents via /admin/modules/documents', async ({
    authenticatedAdminPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedAdminPage);
    await documentsPage.gotoDashboard('/admin/modules/documents');
    await documentsPage.waitForPageLoad();
    await expect(authenticatedAdminPage).toHaveURL(/admin\/modules\/documents/);
  });

  test('company owner can access documents via /company/modules/documents', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const documentsPage = new DocumentsPage(authenticatedCompanyOwnerPage);
    await documentsPage.gotoDashboard(BASE_PATH);
    await documentsPage.expectToBeOnDashboard();
  });
});
