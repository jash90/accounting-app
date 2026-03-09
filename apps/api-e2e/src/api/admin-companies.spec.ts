import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Admin Companies E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdCompanyId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');
  });

  afterAll(async () => {
    if (createdCompanyId) {
      try {
        await request(app.getHttpServer())
          .delete(`/admin/companies/${createdCompanyId}`)
          .set(...authHeader(adminToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('GET /admin/companies', () => {
    it('should list companies', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/companies')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /admin/companies', () => {
    it('should create a company', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/companies')
        .set(...authHeader(adminToken))
        .send({
          name: `E2E Test Company ${Date.now()}`,
          nip: '1234567890',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdCompanyId = res.body.id;
    });
  });

  describe('GET /admin/companies/:id', () => {
    it('should get company detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/companies/${createdCompanyId}`)
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body).toHaveProperty('id', createdCompanyId);
      expect(res.body).toHaveProperty('name');
    });
  });

  describe('PATCH /admin/companies/:id', () => {
    it('should update company', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/companies/${createdCompanyId}`)
        .set(...authHeader(adminToken))
        .send({ name: 'Updated E2E Company' })
        .expect(200);

      expect(res.body.name).toBe('Updated E2E Company');
    });
  });

  describe('DELETE /admin/companies/:id', () => {
    it('should delete company', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/companies/${createdCompanyId}`)
        .set(...authHeader(adminToken))
        .expect(200);

      createdCompanyId = undefined;
    });
  });
});
