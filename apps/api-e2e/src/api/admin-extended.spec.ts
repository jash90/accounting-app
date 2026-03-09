import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Admin Extended E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');

    // Get a company for available-owners test
    const compRes = await request(app.getHttpServer())
      .get('/admin/companies')
      .set(...authHeader(adminToken))
      .query({ page: 1, limit: 1 })
      .expect(200);
    if (compRes.body.data?.length > 0) {
      companyId = compRes.body.data[0].id;
    }

    // Get a user for status toggle test
    const userRes = await request(app.getHttpServer())
      .get('/admin/users')
      .set(...authHeader(adminToken))
      .query({ page: 1, limit: 1 })
      .expect(200);
    if (userRes.body.data?.length > 0) {
      userId = userRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/companies/:id/available-owners', () => {
    it('should list available owners for company', async () => {
      if (!companyId) return;

      const res = await request(app.getHttpServer())
        .get(`/admin/companies/${companyId}/available-owners`)
        .set(...authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /admin/modules/discovery', () => {
    it('should return discovered modules', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/modules/discovery')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /admin/users?search=', () => {
    it('should search users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set(...authHeader(adminToken))
        .query({ search: 'test' })
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('should toggle user active status', async () => {
      if (!userId) return;

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/status`)
        .set(...authHeader(adminToken))
        .send({ isActive: true })
        .expect((r) => {
          expect([200, 204]).toContain(r.status);
        });

      if (res.body) {
        expect(res.body).toBeDefined();
      }
    });
  });
});
