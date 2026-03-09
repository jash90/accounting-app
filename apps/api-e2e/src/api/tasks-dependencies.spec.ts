import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Tasks Dependencies E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let taskAId: string;
  let taskBId: string;
  let dependencyId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ title: `E2E DepA ${Date.now()}`, status: 'TODO', priority: 'MEDIUM' }),
      request(app.getHttpServer())
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ title: `E2E DepB ${Date.now()}`, status: 'TODO', priority: 'MEDIUM' }),
    ]);
    taskAId = resA.body.id;
    taskBId = resB.body.id;
  });

  afterAll(async () => {
    try {
      for (const id of [taskAId, taskBId].filter(Boolean)) {
        await request(app.getHttpServer())
          .delete(`/modules/tasks/${id}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('POST /modules/tasks/:id/dependencies', () => {
    it('should add a dependency', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/tasks/${taskAId}/dependencies`)
        .set(...authHeader(ownerToken))
        .send({ dependsOnTaskId: taskBId })
        .expect(201);

      expect(res.body).toBeDefined();
      dependencyId = res.body.id ?? res.body.dependsOnTaskId;
    });
  });

  describe('GET /modules/tasks/:id/dependencies', () => {
    it('should list dependencies', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules/tasks/${taskAId}/dependencies`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('DELETE /modules/tasks/:id/dependencies/:depId', () => {
    it('should remove dependency', async () => {
      if (!dependencyId) return;

      await request(app.getHttpServer())
        .delete(`/modules/tasks/${taskAId}/dependencies/${dependencyId}`)
        .set(...authHeader(ownerToken))
        .expect((r) => {
          expect([200, 204]).toContain(r.status);
        });

      dependencyId = undefined;
    });
  });

  describe('POST /modules/tasks/reorder', () => {
    it('should reorder tasks', async () => {
      await request(app.getHttpServer())
        .post('/modules/tasks/reorder')
        .set(...authHeader(ownerToken))
        .send({ taskIds: [taskBId, taskAId] })
        .expect((r) => {
          expect([200, 201, 204]).toContain(r.status);
        });
    });
  });
});
