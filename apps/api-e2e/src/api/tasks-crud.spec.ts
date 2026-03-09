import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Tasks CRUD E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let createdTaskId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdTaskId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/tasks/${createdTaskId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('POST /modules/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({
          title: `E2E Task ${Date.now()}`,
          description: 'Created by E2E test',
          status: 'TODO',
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdTaskId = res.body.id;
    });

    it('should return validation error without title', async () => {
      await request(app.getHttpServer())
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ description: 'No title' })
        .expect(400);
    });
  });

  describe('GET /modules/tasks', () => {
    it('should list tasks with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/tasks')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('PATCH /modules/tasks/:id', () => {
    it('should update task status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/modules/tasks/${createdTaskId}`)
        .set(...authHeader(ownerToken))
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('DELETE /modules/tasks/:id', () => {
    it('should soft-delete task', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/tasks/${createdTaskId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      createdTaskId = undefined;
    });
  });
});
