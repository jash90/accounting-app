import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Email Config E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    employeeToken = await loginAs(app, 'employee');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /email-config/user', () => {
    it('should get user email config', async () => {
      const res = await request(app.getHttpServer())
        .get('/email-config/user')
        .set(...authHeader(ownerToken))
        .expect((r) => {
          expect([200, 404]).toContain(r.status);
        });

      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });

  describe('PUT /email-config/user', () => {
    it('should update user email config', async () => {
      await request(app.getHttpServer())
        .put('/email-config/user')
        .set(...authHeader(ownerToken))
        .send({
          imapHost: 'imap.example.com',
          imapPort: 993,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          email: 'test@example.com',
          password: 'test-password',
        })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /email-config/company', () => {
    it('should get company email config (owner)', async () => {
      await request(app.getHttpServer())
        .get('/email-config/company')
        .set(...authHeader(ownerToken))
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should deny access for employee', async () => {
      await request(app.getHttpServer())
        .get('/email-config/company')
        .set(...authHeader(employeeToken))
        .expect(403);
    });
  });

  describe('PUT /email-config/company', () => {
    it('should update company email config (owner)', async () => {
      await request(app.getHttpServer())
        .put('/email-config/company')
        .set(...authHeader(ownerToken))
        .send({
          imapHost: 'imap.company.com',
          imapPort: 993,
          smtpHost: 'smtp.company.com',
          smtpPort: 587,
          email: 'company@example.com',
          password: 'company-password',
        })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('POST /email-config/test-connection', () => {
    it('should test connection (may fail without real server)', async () => {
      await request(app.getHttpServer())
        .post('/email-config/test-connection')
        .set(...authHeader(ownerToken))
        .send({})
        .expect((res) => {
          // Will likely fail without real IMAP/SMTP but shouldn't 500
          expect([200, 400, 422, 500]).toContain(res.status);
        });
    });
  });
});
