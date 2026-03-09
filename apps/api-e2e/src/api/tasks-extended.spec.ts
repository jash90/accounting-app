import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Tasks Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let _employeeToken: string;
  let taskId: string;
  let labelId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
    _employeeToken = await loginAs(app, 'employee');

    const res = await request(app.getHttpServer())
      .post('/modules/tasks')
      .set(...authHeader(ownerToken))
      .send({ title: `E2E Extended ${Date.now()}`, status: 'TODO', priority: 'MEDIUM' })
      .expect(201);
    taskId = res.body.id;
  });

  afterAll(async () => {
    try {
      if (labelId) {
        await request(app.getHttpServer())
          .delete(`/modules/tasks/labels/${labelId}`)
          .set(...authHeader(ownerToken));
      }
      if (taskId) {
        await request(app.getHttpServer())
          .delete(`/modules/tasks/${taskId}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('GET /modules/tasks (kanban)', () => {
    it('should return tasks in kanban view', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/tasks')
        .set(...authHeader(ownerToken))
        .query({ view: 'kanban' })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('Labels CRUD', () => {
    it('should create a label', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/tasks/labels')
        .set(...authHeader(ownerToken))
        .send({ name: `Label ${Date.now()}`, color: '#FF0000' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      labelId = res.body.id;
    });

    it('should list labels', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/tasks/labels')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Comments', () => {
    it('should add a comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/tasks/${taskId}/comments`)
        .set(...authHeader(ownerToken))
        .send({ content: 'E2E test comment' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should list comments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules/tasks/${taskId}/comments`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /modules/tasks/statistics/extended', () => {
    it('should return extended stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/tasks/statistics/extended')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
