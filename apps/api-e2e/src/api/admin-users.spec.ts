import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Admin Users E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let ownerToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdUserId) {
      try {
        await request(app.getHttpServer())
          .delete(`/admin/users/${createdUserId}`)
          .set(...authHeader(adminToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('GET /admin/users', () => {
    it('should list users for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set(...authHeader(ownerToken))
        .expect(403);
    });
  });

  describe('POST /admin/users', () => {
    it('should create a user', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set(...authHeader(adminToken))
        .send({
          email: `e2e-test-${Date.now()}@example.com`,
          password: 'TestPass123!',
          firstName: 'E2E',
          lastName: 'TestUser',
          role: 'EMPLOYEE',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdUserId = res.body.id;
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should update user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${createdUserId}`)
        .set(...authHeader(adminToken))
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.firstName).toBe('Updated');
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('should soft-delete user', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${createdUserId}`)
        .set(...authHeader(adminToken))
        .expect(200);

      createdUserId = undefined;
    });
  });
});
