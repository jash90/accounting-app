import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('AI Agent Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    adminToken = await loginAs(app, 'admin');
    employeeToken = await loginAs(app, 'employee');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /modules/ai-agent/config', () => {
    it('should get AI config', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/config')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /modules/ai-agent/config', () => {
    it('should update AI config (admin)', async () => {
      await request(app.getHttpServer())
        .patch('/modules/ai-agent/config')
        .set(...authHeader(adminToken))
        .send({ enabled: true })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });

    it('should deny update for employee', async () => {
      await request(app.getHttpServer())
        .patch('/modules/ai-agent/config')
        .set(...authHeader(employeeToken))
        .send({ enabled: false })
        .expect(403);
    });
  });

  describe('GET /modules/ai-agent/token-usage', () => {
    it('should return token usage', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/token-usage')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('POST /modules/ai-agent/context', () => {
    it('should deny context upload for non-admin', async () => {
      await request(app.getHttpServer())
        .post('/modules/ai-agent/context')
        .set(...authHeader(employeeToken))
        .send({ content: 'test context' })
        .expect(403);
    });
  });
});
