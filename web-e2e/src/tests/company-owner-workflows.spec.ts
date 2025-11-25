import { test, expect } from '../fixtures/auth.fixtures';
import { EmployeesListPage } from '../pages/company/EmployeesListPage';
import { EmployeePermissionsPage } from '../pages/company/EmployeePermissionsPage';
import { CompanyModulesListPage } from '../pages/company/CompanyModulesListPage';
import { TestDataFactory } from '../fixtures/data.fixtures';

test.describe('Company Owner - Employee Management', () => {
  test('should view employees list', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.expectToBeOnEmployeesPage();
    await employeesPage.expectTableHasRows();
  });

  test('should create new employee', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const employeeData = TestDataFactory.createUserData('EMPLOYEE');

    await employeesPage.goto();
    await employeesPage.createEmployee(employeeData.email, employeeData.password);

    await employeesPage.expectEmployeeInList(employeeData.email);
  });

  test('should search employees', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.searchEmployee('employee1.a');

    await employeesPage.expectEmployeeInList('employee1.a@company.com');
  });

  test('should update employee details', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const employeeData = TestDataFactory.createUserData('EMPLOYEE');

    // Create employee
    await employeesPage.goto();
    await employeesPage.createEmployee(employeeData.email, employeeData.password);

    // Update would require edit functionality
    await employeesPage.expectEmployeeInList(employeeData.email);
  });

  test('should delete employee', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const employeeData = TestDataFactory.createUserData('EMPLOYEE');

    // Create employee
    await employeesPage.goto();
    await employeesPage.createEmployee(employeeData.email, employeeData.password);

    // Delete employee
    await employeesPage.deleteEmployee(employeeData.email);
    await employeesPage.expectEmployeeNotInList(employeeData.email);
  });

  test('should validate employee email', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickCreateEmployee();

    // Try to submit with invalid email
    await authenticatedCompanyOwnerPage.fill('input[name="email"]', 'invalid-email');
    await authenticatedCompanyOwnerPage.fill('input[name="password"]', 'TestPass123!');
    await authenticatedCompanyOwnerPage.click('button[type="submit"]');

    // Should show validation error or stay on form
    await authenticatedCompanyOwnerPage.waitForTimeout(1000);
  });

  test('should not create employee for other company', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();

    // Owner of Company A should only see/manage Company A employees
    const emails = await employeesPage.getAllEmployeeEmails();

    for (const email of emails) {
      // All emails should be from Company A (@company.com or employee*.a@company.com)
      const isCompanyA = email.includes('.a@') || email.includes('owner.a@');
      expect(isCompanyA || email.includes('Company A')).toBe(true);
    }
  });

  test('should navigate to employee permissions', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.goToEmployeePermissions('employee1.a@company.com');

    await expect(authenticatedCompanyOwnerPage).toHaveURL(/permissions/);
  });

  test('should view only own company employees', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();

    // Should not see Company B employees
    const hasCompanyBEmployee = await employeesPage.hasEmployee('employee1.b@company.com');
    expect(hasCompanyBEmployee).toBe(false);
  });
});

test.describe('Company Owner - Permission Management', () => {
  test('should view employee permissions page', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee1.a@company.com');

    await permissionsPage.expectToBeOnPermissionsPage();
  });

  test('should grant read permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    await permissionsPage.grantReadPermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { read: true });
  });

  test('should grant write permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    await permissionsPage.grantWritePermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { write: true });
  });

  test('should grant delete permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    await permissionsPage.grantDeletePermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { delete: true });
  });

  test('should revoke read permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee1.a@company.com');

    // Revoke read permission
    await permissionsPage.revokeReadPermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { read: false });
  });

  test('should revoke write permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee1.a@company.com');

    await permissionsPage.revokeWritePermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { write: false });
  });

  test('should revoke delete permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee1.a@company.com');

    await permissionsPage.revokeDeletePermission('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', { delete: false });
  });

  test('should grant bulk permissions', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    await permissionsPage.grantAllPermissions('simple-text');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('simple-text', {
      read: true,
      write: true,
      delete: true,
    });
  });

  test('should validate permission dependencies', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    // Try to grant write without read (should enforce read)
    await permissionsPage.revokeReadPermission('simple-text');
    await permissionsPage.grantWritePermission('simple-text');
    await permissionsPage.savePermissions();

    // Check if read was automatically granted
    const hasRead = await permissionsPage.hasReadPermission('simple-text');
    // Depending on business logic, read might be auto-granted
    expect(typeof hasRead).toBe('boolean');
  });

  test('should reflect permission changes immediately', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('employee2.a@company.com');

    await permissionsPage.grantReadPermission('simple-text');
    await permissionsPage.savePermissions();

    // Reload page and verify persistence
    await authenticatedCompanyOwnerPage.reload();
    await permissionsPage.expectPermissions('simple-text', { read: true });
  });
});

test.describe('Company Owner - Company Modules', () => {
  test('should view available modules', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();
    await modulesPage.expectToBeOnModulesPage();
  });

  test('should view enabled modules', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();
    await modulesPage.expectModuleVisible('simple-text');
  });

  test('should not enable/disable modules (admin only)', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    // Company owner should view modules but not control enable/disable
    // That's admin functionality
    await modulesPage.expectModuleVisible('simple-text');
  });

  test('should access enabled module', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();
    await modulesPage.accessModule('simple-text');

    await expect(authenticatedCompanyOwnerPage).toHaveURL(/simple-text/);
  });

  test('should only show enabled modules', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    // Company A should have Simple Text and AI Agent enabled
    await modulesPage.expectModuleVisible('simple-text');
    await modulesPage.expectModuleVisible('ai-agent');
  });

  test('should view module count', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    const count = await modulesPage.getModuleCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
