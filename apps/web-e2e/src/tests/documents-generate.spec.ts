/* eslint-disable playwright/expect-expect */
import { expect, test, TEST_CREDENTIALS } from '../fixtures/auth.fixtures';
import { TestDataFactory } from '../fixtures/data.fixtures';
import { APIHelper, createAPIHelper } from '../helpers/api.helpers';
import { DocumentsPage } from '../pages/modules/DocumentsPage';

const BASE_PATH = '/company/modules/documents';

// ─── Documents - Template & Generation ──────────────────────────────────────

test.describe.serial('Documents Module - Templates & Generation', () => {
  let api: APIHelper;
  let templateId: string;
  let clientId: string;
  const templateName = `E2E Template ${Date.now()}`;

  test.beforeAll(async () => {
    api = await createAPIHelper(
      TEST_CREDENTIALS.companyOwner.email,
      TEST_CREDENTIALS.companyOwner.password
    );

    // Create a template and client via API for generated documents tests
    const templateData = TestDataFactory.createDocumentTemplateData({
      name: `API Template ${Date.now()}`,
    });
    const template = await api.createDocumentTemplate(templateData);
    templateId = template.id;

    const clientData = TestDataFactory.createClientData();
    const client = await api.createClient(clientData);
    clientId = client.id;
  });

  test.afterAll(async () => {
    // Clean up API-created resources
    if (templateId) {
      await api.deleteDocumentTemplate(templateId).catch(() => {});
    }
    if (clientId) {
      await api.deleteClient(clientId).catch(() => {});
    }
    await api.dispose();
  });

  test('should display documents dashboard', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const documentsPage = new DocumentsPage(page);

    await documentsPage.gotoDashboard(BASE_PATH);
    await page.waitForLoadState('networkidle');
    await documentsPage.expectToBeOnDashboard();
  });

  test('should navigate to templates list', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const documentsPage = new DocumentsPage(page);

    await documentsPage.gotoDashboard(BASE_PATH);
    await page.waitForLoadState('networkidle');

    await documentsPage.navigateToTemplates();
    await page.waitForLoadState('networkidle');
    await documentsPage.expectToBeOnTemplatesPage();
  });

  test('should create a document template', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const documentsPage = new DocumentsPage(page);

    await documentsPage.gotoTemplatesList(BASE_PATH);
    await page.waitForLoadState('networkidle');

    await documentsPage.clickCreateTemplate();
    await documentsPage.fillTemplateForm({
      name: templateName,
      description: 'E2E test document template',
      templateContent: 'Witaj {{client_name}}, to jest dokument testowy.',
    });
    await documentsPage.submitTemplateForm();

    await page.waitForLoadState('networkidle');
    await documentsPage.expectTemplateInList(templateName);
  });

  test('should navigate to generated documents list', async ({ authenticatedCompanyOwnerPage }) => {
    const page = authenticatedCompanyOwnerPage;
    const documentsPage = new DocumentsPage(page);

    await documentsPage.gotoDashboard(BASE_PATH);
    await page.waitForLoadState('networkidle');

    await documentsPage.navigateToGenerated();
    await page.waitForLoadState('networkidle');

    // Verify we are on the generated documents page
    await expect(page).toHaveURL(/\/generated/);
  });
});
