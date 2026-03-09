import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let notificationId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /notifications', () => {
    it('should list notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body).toBeDefined();
      // Grab a notification ID for further tests
      const data = res.body.data ?? res.body;
      if (Array.isArray(data) && data.length > 0) {
        notificationId = data[0].id;
      }
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set(...authHeader(ownerToken))
        .expect(200);
    });
  });

  describe('PATCH /notifications/:id/unread', () => {
    it('should mark notification as unread', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/unread`)
        .set(...authHeader(ownerToken))
        .expect(200);
    });
  });

  describe('PATCH /notifications/mark-multiple-read', () => {
    it('should mark multiple as read', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .patch('/notifications/mark-multiple-read')
        .set(...authHeader(ownerToken))
        .send({ ids: [notificationId] })
        .expect(200);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete notification', async () => {
      if (!notificationId) return;

      await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set(...authHeader(ownerToken))
        .expect(200);
    });
  });
});
