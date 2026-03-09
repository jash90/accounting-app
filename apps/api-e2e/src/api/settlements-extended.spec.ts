import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Settlements Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let _employeeToken: string;
  let settlementId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    _employeeToken = await loginAs(app, 'employee');

    // Initialize current month and get a settlement
    const now = new Date();
    await request(app.getHttpServer())
      .post('/modules/settlements/initialize')
      .set(...authHeader(ownerToken))
      .send({ year: now.getFullYear(), month: now.getMonth() + 1 });

    const listRes = await request(app.getHttpServer())
      .get('/modules/settlements')
      .set(...authHeader(ownerToken))
      .query({ year: now.getFullYear(), month: now.getMonth() + 1 })
      .expect(200);

    if (listRes.body.data?.length > 0) {
      settlementId = listRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /modules/settlements/:id/assign', () => {
    it('should assign user to settlement', async () => {
      if (!settlementId) return;

      await request(app.getHttpServer())
        .post(`/modules/settlements/${settlementId}/assign`)
        .set(...authHeader(ownerToken))
        .send({})
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('POST /modules/settlements/bulk-assign', () => {
    it('should bulk assign settlements', async () => {
      if (!settlementId) return;

      await request(app.getHttpServer())
        .post('/modules/settlements/bulk-assign')
        .set(...authHeader(ownerToken))
        .send({ settlementIds: [settlementId] })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('Comments', () => {
    it('should add comment to settlement', async () => {
      if (!settlementId) return;

      const res = await request(app.getHttpServer())
        .post(`/modules/settlements/${settlementId}/comments`)
        .set(...authHeader(ownerToken))
        .send({ content: 'E2E settlement comment' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should list settlement comments', async () => {
      if (!settlementId) return;

      const res = await request(app.getHttpServer())
        .get(`/modules/settlements/${settlementId}/comments`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /modules/settlements/statistics/extended', () => {
    it('should return extended stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/settlements/statistics/extended')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
