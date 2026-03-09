import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Settlements Stats E2E', () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /modules/settlements/statistics/extended', () => {
    it('should return extended settlement statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/settlements/statistics/extended')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /modules/settlements/settings', () => {
    it('should return settlement settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/settlements/settings')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /modules/settlements/settings', () => {
    it('should update settlement settings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/modules/settlements/settings')
        .set(...authHeader(ownerToken))
        .send({ autoInitialize: false })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
