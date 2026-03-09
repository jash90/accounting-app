import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Documents CRUD E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let createdTemplateId: string;
  let createdDocumentId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdDocumentId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/documents/generated/${createdDocumentId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    if (createdTemplateId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/documents/templates/${createdTemplateId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('POST /modules/documents/templates', () => {
    it('should create a document template', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/documents/templates')
        .set(...authHeader(ownerToken))
        .send({
          name: `E2E Template ${Date.now()}`,
          templateContent: 'Hello {{clientName}}',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdTemplateId = res.body.id;
    });
  });

  describe('GET /modules/documents/templates', () => {
    it('should list templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/documents/templates')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /modules/documents/generated', () => {
    it('should generate a document from template', async () => {
      // First get a client ID from existing data
      const clientsRes = await request(app.getHttpServer())
        .get('/modules/clients')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const clientId = clientsRes.body.data?.[0]?.id;
      if (!clientId || !createdTemplateId) return;

      const res = await request(app.getHttpServer())
        .post('/modules/documents/generated')
        .set(...authHeader(ownerToken))
        .send({
          templateId: createdTemplateId,
          clientId,
          title: `E2E Generated Doc ${Date.now()}`,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdDocumentId = res.body.id;
    });
  });
});
