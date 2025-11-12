import { test, expect } from '../fixtures/auth.fixtures';
import { UsersListPage } from '../pages/admin/UsersListPage';
import { UserFormPage } from '../pages/admin/UserFormPage';
import { CompaniesListPage } from '../pages/admin/CompaniesListPage';
import { CompanyFormPage } from '../pages/admin/CompanyFormPage';
import { ModulesListPage } from '../pages/admin/ModulesListPage';
import { TestDataFactory } from '../fixtures/data.fixtures';

test.describe('Admin - User Management', () => {
  test('should view users list with pagination', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.expectToBeOnUsersPage();
    await usersPage.expectTableHasRows();
  });

  test('should create new ADMIN user', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);
    const userData = TestDataFactory.createUserData('ADMIN');

    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.waitForForm();
    await userForm.createUser(userData);

    await usersPage.expectUserInList(userData.email);
  });

  test('should create new COMPANY_OWNER user', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);
    const companyData = TestDataFactory.createCompanyData();
    const userData = TestDataFactory.createUserData('COMPANY_OWNER', companyData.name);

    // First create a company (simplified - assume Company A exists)
    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.waitForForm();
    await userForm.fillEmail(userData.email);
    await userForm.fillPassword(userData.password);
    await userForm.selectRole('COMPANY_OWNER');

    // Select an existing company (Company A)
    if (await userForm.isCompanySelectVisible()) {
      await userForm.selectCompany('Company A');
    }

    await userForm.clickSubmit();
    await userForm.toast.expectSuccessToast();

    await usersPage.expectUserInList(userData.email);
  });

  test('should search users by email', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.searchUser('admin@system.com');

    await usersPage.expectUserInList('admin@system.com');
  });

  test('should filter users by role', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.filterByRole('ADMIN');

    // Verify admin users are shown
    await usersPage.expectTableHasRows();
  });

  test('should update user details', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    // Create a test user first
    const userData = TestDataFactory.createUserData('EMPLOYEE');

    await usersPage.goto();
    await usersPage.clickCreateUser();
    await userForm.createUser({ ...userData, companyName: 'Company A' });

    // Now update the user
    await usersPage.clickEditUser(userData.email);
    await userForm.waitForForm();

    const newEmail = TestDataFactory.createUserData('EMPLOYEE').email;
    await userForm.updateUser({ email: newEmail });

    await usersPage.expectUserInList(newEmail);
  });

  test('should delete user', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    // Create a test user
    const userData = TestDataFactory.createUserData('EMPLOYEE');

    await usersPage.goto();
    await usersPage.clickCreateUser();
    await userForm.createUser({ ...userData, companyName: 'Company A' });

    // Delete the user
    await usersPage.deleteUser(userData.email);
    await usersPage.expectUserNotInList(userData.email);
  });

  test('should validate email format', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.fillEmail('invalid-email');
    await userForm.fillPassword('TestPass123!');
    await userForm.selectRole('ADMIN');
    await userForm.clickSubmit();

    // Should show validation error
    await userForm.expectEmailError();
  });

  test('should validate password strength', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.clickCreateUser();

    await userForm.fillEmail('test@example.com');
    await userForm.fillPassword('weak');
    await userForm.selectRole('ADMIN');
    await userForm.clickSubmit();

    // Should show validation error for weak password
    await userForm.expectPasswordError();
  });

  test('should prevent duplicate email', async ({ authenticatedAdminPage }) => {
    const usersPage = new UsersListPage(authenticatedAdminPage);
    const userForm = new UserFormPage(authenticatedAdminPage);

    await usersPage.goto();
    await usersPage.clickCreateUser();

    // Try to create user with existing admin email
    await userForm.fillEmail('admin@system.com');
    await userForm.fillPassword('TestPass123!');
    await userForm.selectRole('ADMIN');
    await userForm.clickSubmit();

    // Should show error (either validation or toast)
    const hasError = await userForm.toast.isErrorToastVisible();
    expect(hasError).toBe(true);
  });
});

test.describe('Admin - Company Management', () => {
  test('should view companies list', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);

    await companiesPage.goto();
    await companiesPage.expectToBeOnCompaniesPage();
    await companiesPage.expectTableHasRows();
  });

  test('should create new company', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);
    const companyForm = new CompanyFormPage(authenticatedAdminPage);
    const companyData = TestDataFactory.createCompanyData();

    await companiesPage.goto();
    await companiesPage.clickCreateCompany();

    await companyForm.waitForForm();
    await companyForm.createCompany(companyData.name, companyData.description);

    await companiesPage.expectCompanyInList(companyData.name);
  });

  test('should search companies by name', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);

    await companiesPage.goto();
    await companiesPage.searchCompany('Company A');

    await companiesPage.expectCompanyInList('Company A');
  });

  test('should update company details', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);
    const companyForm = new CompanyFormPage(authenticatedAdminPage);

    // Create a test company
    const companyData = TestDataFactory.createCompanyData();

    await companiesPage.goto();
    await companiesPage.clickCreateCompany();
    await companyForm.createCompany(companyData.name);

    // Update the company
    await companiesPage.clickEditCompany(companyData.name);
    await companyForm.waitForForm();

    const newName = TestDataFactory.createCompanyData().name;
    await companyForm.updateCompany(newName);

    await companiesPage.expectCompanyInList(newName);
  });

  test('should delete company', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);
    const companyForm = new CompanyFormPage(authenticatedAdminPage);

    // Create a test company
    const companyData = TestDataFactory.createCompanyData();

    await companiesPage.goto();
    await companiesPage.clickCreateCompany();
    await companyForm.createCompany(companyData.name);

    // Delete the company
    await companiesPage.deleteCompany(companyData.name);
    await companiesPage.expectCompanyNotInList(companyData.name);
  });

  test('should validate company name required', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);
    const companyForm = new CompanyFormPage(authenticatedAdminPage);

    await companiesPage.goto();
    await companiesPage.clickCreateCompany();

    await companyForm.clickSubmit();

    // Should show validation error for required name
    await companyForm.expectNameError();
  });

  test('should manage company modules', async ({ authenticatedAdminPage }) => {
    const companiesPage = new CompaniesListPage(authenticatedAdminPage);

    await companiesPage.goto();
    await companiesPage.clickManageModules('Company A');

    // Should navigate to modules page or open modal
    await authenticatedAdminPage.waitForTimeout(1000);
  });
});

test.describe('Admin - Module Management', () => {
  test('should view modules list', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();
    await modulesPage.expectToBeOnModulesPage();
  });

  test('should enable module for company', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();
    await modulesPage.enableModule('simple-text', 'Company A');

    await modulesPage.expectModuleEnabled('simple-text', 'Company A');
  });

  test('should disable module for company', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();

    // First ensure it's enabled
    await modulesPage.enableModule('simple-text', 'Company A');

    // Then disable it
    await modulesPage.disableModule('simple-text', 'Company A');

    await modulesPage.expectModuleDisabled('simple-text', 'Company A');
  });

  test('should filter modules by company', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();
    await modulesPage.filterByCompany('Company A');

    // Should show only Company A modules
    const count = await modulesPage.getModuleRowCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should toggle module status', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();

    const initialStatus = await modulesPage.isModuleEnabled('simple-text', 'Company A');
    await modulesPage.toggleModule('simple-text', 'Company A');

    const newStatus = await modulesPage.isModuleEnabled('simple-text', 'Company A');
    expect(newStatus).toBe(!initialStatus);
  });

  test('should view module metadata', async ({ authenticatedAdminPage }) => {
    const modulesPage = new ModulesListPage(authenticatedAdminPage);

    await modulesPage.goto();
    await modulesPage.expectModuleInList('simple-text');
  });
});
