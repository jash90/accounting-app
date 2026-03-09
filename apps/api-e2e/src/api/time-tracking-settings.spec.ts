import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Time Tracking Settings E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let clientId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');

    // Get a client for by-client report test
    const clientRes = await request(app.getHttpServer())
      .get('/modules/clients')
      .set(...authHeader(ownerToken))
      .query({ page: 1, limit: 1 })
      .expect(200);
    if (clientRes.body.data?.length > 0) {
      clientId = clientRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /modules/time-tracking/settings', () => {
    it('should return time tracking settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/time-tracking/settings')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /modules/time-tracking/settings', () => {
    it('should update time tracking settings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/modules/time-tracking/settings')
        .set(...authHeader(ownerToken))
        .send({ defaultDuration: 3600 })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /modules/time-tracking/reports/by-client/:clientId', () => {
    it('should return report by client', async () => {
      if (!clientId) return;

      const res = await request(app.getHttpServer())
        .get(`/modules/time-tracking/reports/by-client/${clientId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
