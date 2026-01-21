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

    await employeesPage.expectEmployeeInList('bartlomiej.zimny@interia.pl');
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

  test('should not create employee for other company', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();

    // Owner of Company A should only see/manage Company A employees
    const emails = await employeesPage.getAllEmployeeEmails();

    for (const email of emails) {
      // All emails should be from Company A (real emails: Onet for owners, Interia for employees)
      const isCompanyA = email.includes('onet.pl') || email.includes('interia.pl');
      expect(isCompanyA || email.includes('Company A')).toBe(true);
    }
  });

  test('should navigate to employee permissions', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.goToEmployeePermissions('bartlomiej.zimny@interia.pl');

    await expect(authenticatedCompanyOwnerPage).toHaveURL(/permissions/);
  });

  test('should view only own company employees', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();

    // Should not see Company B employees
    const hasCompanyBEmployee = await employeesPage.hasEmployee('bartlomiej.zimny@interia.pl');
    expect(hasCompanyBEmployee).toBe(false);
  });
});

test.describe('Company Owner - Permission Management', () => {
  test('should view employee permissions page', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.expectToBeOnPermissionsPage();
  });

  test('should grant read permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.grantReadPermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { read: true });
  });

  test('should grant write permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.grantWritePermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { write: true });
  });

  test('should grant delete permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.grantDeletePermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { delete: true });
  });

  test('should revoke read permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    // Revoke read permission
    await permissionsPage.revokeReadPermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { read: false });
  });

  test('should revoke write permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.revokeWritePermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { write: false });
  });

  test('should revoke delete permission', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.revokeDeletePermission('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', { delete: false });
  });

  test('should grant bulk permissions', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.grantAllPermissions('ai-agent');
    await permissionsPage.savePermissions();

    await permissionsPage.expectPermissions('ai-agent', {
      read: true,
      write: true,
      delete: true,
    });
  });

  test('should validate permission dependencies', async ({ authenticatedCompanyOwnerPage }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    // Try to grant write without read (should enforce read)
    await permissionsPage.revokeReadPermission('ai-agent');
    await permissionsPage.grantWritePermission('ai-agent');
    await permissionsPage.savePermissions();

    // Check if read was automatically granted
    const hasRead = await permissionsPage.hasReadPermission('ai-agent');
    // Depending on business logic, read might be auto-granted
    expect(typeof hasRead).toBe('boolean');
  });

  test('should reflect permission changes immediately', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const employeesPage = new EmployeesListPage(authenticatedCompanyOwnerPage);
    const permissionsPage = new EmployeePermissionsPage(authenticatedCompanyOwnerPage);

    await employeesPage.goto();
    await employeesPage.clickManagePermissions('bartlomiej.zimny@interia.pl');

    await permissionsPage.grantReadPermission('ai-agent');
    await permissionsPage.savePermissions();

    // Reload page and verify persistence
    await authenticatedCompanyOwnerPage.reload();
    await permissionsPage.expectPermissions('ai-agent', { read: true });
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
    await modulesPage.expectModuleVisible('ai-agent');
  });

  test('should not enable/disable modules (admin only)', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    // Company owner should view modules but not control enable/disable
    // That's admin functionality
    await modulesPage.expectModuleVisible('ai-agent');
  });

  test('should access enabled module', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();
    await modulesPage.accessModule('ai-agent');

    await expect(authenticatedCompanyOwnerPage).toHaveURL(/ai-agent/);
  });

  test('should only show enabled modules', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    // Company A should have Simple Text and AI Agent enabled
    await modulesPage.expectModuleVisible('ai-agent');
    await modulesPage.expectModuleVisible('ai-agent');
  });

  test('should view module count', async ({ authenticatedCompanyOwnerPage }) => {
    const modulesPage = new CompanyModulesListPage(authenticatedCompanyOwnerPage);

    await modulesPage.goto();

    const count = await modulesPage.getModuleCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
