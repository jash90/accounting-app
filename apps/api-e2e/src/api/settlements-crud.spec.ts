import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Settlements CRUD E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let settlementId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /modules/settlements/initialize', () => {
    it('should initialize settlements for a month', async () => {
      const now = new Date();
      const res = await request(app.getHttpServer())
        .post('/modules/settlements/initialize')
        .set(...authHeader(ownerToken))
        .send({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        })
        .expect(201);

      expect(res.body).toBeDefined();
      if (Array.isArray(res.body) && res.body.length > 0) {
        settlementId = res.body[0].id;
      } else if (res.body.id) {
        settlementId = res.body.id;
      }
    });
  });

  describe('GET /modules/settlements', () => {
    it('should list settlements for month', async () => {
      const now = new Date();
      const res = await request(app.getHttpServer())
        .get('/modules/settlements')
        .set(...authHeader(ownerToken))
        .query({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        })
        .expect(200);

      expect(res.body.data).toBeDefined();

      // Pick a settlement ID for further tests if we don't have one
      if (!settlementId && res.body.data?.length > 0) {
        settlementId = res.body.data[0].id;
      }
    });
  });

  describe('GET /modules/settlements/:id', () => {
    it('should get settlement detail', async () => {
      if (!settlementId) return;

      const res = await request(app.getHttpServer())
        .get(`/modules/settlements/${settlementId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toHaveProperty('id', settlementId);
    });
  });

  describe('PATCH /modules/settlements/:id/status', () => {
    it('should update settlement status', async () => {
      if (!settlementId) return;

      const res = await request(app.getHttpServer())
        .patch(`/modules/settlements/${settlementId}/status`)
        .set(...authHeader(ownerToken))
        .send({ status: 'DOCUMENTS_RECEIVED' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });
});
