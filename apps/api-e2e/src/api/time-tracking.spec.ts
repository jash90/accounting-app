import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Time Tracking E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  let entryId: string;
  let clientId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    employeeToken = await loginAs(app, 'employee');

    // Get a client for time entries
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
    try {
      if (entryId) {
        await request(app.getHttpServer())
          .delete(`/modules/time-tracking/entries/${entryId}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('POST /modules/time-tracking/entries', () => {
    it('should create a time entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/time-tracking/entries')
        .set(...authHeader(ownerToken))
        .send({
          description: `E2E entry ${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          duration: 3600,
          ...(clientId ? { clientId } : {}),
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      entryId = res.body.id;
    });
  });

  describe('GET /modules/time-tracking/entries', () => {
    it('should list entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/time-tracking/entries')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('PATCH /modules/time-tracking/entries/:id', () => {
    it('should update entry', async () => {
      if (!entryId) return;

      const res = await request(app.getHttpServer())
        .patch(`/modules/time-tracking/entries/${entryId}`)
        .set(...authHeader(ownerToken))
        .send({ description: 'Updated E2E entry' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('Timer', () => {
    it('should start timer', async () => {
      await request(app.getHttpServer())
        .post('/modules/time-tracking/entries/timer/start')
        .set(...authHeader(employeeToken))
        .send({ description: 'Timer test' })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });

    it('should stop timer', async () => {
      await request(app.getHttpServer())
        .post('/modules/time-tracking/entries/timer/stop')
        .set(...authHeader(employeeToken))
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /modules/time-tracking/reports', () => {
    it('should return reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/time-tracking/reports')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('DELETE /modules/time-tracking/entries/:id', () => {
    it('should delete entry', async () => {
      if (!entryId) return;

      await request(app.getHttpServer())
        .delete(`/modules/time-tracking/entries/${entryId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      entryId = undefined;
    });
  });
});
