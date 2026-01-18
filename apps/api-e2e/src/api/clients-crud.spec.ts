import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../../api/src/app/app.module';
import { VatStatus } from '@accounting/common';

/**
 * E2E Tests for Clients CRUD Operations
 *
 * Test Scenarios:
 * 1. List clients with pagination and filtering
 * 2. Create client with validation
 * 3. Update client with changelog verification
 * 4. Delete client (Owner/Admin only)
 * 5. Restore soft-deleted client
 * 6. Multi-tenant isolation verification
 */
describe('Clients CRUD E2E Tests', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  let ownerBToken: string;
  let createdClientId: string;
  let deletedClientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    // Cleanup created test clients
    if (createdClientId && ownerToken) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/clients/${createdClientId}`)
          .set('Authorization', `Bearer ${ownerToken}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (deletedClientId && ownerToken) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/clients/${deletedClientId}`)
          .set('Authorization', `Bearer ${ownerToken}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  // ============================================
  // Authentication Setup
  // ============================================

  describe('Authentication Setup', () => {
    it('should login as company A owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'bartlomiej.zimny@onet.pl',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerToken = response.body.access_token;
    });

    it('should login as company A employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'bartlomiej.zimny@interia.pl',
          password: 'Employee123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      employeeToken = response.body.access_token;
    });

    it('should login as company B owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'bartlomiej.zimny@onet.pl',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerBToken = response.body.access_token;
    });
  });

  // ============================================
  // CREATE Client Tests
  // ============================================

  describe('POST /modules/clients - Create Client', () => {
    it('should create a new client with required fields only', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'E2E Test Client Basic',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Test Client Basic');
      expect(response.body.isActive).toBe(true);
      createdClientId = response.body.id;
    });

    it('should create a client with all fields', async () => {
      const clientData = {
        name: 'E2E Test Client Full',
        nip: '1234567890',
        email: 'test@e2e-client.com',
        phone: '+48 123 456 789',
        companySpecificity: 'Test company specificity notes',
        additionalInfo: 'Additional test information',
        gtuCode: 'GTU_01',
        amlGroup: 'LOW',
        employmentType: 'DG',
        vatStatus: VatStatus.VAT_MONTHLY,
        taxScheme: 'GENERAL',
        zusStatus: 'FULL',
      };

      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(clientData.name);
      expect(response.body.nip).toBe(clientData.nip);
      expect(response.body.email).toBe(clientData.email);
      expect(response.body.employmentType).toBe(clientData.employmentType);
      expect(response.body.vatStatus).toBe(clientData.vatStatus);

      // Store for cleanup
      deletedClientId = response.body.id;
    });

    it('should fail to create client without name', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          nip: '1234567890',
        })
        .expect(400);

      expect(response.body.message).toContain('name');
    });

    it('should fail to create client with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Invalid Email',
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail to create client without authentication', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients')
        .send({
          name: 'Unauthorized Client',
        })
        .expect(401);
    });

    it('should allow employee with write permission to create client', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'E2E Employee Created Client',
        })
        .expect(201);

      // The seeder grants write permissions to employees, so this should succeed
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Employee Created Client');

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/modules/clients/${response.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });
  });

  // ============================================
  // READ Client Tests
  // ============================================

  describe('GET /modules/clients - List Clients', () => {
    it('should list clients with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter by search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ search: 'E2E Test' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data.every((c: { name: string }) =>
        c.name.toLowerCase().includes('e2e') || c.name.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('should filter by VAT status', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ vatStatus: VatStatus.VAT_MONTHLY })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data.every((c: { vatStatus: string }) => c.vatStatus === VatStatus.VAT_MONTHLY)).toBe(true);
      }
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data.every((c: { isActive: boolean }) => c.isActive === true)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients')
        .expect(401);
    });
  });

  describe('GET /modules/clients/:id - Get Single Client', () => {
    it('should get client by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdClientId);
      expect(response.body.name).toBe('E2E Test Client Basic');
    });

    it('should fail with invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent client', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  // ============================================
  // Multi-Tenant Isolation Tests
  // ============================================

  describe('Multi-Tenant Isolation', () => {
    it('should not allow company B to access company A clients', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);

      // Company B should not see Company A's client
      expect(response.body.message).toContain('not found');
    });

    it('should not allow company B to list company A clients', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(200);

      // Company B should only see their own clients
      const clientIds = response.body.data.map((c: { id: string }) => c.id);
      expect(clientIds).not.toContain(createdClientId);
    });

    it('should not allow company B to update company A client', async () => {
      await request(app.getHttpServer())
        .patch(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow company B to delete company A client', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });
  });

  // ============================================
  // UPDATE Client Tests
  // ============================================

  describe('PATCH /modules/clients/:id - Update Client', () => {
    it('should update client name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'E2E Test Client Updated' })
        .expect(200);

      expect(response.body.name).toBe('E2E Test Client Updated');
    });

    it('should update multiple fields', async () => {
      const updateData = {
        email: 'updated@e2e-test.com',
        phone: '+48 987 654 321',
        vatStatus: VatStatus.NO,
      };

      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.email).toBe(updateData.email);
      expect(response.body.phone).toBe(updateData.phone);
      expect(response.body.vatStatus).toBe(updateData.vatStatus);
    });

    it('should fail to update with invalid email', async () => {
      await request(app.getHttpServer())
        .patch(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'not-valid-email' })
        .expect(400);
    });

    it('should not update non-existent client', async () => {
      await request(app.getHttpServer())
        .patch('/modules/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Ghost Client' })
        .expect(404);
    });
  });

  // ============================================
  // Changelog Tests
  // ============================================

  describe('GET /modules/clients/:id/changelog - Client History', () => {
    it('should retrieve client changelog', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${createdClientId}/changelog`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);

      // Should have at least CREATE and UPDATE entries
      if (response.body.logs.length > 0) {
        const log = response.body.logs[0];
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('changes');
        expect(log).toHaveProperty('changedBy');
      }
    });

    it('should record UPDATE action in changelog', async () => {
      // Make an update
      await request(app.getHttpServer())
        .patch(`/modules/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ additionalInfo: 'Changelog test update' })
        .expect(200);

      // Check changelog
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${createdClientId}/changelog`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const updateLogs = response.body.logs.filter(
        (log: { action: string }) => log.action === 'UPDATE'
      );
      expect(updateLogs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // DELETE Client Tests
  // ============================================

  describe('DELETE /modules/clients/:id - Delete Client', () => {
    it('should not allow employee to delete directly', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/clients/${deletedClientId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should allow owner to delete client', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/modules/clients/${deletedClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });

    it('should not find deleted client in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const clientIds = response.body.data.map((c: { id: string }) => c.id);
      expect(clientIds).not.toContain(deletedClientId);
    });

    it('should find deleted client when filtering inactive', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ isActive: false })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const clientIds = response.body.data.map((c: { id: string }) => c.id);
      expect(clientIds).toContain(deletedClientId);
    });
  });

  // ============================================
  // RESTORE Client Tests
  // ============================================

  describe('POST /modules/clients/:id/restore - Restore Client', () => {
    it('should restore deleted client', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${deletedClientId}/restore`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(deletedClientId);
      expect(response.body.isActive).toBe(true);
    });

    it('should find restored client in active list', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const clientIds = response.body.data.map((c: { id: string }) => c.id);
      expect(clientIds).toContain(deletedClientId);
    });

    it('should record RESTORE action in changelog', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${deletedClientId}/changelog`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const restoreLogs = response.body.logs.filter(
        (log: { action: string }) => log.action === 'RESTORE'
      );
      expect(restoreLogs.length).toBeGreaterThan(0);
    });

    it('should fail to restore non-deleted client', async () => {
      // Try to restore already active client
      await request(app.getHttpServer())
        .post(`/modules/clients/${deletedClientId}/restore`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });

  // ============================================
  // Custom Fields Tests
  // ============================================

  describe('Custom Fields API', () => {
    it('should get custom field values for client', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${createdClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should set custom field values', async () => {
      // First, get available field definitions
      const defsResponse = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      if (defsResponse.body.data && defsResponse.body.data.length > 0) {
        const fieldDef = defsResponse.body.data[0];

        const response = await request(app.getHttpServer())
          .put(`/modules/clients/${createdClientId}/custom-fields`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            values: {
              [fieldDef.id]: 'Test custom value',
            },
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });
});
