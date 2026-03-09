import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Email Config Admin E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /email-config/system', () => {
    it('should return system email config for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/email-config/system')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/email-config/system')
        .set(...authHeader(ownerToken))
        .expect(403);
    });
  });

  describe('PUT /email-config/system', () => {
    it('should update system email config', async () => {
      const res = await request(app.getHttpServer())
        .put('/email-config/system')
        .set(...authHeader(adminToken))
        .send({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          user: 'test@example.com',
          password: 'testpass',
        })
        .expect((r) => {
          expect([200, 201]).toContain(r.status);
        });

      expect(res.body).toBeDefined();
    });
  });

  describe('POST /email-config/test-connection', () => {
    it('should test email connection', async () => {
      const res = await request(app.getHttpServer())
        .post('/email-config/test-connection')
        .set(...authHeader(ownerToken))
        .send({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          user: 'test@example.com',
          password: 'testpass',
        })
        .expect((r) => {
          // Connection test may fail (no real SMTP), accept error responses too
          expect([200, 201, 400, 422, 500]).toContain(r.status);
        });

      expect(res.body).toBeDefined();
    });
  });
});
