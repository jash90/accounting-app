import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../api/src/app/app.module';

describe('Delete Request Workflow E2E Tests', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  let testClientId: string;
  let testDeleteRequestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Setup: Authentication and Client Creation', () => {
    it('should login as company owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'owner.a@company.com',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerToken = response.body.access_token;
    });

    it('should login as employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1.a@company.com',
          password: 'Employee123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      employeeToken = response.body.access_token;
    });

    it('should create a test client for deletion workflow', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Client for Deletion',
          nip: '1234567890',
          vatStatus: 'monthly',
          employmentType: 'DG',
          taxScheme: 'general',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Client for Deletion');
      expect(response.body.isActive).toBe(true);
      testClientId = response.body.id;
    });
  });

  describe('Workflow 1: Employee creates request → Owner approves → Client deleted', () => {
    let approvalTestClientId: string;
    let approvalRequestId: string;

    it('should create a client for approval test', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Client for Approval Test',
          nip: '9876543210',
          vatStatus: 'quarterly',
          employmentType: 'DG_R',
          taxScheme: 'lump_sum',
        })
        .expect(201);

      approvalTestClientId = response.body.id;
    });

    it('should allow employee to create delete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${approvalTestClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Client no longer needed - approval test',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.reason).toBe('Client no longer needed - approval test');
      expect(response.body.clientId).toBe(approvalTestClientId);
      approvalRequestId = response.body.id;
    });

    it('should prevent duplicate delete request for same client', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${approvalTestClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Duplicate request',
        })
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('errorCode');
      expect(response.body.errorCode).toBe('DELETE_REQUEST_006'); // ALREADY_PROCESSED
    });

    it('should show delete request in pending list (owner)', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/delete-requests/pending')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const pendingRequest = response.body.find(
        (req: any) => req.id === approvalRequestId,
      );
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.status).toBe('PENDING');
    });

    it('should show delete request in employee my-requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/delete-requests/my-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const myRequest = response.body.find(
        (req: any) => req.id === approvalRequestId,
      );
      expect(myRequest).toBeDefined();
      expect(myRequest.status).toBe('PENDING');
    });

    it('should prevent employee from approving their own request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403); // Forbidden

      expect(response.body).toHaveProperty('errorCode');
      expect(response.body.errorCode).toBe('CLIENT_003'); // PERMISSION_DENIED
    });

    it('should allow owner to approve delete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('approved');
      expect(response.body).toHaveProperty('deletedClient');
      expect(response.body.deletedClient.id).toBe(approvalTestClientId);
    });

    it('should verify client is soft deleted (isActive = false)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${approvalTestClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404); // Client should not be found in normal queries when soft deleted

      expect(response.body).toHaveProperty('errorCode');
      expect(response.body.errorCode).toBe('CLIENT_001'); // CLIENT_NOT_FOUND
    });

    it('should verify delete request status is APPROVED', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/delete-requests/${approvalRequestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body).toHaveProperty('processedById');
      expect(response.body).toHaveProperty('processedAt');
    });

    it('should prevent processing already approved request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${approvalRequestId}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          rejectionReason: 'Should not work',
        })
        .expect(400); // Bad Request

      expect(response.body).toHaveProperty('errorCode');
      expect(response.body.errorCode).toBe('DELETE_REQUEST_006'); // ALREADY_PROCESSED
    });
  });

  describe('Workflow 2: Employee creates request → Owner rejects → Client stays active', () => {
    let rejectionTestClientId: string;
    let rejectionRequestId: string;

    it('should create a client for rejection test', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Client for Rejection Test',
          nip: '5555555555',
          vatStatus: 'no',
          employmentType: 'DZ',
          taxScheme: 'tax_card',
        })
        .expect(201);

      rejectionTestClientId = response.body.id;
    });

    it('should allow employee to create delete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${rejectionTestClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Client needs to be deleted - rejection test',
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      rejectionRequestId = response.body.id;
    });

    it('should prevent employee from rejecting their own request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${rejectionRequestId}/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          rejectionReason: 'Should not work',
        })
        .expect(403); // Forbidden

      expect(response.body.errorCode).toBe('CLIENT_003'); // PERMISSION_DENIED
    });

    it('should allow owner to reject delete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${rejectionRequestId}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          rejectionReason: 'Client is still needed for business operations',
        })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejectionReason).toBe(
        'Client is still needed for business operations',
      );
      expect(response.body).toHaveProperty('processedById');
      expect(response.body).toHaveProperty('processedAt');
    });

    it('should verify client is still active after rejection', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${rejectionTestClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(rejectionTestClientId);
      expect(response.body.isActive).toBe(true);
    });

    it('should prevent processing already rejected request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/delete-requests/${rejectionRequestId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400); // Bad Request

      expect(response.body.errorCode).toBe('DELETE_REQUEST_006'); // ALREADY_PROCESSED
    });
  });

  describe('Workflow 3: Employee creates request → Employee cancels → Request deleted', () => {
    let cancelTestClientId: string;
    let cancelRequestId: string;

    it('should create a client for cancellation test', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Client for Cancellation Test',
          nip: '7777777777',
          vatStatus: 'monthly',
          employmentType: 'DG',
          taxScheme: 'general',
        })
        .expect(201);

      cancelTestClientId = response.body.id;
    });

    it('should allow employee to create delete request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${cancelTestClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Will be cancelled - cancellation test',
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      cancelRequestId = response.body.id;
    });

    it('should allow employee to cancel their own request', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/modules/clients/delete-requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.message).toContain('cancelled');
    });

    it('should verify request is deleted after cancellation', async () => {
      await request(app.getHttpServer())
        .get(`/modules/clients/delete-requests/${cancelRequestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404); // Request not found
    });

    it('should verify client is still active after cancellation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${cancelTestClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(cancelTestClientId);
      expect(response.body.isActive).toBe(true);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should return 404 for non-existent client delete request', async () => {
      const fakeClientId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .post(`/modules/clients/${fakeClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Should fail',
        })
        .expect(404);

      expect(response.body.errorCode).toBe('CLIENT_001'); // CLIENT_NOT_FOUND
    });

    it('should return 404 for non-existent delete request ID', async () => {
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/modules/clients/delete-requests/${fakeRequestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should allow filtering delete requests by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/delete-requests?status=APPROVED')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((req: any) => {
        expect(req.status).toBe('APPROVED');
      });
    });

    it('should require authentication for all delete request endpoints', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients/delete-requests')
        .expect(401); // Unauthorized

      await request(app.getHttpServer())
        .post(`/modules/clients/${testClientId}/delete-request`)
        .send({ reason: 'Test' })
        .expect(401);
    });

    it('should require clients module access', async () => {
      // Login as admin (who doesn't have access to business modules)
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@system.com',
          password: 'Admin123!',
        })
        .expect(200);

      const adminToken = adminResponse.body.access_token;

      // Admin should not be able to access clients module
      await request(app.getHttpServer())
        .get('/modules/clients/delete-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403); // Forbidden - no module access
    });
  });

  describe('Transaction Consistency', () => {
    it('should maintain data consistency during approval process', async () => {
      // Create a client for transaction test
      const createResponse = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Transaction Test Client',
          nip: '8888888888',
          vatStatus: 'monthly',
          employmentType: 'DG',
          taxScheme: 'general',
        })
        .expect(201);

      const transactionClientId = createResponse.body.id;

      // Create delete request
      const deleteRequestResponse = await request(app.getHttpServer())
        .post(`/modules/clients/${transactionClientId}/delete-request`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: 'Transaction consistency test',
        })
        .expect(201);

      const transactionRequestId = deleteRequestResponse.body.id;

      // Approve the request
      await request(app.getHttpServer())
        .post(
          `/modules/clients/delete-requests/${transactionRequestId}/approve`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Verify both the request and client were updated
      const requestResponse = await request(app.getHttpServer())
        .get(`/modules/clients/delete-requests/${transactionRequestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(requestResponse.body.status).toBe('APPROVED');

      // Client should be soft deleted (not found in normal queries)
      await request(app.getHttpServer())
        .get(`/modules/clients/${transactionClientId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
