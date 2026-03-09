import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Notifications Settings E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let notificationId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');

    // Find an existing notification for delete test
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(ownerToken))
      .query({ page: 1, limit: 1 })
      .expect(200);
    if (res.body.data?.length > 0) {
      notificationId = res.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete a notification', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set(...authHeader(ownerToken))
        .expect((r) => {
          expect([200, 204]).toContain(r.status);
        });
    });
  });

  describe('GET /notifications/settings', () => {
    it('should return notification settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/settings')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /notifications/settings', () => {
    it('should update notification settings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/settings')
        .set(...authHeader(ownerToken))
        .send({ emailEnabled: true })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
