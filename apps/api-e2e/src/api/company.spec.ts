import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Company E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  let createdEmployeeId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    employeeToken = await loginAs(app, 'employee');
  });

  afterAll(async () => {
    if (createdEmployeeId) {
      try {
        await request(app.getHttpServer())
          .delete(`/company/employees/${createdEmployeeId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('GET /company/profile', () => {
    it('should return company profile for owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/company/profile')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
    });

    it('should return company profile for employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/company/profile')
        .set(...authHeader(employeeToken))
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('PATCH /company/profile', () => {
    it('should update company profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/company/profile')
        .set(...authHeader(ownerToken))
        .send({ phone: '+48 123 456 789' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /company/employees', () => {
    it('should list employees', async () => {
      const res = await request(app.getHttpServer())
        .get('/company/employees')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /company/employees', () => {
    it('should create employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/company/employees')
        .set(...authHeader(ownerToken))
        .send({
          email: `e2e-employee-${Date.now()}@example.com`,
          password: 'TestPass123!',
          firstName: 'E2E',
          lastName: 'Employee',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdEmployeeId = res.body.id;
    });
  });
});
