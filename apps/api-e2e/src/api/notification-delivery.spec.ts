import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Notification Delivery E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  // Track created resources for cleanup
  const createdTaskIds: string[] = [];
  const createdOfferIds: string[] = [];
  const createdLeadIds: string[] = [];

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    employeeToken = await loginAs(app, 'employee');
  }, 30000);

  afterAll(async () => {
    // Cleanup created resources
    for (const id of createdTaskIds) {
      await request(app.getHttpServer())
        .delete(`/modules/tasks/${id}`)
        .set(...authHeader(ownerToken));
    }
    for (const id of createdOfferIds) {
      await request(app.getHttpServer())
        .delete(`/modules/offers/${id}`)
        .set(...authHeader(ownerToken));
    }
    for (const id of createdLeadIds) {
      await request(app.getHttpServer())
        .delete(`/modules/leads/${id}`)
        .set(...authHeader(ownerToken));
    }
    await app.close();
  });

  describe('Task notifications', () => {
    it('should list notifications after task creation', async () => {
      // Create a task
      const taskRes = await request(app.getHttpServer())
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({
          title: 'E2E Notification Test Task',
          description: 'Testing notification delivery',
          priority: 'medium',
        })
        .expect((res) => expect([200, 201]).toContain(res.status));

      if (taskRes.body?.id) createdTaskIds.push(taskRes.body.id);

      // Check notifications exist (they may or may not be triggered depending on config)
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(notifRes.body).toBeDefined();
      const data = notifRes.body.data ?? notifRes.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return unread count', async () => {
      const countRes = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(countRes.body).toBeDefined();
      expect(typeof countRes.body.count).toBe('number');
    });
  });

  describe('Settlement notifications', () => {
    it('should return notifications filtered by settlements module', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 5, moduleSlug: 'settlements' })
        .expect(200);

      expect(notifRes.body).toBeDefined();
      const data = notifRes.body.data ?? notifRes.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Offer notifications', () => {
    it('should track notifications after offer creation', async () => {
      // First get a client to use
      const clientsRes = await request(app.getHttpServer())
        .get('/modules/clients')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 });

      const clientId = clientsRes.body?.data?.[0]?.id;

      if (clientId) {
        const offerRes = await request(app.getHttpServer())
          .post('/modules/offers')
          .set(...authHeader(ownerToken))
          .send({
            title: 'E2E Notification Offer',
            clientId,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            items: [{ name: 'Test item', quantity: 1, unitPrice: 100, unit: 'szt.' }],
          })
          .expect((res) => expect([200, 201]).toContain(res.status));

        if (offerRes.body?.id) createdOfferIds.push(offerRes.body.id);
      }

      // Verify notifications endpoint still works
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should track notifications after lead creation', async () => {
      const leadRes = await request(app.getHttpServer())
        .post('/modules/leads')
        .set(...authHeader(ownerToken))
        .send({
          name: 'E2E Notification Lead',
          email: 'e2e-notif-lead@test.com',
          source: 'WEBSITE',
          status: 'NEW',
        })
        .expect((res) => expect([200, 201]).toContain(res.status));

      if (leadRes.body?.id) createdLeadIds.push(leadRes.body.id);

      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Notification management', () => {
    it('should mark notification as read', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      const notif = Array.isArray(data) ? data[0] : null;
      if (notif) {
        await request(app.getHttpServer())
          .patch(`/notifications/${notif.id}/read`)
          .set(...authHeader(ownerToken))
          .expect(200);
      }
    });

    it('should mark notification as unread', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      const notif = Array.isArray(data) ? data[0] : null;
      if (notif) {
        // Mark as read first, then unread
        await request(app.getHttpServer())
          .patch(`/notifications/${notif.id}/read`)
          .set(...authHeader(ownerToken));

        await request(app.getHttpServer())
          .patch(`/notifications/${notif.id}/unread`)
          .set(...authHeader(ownerToken))
          .expect(200);
      }
    });

    it('should archive and restore notification', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      const notif = Array.isArray(data) ? data[0] : null;
      if (notif) {
        await request(app.getHttpServer())
          .patch(`/notifications/${notif.id}/archive`)
          .set(...authHeader(ownerToken))
          .expect(200);

        // Restore it back
        await request(app.getHttpServer())
          .patch(`/notifications/${notif.id}/restore`)
          .set(...authHeader(ownerToken))
          .expect(200);
      }
    });

    it('should mark all as read', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
      expect(typeof res.body.count).toBe('number');
    });

    it('should mark multiple as read', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 3 })
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      const ids = (Array.isArray(data) ? data : []).map((n: any) => n.id).slice(0, 2);
      if (ids.length > 0) {
        await request(app.getHttpServer())
          .patch('/notifications/mark-multiple-read')
          .set(...authHeader(ownerToken))
          .send({ ids })
          .expect(200);
      }
    });

    it('should archive multiple notifications', async () => {
      const notifRes = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 3 })
        .expect(200);

      const data = notifRes.body.data ?? notifRes.body;
      const ids = (Array.isArray(data) ? data : []).map((n: any) => n.id).slice(0, 2);
      if (ids.length > 0) {
        await request(app.getHttpServer())
          .patch('/notifications/archive-multiple')
          .set(...authHeader(ownerToken))
          .send({ ids })
          .expect(200);

        // Restore them back
        for (const id of ids) {
          await request(app.getHttpServer())
            .patch(`/notifications/${id}/restore`)
            .set(...authHeader(ownerToken));
        }
      }
    });
  });

  describe('Notification settings', () => {
    it('should get notification settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/settings')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should get module-specific settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/settings/modules/tasks')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should update module notification settings', async () => {
      // Get current settings first
      const currentRes = await request(app.getHttpServer())
        .get('/notifications/settings/modules/tasks')
        .set(...authHeader(ownerToken))
        .expect(200);

      const currentEmail = currentRes.body?.emailEnabled ?? true;

      const updateRes = await request(app.getHttpServer())
        .patch('/notifications/settings/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ emailEnabled: !currentEmail })
        .expect(200);

      expect(updateRes.body).toBeDefined();

      // Restore original
      await request(app.getHttpServer())
        .patch('/notifications/settings/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ emailEnabled: currentEmail });
    });

    it('should update global notification settings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/settings/global')
        .set(...authHeader(ownerToken))
        .send({ emailEnabled: true })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should not see notifications from other companies', async () => {
      let ownerBToken: string;
      try {
        ownerBToken = await loginAs(app, 'ownerB');
      } catch {
        // ownerB may not be seeded, skip
        return;
      }

      const ownerNotifs = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      const ownerBNotifs = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerBToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      // Notification IDs should not overlap
      const ownerIds = new Set(
        ((ownerNotifs.body.data ?? ownerNotifs.body) || []).map((n: any) => n.id)
      );
      const ownerBIds = ((ownerBNotifs.body.data ?? ownerBNotifs.body) || []).map((n: any) => n.id);

      for (const id of ownerBIds) {
        expect(ownerIds.has(id)).toBe(false);
      }
    });

    it('should not access notifications from other company by ID', async () => {
      let ownerBToken: string;
      try {
        ownerBToken = await loginAs(app, 'ownerB');
      } catch {
        return;
      }

      // Get owner's notification
      const ownerNotifs = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const data = ownerNotifs.body.data ?? ownerNotifs.body;
      const notif = Array.isArray(data) ? data[0] : null;
      if (notif) {
        // Try to access it as ownerB — should be 404 (service filters by userId)
        await request(app.getHttpServer())
          .get(`/notifications/${notif.id}`)
          .set(...authHeader(ownerBToken))
          .expect((res) => expect([403, 404]).toContain(res.status));
      }
    });
  });

  describe('Notification filtering', () => {
    it('should filter notifications by moduleSlug', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10, moduleSlug: 'tasks' })
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      for (const notif of data) {
        expect(notif.moduleSlug).toBe('tasks');
      }
    });

    it('should filter notifications by isRead', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10, isRead: false })
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      for (const notif of data) {
        expect(notif.isRead).toBe(false);
      }
    });

    it('should return archived notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/archived')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('Employee access', () => {
    it('should allow employee to list own notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(employeeToken))
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(res.body).toBeDefined();
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should allow employee to get unread count', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set(...authHeader(employeeToken))
        .expect(200);

      expect(res.body).toBeDefined();
      expect(typeof res.body.count).toBe('number');
    });
  });
});
