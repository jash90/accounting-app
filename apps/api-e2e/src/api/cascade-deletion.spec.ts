import axios from 'axios';

describe('/api/admin/companies (cascade deletion)', () => {
  let adminToken: string;
  let companyId: string;
  let employeeId: string;
  const moduleSlug = 'simple-text';
  const apiUrl = `http://localhost:3333`;

  beforeAll(async () => {
    // Login as admin
    const loginResponse = await axios.post(`${apiUrl}/api/auth/login`, {
      email: 'admin@test.com',
      password: 'adminpassword',
    });
    adminToken = loginResponse.data.access_token;
  });

  beforeEach(async () => {
    // Create a test company
    const companyResponse = await axios.post(
      `${apiUrl}/api/admin/companies`,
      {
        name: `Test Company ${Date.now()}`,
        ownerId: '5e5c7f0f-7b8a-4c9e-8d6a-9f8e7d6c5b4a', // Use existing owner ID
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    companyId = companyResponse.data.id;

    // Create a test employee
    const employeeResponse = await axios.post(
      `${apiUrl}/api/admin/users`,
      {
        email: `test.employee.${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Employee',
        role: 'EMPLOYEE',
        companyId: companyId,
        isActive: true,
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    employeeId = employeeResponse.data.id;
  });

  describe('Module access cascade deletion', () => {
    it('should remove all employee permissions when company loses module access', async () => {
      // Step 1: Get module ID
      const modulesResponse = await axios.get(`${apiUrl}/api/modules`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const module = modulesResponse.data.find(m => m.slug === moduleSlug);
      expect(module).toBeDefined();
      const moduleId = module.id;

      // Step 2: Grant module access to company
      await axios.post(
        `${apiUrl}/api/modules/companies/${companyId}/${moduleId}`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // Step 3: Grant module permissions to employee as company owner
      // First get company owner token
      const ownerLoginResponse = await axios.post(`${apiUrl}/api/auth/login`, {
        email: 'owner.a@company.com',
        password: 'ownerpassword',
      });
      const ownerToken = ownerLoginResponse.data.access_token;

      // Update the employee's company to match the owner's company
      const ownerMeResponse = await axios.get(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const ownerCompanyId = ownerMeResponse.data.companyId;

      // Update employee to belong to owner's company
      await axios.patch(
        `${apiUrl}/api/admin/users/${employeeId}`,
        {
          companyId: ownerCompanyId,
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // Grant module to owner's company first
      await axios.post(
        `${apiUrl}/api/modules/companies/${ownerCompanyId}/${moduleId}`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // Now grant permissions to employee as company owner
      await axios.post(
        `${apiUrl}/api/modules/employees/${employeeId}/${moduleSlug}`,
        {
          canRead: true,
          canWrite: true,
          canDelete: false,
        },
        {
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );

      // Step 4: Verify employee has permissions
      const permissionsBeforeResponse = await axios.get(
        `${apiUrl}/api/modules/employees/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );
      const permissionBefore = permissionsBeforeResponse.data.find(p => p.module.slug === moduleSlug);
      expect(permissionBefore).toBeDefined();
      expect(permissionBefore.canRead).toBe(true);
      expect(permissionBefore.canWrite).toBe(true);

      // Step 5: Revoke module access from company (as admin)
      await axios.delete(
        `${apiUrl}/api/modules/companies/${ownerCompanyId}/${moduleId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // Step 6: Verify employee permissions are removed
      const permissionsAfterResponse = await axios.get(
        `${apiUrl}/api/modules/employees/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );

      // Employee should no longer have permissions for this module
      const permissionAfter = permissionsAfterResponse.data.find(p => p.module.slug === moduleSlug);
      expect(permissionAfter).toBeUndefined();

      // Step 7: Verify company no longer has access to module
      const companyModulesResponse = await axios.get(
        `${apiUrl}/api/modules/companies/${ownerCompanyId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const companyModuleAccess = companyModulesResponse.data.find(m => m.module.slug === moduleSlug);
      if (companyModuleAccess) {
        expect(companyModuleAccess.isEnabled).toBe(false);
      }
    });
  });

  describe('Cleanup orphaned permissions endpoint', () => {
    it('should cleanup orphaned permissions for all companies', async () => {
      // Step 1: Call cleanup endpoint
      const cleanupResponse = await axios.post(
        `${apiUrl}/api/modules/cleanup/orphaned-permissions`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // Step 2: Verify response structure
      expect(cleanupResponse.data).toHaveProperty('deletedCount');
      expect(cleanupResponse.data).toHaveProperty('companies');
      expect(cleanupResponse.data.deletedCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(cleanupResponse.data.companies)).toBe(true);

      // If there were orphaned permissions, verify the structure
      if (cleanupResponse.data.companies.length > 0) {
        const cleanupResult = cleanupResponse.data.companies[0];
        expect(cleanupResult).toHaveProperty('companyId');
        expect(cleanupResult).toHaveProperty('companyName');
        expect(cleanupResult).toHaveProperty('moduleId');
        expect(cleanupResult).toHaveProperty('moduleName');
        expect(cleanupResult).toHaveProperty('deletedPermissions');
      }
    });
  });

  afterEach(async () => {
    // Cleanup: Delete test employee and company
    if (employeeId) {
      try {
        await axios.delete(`${apiUrl}/api/admin/users/${employeeId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (companyId) {
      try {
        await axios.delete(`${apiUrl}/api/admin/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});