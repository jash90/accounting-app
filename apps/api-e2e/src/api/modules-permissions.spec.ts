import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Modules & Permissions E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let _employeeToken: string;
  let moduleId: string;
  let companyId: string;
  let employeeId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');
    ownerToken = await loginAs(app, 'owner');
    _employeeToken = await loginAs(app, 'employee');

    // Get company and employee IDs from existing data
    const companyRes = await request(app.getHttpServer())
      .get('/company')
      .set(...authHeader(ownerToken))
      .expect(200);
    companyId = companyRes.body.id;

    const empRes = await request(app.getHttpServer())
      .get('/company/employees')
      .set(...authHeader(ownerToken))
      .expect(200);
    if (empRes.body.data?.length > 0) {
      employeeId = empRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/modules', () => {
    it('should list all modules (admin)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/modules')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        moduleId = res.body[0].id;
        expect(res.body[0]).toHaveProperty('name');
      }
    });

    it('should deny access for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/modules')
        .set(...authHeader(ownerToken))
        .expect(403);
    });
  });

  describe('POST /admin/companies/:id/modules/:moduleId', () => {
    it('should grant module to company', async () => {
      if (!moduleId || !companyId) return;

      await request(app.getHttpServer())
        .post(`/admin/companies/${companyId}/modules/${moduleId}`)
        .set(...authHeader(adminToken))
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /company/modules', () => {
    it('should list company modules', async () => {
      const res = await request(app.getHttpServer())
        .get('/company/modules')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /company/employees/:id/permissions', () => {
    it('should grant employee permission', async () => {
      if (!employeeId || !moduleId) return;

      await request(app.getHttpServer())
        .post(`/company/employees/${employeeId}/permissions`)
        .set(...authHeader(ownerToken))
        .send({ moduleId })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });
});
